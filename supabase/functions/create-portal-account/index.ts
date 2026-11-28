import { createClient } from "npm:@supabase/supabase-js@2";
import { validatePortalAccountPreflight } from "./portal-account-preflight.mjs";

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const localDevelopmentOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const allowedOrigin = origin === "https://vophh44-byte.github.io" || localDevelopmentOrigin
    ? origin
    : "https://vophh44-byte.github.io";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function reply(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req);
  const respond = (body: unknown, status = 200) => reply(body, status, headers);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    return respond({ error: "Server configuration is incomplete." }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return respond({ error: "Sign-in required." }, 401);

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return respond({ error: "Your session is invalid. Please sign in again." }, 401);
  }

  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: caller, error: callerError } = await adminClient
    .from("profiles").select("role,is_active")
    .eq("user_id", authData.user.id).maybeSingle();
  if (callerError || !caller || caller.role !== "admin" || caller.is_active !== true) {
    return respond({ error: "Administrator permission required." }, 403);
  }

  let input: { action?: string; email?: string; display_name?: string; role?: string; student_id?: string; route_name?: string; vehicle_label?: string; student_ids?: string[]; request_id?: string; status?: string };
  try { input = await req.json(); }
  catch { return respond({ error: "Invalid request body." }, 400); }

  // Public self-registration creates requests only. This administrator-only branch
  // lets the existing Portal Accounts workflow review and fulfil those requests.
  if (input.action === "list_signup_requests") {
    const { data: requests, error } = await adminClient
      .from("portal_signup_requests")
      .select("id,display_name,email,role,phone,status,created_at,reviewed_at")
      .in("status", ["pending", "reviewed"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return respond({ error: "Could not load parent and driver registration requests." }, 502);
    return respond({ success: true, requests: requests || [] }, 200);
  }

  if (input.action === "update_signup_request") {
    const requestId = (input.request_id || "").trim();
    const status = input.status;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      return respond({ error: "Choose a valid registration request." }, 400);
    }
    if (!["reviewed", "declined", "fulfilled"].includes(status || "")) {
      return respond({ error: "Choose a valid registration request status." }, 400);
    }
    const now = new Date().toISOString();
    const { data: updated, error } = await adminClient
      .from("portal_signup_requests")
      .update({ status, reviewed_at: now, reviewed_by: authData.user.id, updated_at: now })
      .eq("id", requestId)
      .in("status", ["pending", "reviewed"])
      .select("id,status")
      .maybeSingle();
    if (error) return respond({ error: "Could not update the registration request." }, 502);
    if (!updated) return respond({ error: "This request is no longer open. Refresh the registration request list." }, 409);
    return respond({ success: true, request: updated }, 200);
  }

  // Expose only the small Auth timestamps needed by the administrator account directory.
  // This branch is available only after the bearer token and active administrator role checks above.
  if (input.action === "list_auth_status") {
    const [{ data: authUsers, error: authUsersError }, { data: portalProfiles, error: portalProfilesError }] = await Promise.all([
      adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      adminClient.from("profiles").select("user_id").in("role", ["parent", "student", "driver"]),
    ]);
    if (authUsersError || !authUsers) {
      return respond({ error: "Could not load authentication setup timestamps." }, 502);
    }
    if (portalProfilesError || !portalProfiles) {
      return respond({ error: "Could not match portal account profiles." }, 502);
    }
    const portalUserIds = new Set(portalProfiles.map(profile => profile.user_id));
    const accounts = authUsers.users
      .filter(user => portalUserIds.has(user.id))
      .map(user => ({
        user_id: user.id,
        invited_at: user.invited_at || null,
        email_confirmed_at: user.email_confirmed_at || user.confirmed_at || null,
        last_sign_in_at: user.last_sign_in_at || null,
      }));
    return respond({ success: true, accounts }, 200);
  }

  const email = (input.email || "").trim().toLowerCase();
  const displayName = (input.display_name || "").trim();
  const role = input.role;
  const studentId = (input.student_id || "").trim();
  const routeName = (input.route_name || "").trim();
  const vehicleLabel = (input.vehicle_label || "").trim();
  const rawDriverStudentIds = Array.isArray(input.student_ids) ? input.student_ids : [];
  const driverStudentIds = rawDriverStudentIds.filter((id): id is string =>
    typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  );

  const validatePortalAccountReadiness = () => validatePortalAccountPreflight({
    adminClient, email, displayName, role, studentId, routeName, vehicleLabel, rawDriverStudentIds,
  });

  if (input.action === "preflight") {
    const readiness = await validatePortalAccountReadiness();
    return respond({ success: true, ready: readiness.ready, checks: readiness.checks }, 200);
  }


  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respond({ error: "Enter a valid email address." }, 400);
  }
  if (!displayName) return respond({ error: "Enter the person's name." }, 400);
  if (role !== "student" && role !== "parent" && role !== "driver") {
    return respond({ error: "Choose a valid portal account type." }, 400);
  }
  if (role === "driver") {
    if (routeName.length < 2) return respond({ error: "Enter a route name for the driver." }, 400);
    if (!driverStudentIds.length) return respond({ error: "Assign at least one student to this driver's route." }, 400);
    const { data: routeStudents, error: routeStudentsError } = await adminClient
      .from("students").select("id,is_active").in("id", driverStudentIds);
    if (routeStudentsError || !routeStudents || routeStudents.length !== driverStudentIds.length ||
        routeStudents.some((s: {is_active:boolean}) => s.is_active !== true)) {
      return respond({ error: "One or more selected students do not exist or are archived." }, 400);
    }
  } else {
    if (!studentId) return respond({ error: "Choose the student profile to link to this account." }, 400);
    const { data: student, error: studentError } = await adminClient
      .from("students").select("id,is_active")
      .eq("id", studentId).maybeSingle();
    if (studentError || !student || student.is_active !== true) {
      return respond({ error: "The selected student does not exist or is archived." }, 400);
    }
  }

  const readiness = await validatePortalAccountReadiness();
  if (!readiness.ready) {
    return respond({ error: readiness.blockers[0] || "Account setup is not ready. Review the checks and try again.", checks: readiness.checks }, 409);
  }

  async function linkAccount(userId: string) {
    if (role === "driver") {
      const { data: routeId, error: routeError } = await userClient.rpc("admin_save_driver_route", {
        p_driver_user_id: userId,
        p_route_name: routeName,
        p_vehicle_label: vehicleLabel || null,
        p_student_ids: driverStudentIds,
      });
      if (routeError || !routeId) {
        return { error: routeError?.message || "Could not save the driver's route.", status: routeError?.code === "42501" ? 403 : 400 };
      }
      return { error: null, status: 200 };
    }
    if (role === "student") {
      const { data: byStudent, error: studentLinkError } = await adminClient
        .from("student_accounts").select("student_id,user_id")
        .eq("student_id", studentId).maybeSingle();
      if (studentLinkError) return { error: studentLinkError.message, status: 500 };
      if (byStudent && byStudent.user_id !== userId) {
        return { error: "This student already has a different portal account. No account was changed.", status: 409 };
      }

      const { data: byUser, error: userLinkError } = await adminClient
        .from("student_accounts").select("student_id,user_id")
        .eq("user_id", userId).maybeSingle();
      if (userLinkError) return { error: userLinkError.message, status: 500 };
      if (byUser && byUser.student_id !== studentId) {
        return { error: "This student login is already linked to another student profile.", status: 409 };
      }

      if (!byStudent) {
        const { error } = await adminClient.from("student_accounts")
          .insert({ student_id: studentId, user_id: userId });
        if (error) return { error: "Could not link the student account: " + error.message, status: 500 };
      }
    } else {
      const { data: existing, error: lookupError } = await adminClient
        .from("parent_student_links").select("id")
        .eq("parent_user_id", userId).eq("student_id", studentId).maybeSingle();
      if (lookupError) return { error: lookupError.message, status: 500 };
      if (!existing) {
        const { error } = await adminClient.from("parent_student_links").insert({
          student_id: studentId,
          parent_user_id: userId,
          relationship_label: "Parent/Guardian",
        });
        if (error) return { error: "Could not link the parent account: " + error.message, status: 500 };
      }
    }
    return { error: null, status: 200 };
  }

  // Reuse an existing, active portal profile for this email instead of issuing
  // another invitation or attempting duplicate inserts.
  const { data: matchingProfiles, error: profileLookupError } = await adminClient
    .from("profiles").select("user_id,role,is_active")
    .ilike("email", email).limit(2);
  if (profileLookupError) return respond({ error: "Could not check existing portal accounts: " + profileLookupError.message }, 500);
  if ((matchingProfiles || []).length > 1) {
    return respond({ error: "More than one portal profile uses this email. Ask support to review the duplicate profiles before linking." }, 409);
  }

  if (matchingProfiles?.length === 1) {
    const existing = matchingProfiles[0];
    if (existing.role !== role) {
      return respond({ error: "This email already has a " + existing.role + " account. An account role cannot be changed from this screen." }, 409);
    }
    if (existing.is_active !== true) {
      return respond({ error: "This portal account is inactive. Ask the administrator to review it." }, 403);
    }
    const linked = await linkAccount(existing.user_id);
    if (linked.error) return respond({ error: linked.error }, linked.status);
    return respond({
      success: true, existing_account: true, role, email,
      message: "Existing portal account linked to the selected student. No new invitation was sent.",
    }, 200);
  }

  // Check student-slot conflicts before sending an invitation.
  if (role === "student") {
    const { data: assigned, error } = await adminClient
      .from("student_accounts").select("student_id").eq("student_id", studentId).maybeSingle();
    if (error) return respond({ error: "Could not check the student's existing portal link: " + error.message }, 500);
    if (assigned) {
      return respond({ error: "This student already has a portal account. Select that account's email or review the existing link." }, 409);
    }
  }

  const recoveredInvitation = !!readiness.resumeAuthUserId;
  let userId = readiness.resumeAuthUserId;
  if (!userId) {
    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: "https://vophh44-byte.github.io/DISCIPLINE/?setup=1",
      data: { display_name: displayName },
    });
    if (inviteError || !invited.user) {
      return respond({ error: inviteError?.message || "Could not send invitation." }, 400);
    }
    userId = invited.user.id;
  }
  // Ignore a raced duplicate rather than overwriting the existing profile role.
  const { error: profileError } = await adminClient.from("profiles").upsert({
    user_id: userId, role, display_name: displayName, email, is_active: true,
  }, { onConflict: "user_id", ignoreDuplicates: true });
  if (profileError) {
    return respond({
      error: "The invited sign-in account exists, but the portal profile could not be confirmed: " + profileError.message +
        ". Keep the account; retry from Portal Accounts to resume setup or ask for an administrator review.",
    }, 500);
  }

  const { data: confirmedProfile, error: confirmError } = await adminClient
    .from("profiles").select("user_id,role,is_active")
    .eq("user_id", userId).maybeSingle();
  if (confirmError || !confirmedProfile || confirmedProfile.role !== role || confirmedProfile.is_active !== true) {
    return respond({ error: "The invitation was sent, but its portal role could not be confirmed. Please ask an administrator to review this account." }, 500);
  }

  const linked = await linkAccount(userId);
  if (linked.error) {
    return respond({
      error: "The invitation and portal profile were created, but linking failed: " + linked.error +
        ". The account was kept safely; retry using the same email to finish linking.",
    }, linked.status);
  }

  return respond({
    success: true,
    existing_account: false,
    recovered_invitation: recoveredInvitation,
    role, email, display_name: displayName,
    message: recoveredInvitation
      ? "The previous invitation was recovered and the portal link is complete. No second email was sent."
      : "Invitation sent. The user must open the email and set a password.",
  }, recoveredInvitation ? 200 : 201);
});
