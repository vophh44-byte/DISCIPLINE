export function indiaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  return part("year") + "-" + part("month") + "-" + part("day");
}

export async function validatePortalAccountPreflight({
  adminClient,
  email,
  displayName,
  role,
  studentId,
  routeName,
  vehicleLabel,
  rawDriverStudentIds = [],
  today = indiaToday(),
}) {
  const checks = [];
  const blockers = [];
  let resumeAuthUserId = null;
  const addCheck = (label, ok, passDetail, failDetail) => {
    checks.push({ label, status: ok ? "ok" : "blocked", detail: ok ? passDetail : failDetail });
    if (!ok) blockers.push(failDetail);
  };
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
  const validName = displayName.length >= 1 && displayName.length <= 100;
  const validRole = role === "parent" || role === "driver";
  addCheck("Email address", validEmail, "The email format is valid.", "Enter a valid email address (254 characters or fewer).");
  addCheck("Name", validName, "A name has been provided.", "Enter a name (100 characters or fewer).");
  addCheck("Portal type", validRole, "A supported portal type is selected.", "Choose Parent or Driver.");
  if (!validEmail || !validName || !validRole) return { ready: false, checks, blockers, resumeAuthUserId };

  const emailPattern = email.replace(/[\\%_]/g, "\\$&");
  const { data: matchingProfiles, error: profileLookupError } = await adminClient
    .from("profiles").select("user_id,role,is_active")
    .ilike("email", emailPattern).limit(2);
  if (profileLookupError) {
    addCheck("Existing account", false, "", "Could not check existing portal accounts. Refresh and try again.");
  } else if ((matchingProfiles || []).length > 1) {
    addCheck("Existing account", false, "", "More than one portal profile uses this email. Ask an administrator to review the duplicate profiles.");
  } else if ((matchingProfiles || []).length === 1) {
    const existing = matchingProfiles[0];
    addCheck("Existing account", existing.role === role && existing.is_active === true,
      "An active account of the selected portal type already exists and can be linked.",
      existing.role !== role
        ? "This email already has a " + existing.role + " account. An account role cannot be changed here."
        : "This portal account is inactive. Ask the administrator to review it.");
  } else {
    let matchingAuthUser = null;
    let authLookupComplete = false;
    let authLookupFailed = false;
    for (let page = 1; page <= 10; page++) {
      const { data: authPage, error: authPageError } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
      if (authPageError || !authPage) {
        authLookupFailed = true;
        break;
      }
      matchingAuthUser = authPage.users.find((user) => (user.email || "").toLowerCase() === email) || null;
      if (matchingAuthUser) {
        authLookupComplete = true;
        break;
      }
      if (authPage.users.length < 1000) {
        authLookupComplete = true;
        break;
      }
    }
    if (matchingAuthUser?.invited_at) {
      resumeAuthUserId = matchingAuthUser.id;
      addCheck("Existing invitation", true,
        "A previous invitation exists without a portal profile. Setup can resume without sending another email.", "");
    } else if (matchingAuthUser) {
      addCheck("Existing account", false, "",
        "A sign-in record exists but was not created through an invitation. Ask an administrator to review it before linking.");
    } else if (!authLookupComplete || authLookupFailed) {
      addCheck("Existing account", false, "", "Could not verify the complete sign-in directory. Ask an administrator to review this email before inviting.");
    } else {
      addCheck("Existing account", true, "No existing portal or sign-in account uses this email.", "");
    }
  }

  const existingProfile = (matchingProfiles || []).length === 1 ? matchingProfiles[0] : null;
  const existingUserId = existingProfile && existingProfile.role === role && existingProfile.is_active === true
    ? existingProfile.user_id : null;

  if (role === "driver") {
    const driverStudentIds = rawDriverStudentIds.filter((id) =>
      typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    );
    const uniqueStudentIds = new Set(driverStudentIds);
    const selectionValid = rawDriverStudentIds.length > 0 &&
      rawDriverStudentIds.length === driverStudentIds.length &&
      uniqueStudentIds.size === rawDriverStudentIds.length;
    addCheck("Driver roster selection", selectionValid,
      "At least one valid, unique student is selected.",
      "Select at least one student. Remove invalid or duplicate selections.");
    const routeNameValid = routeName.length >= 2 && routeName.length <= 100;
    addCheck("Route name", routeNameValid, "The route name is valid.", "Enter a route name between 2 and 100 characters.");
    const vehicleValid = vehicleLabel.length <= 80;
    addCheck("Vehicle label", vehicleValid, "The optional vehicle label is valid.", "The vehicle label must be 80 characters or fewer.");

    if (selectionValid) {
      const { data: routeStudents, error: routeStudentsError } = await adminClient
        .from("students").select("id,is_active").in("id", driverStudentIds);
      const allStudentsActive = !routeStudentsError && !!routeStudents &&
        routeStudents.length === driverStudentIds.length &&
        routeStudents.every((student) => student.is_active === true);
      addCheck("Selected students", allStudentsActive,
        "Every selected student profile is active.",
        "One or more selected students do not exist or are archived.");
      if (allStudentsActive) {
        const { data: assignments, error: assignmentsError } = await adminClient
          .from("driver_route_students").select("student_id,route_id")
          .in("student_id", driverStudentIds).lte("valid_from", today)
          .or("valid_to.is.null,valid_to.gte." + today);
        if (assignmentsError) {
          addCheck("Driver assignment conflicts", false, "", "Could not check current driver assignments. Refresh and try again.");
        } else {
          const routeIds = [...new Set((assignments || []).map((item) => item.route_id))];
          let activeRoutes = [];
          let routesError = null;
          if (routeIds.length) {
            const routeResult = await adminClient.from("driver_routes")
              .select("id,driver_user_id,is_active").in("id", routeIds).eq("is_active", true);
            activeRoutes = routeResult.data || [];
            routesError = routeResult.error;
          }
          if (routesError) {
            addCheck("Driver assignment conflicts", false, "", "Could not verify active driver routes. Refresh and try again.");
          } else {
            const activeRouteMap = new Map(activeRoutes.map((route) => [route.id, route]));
            const conflict = (assignments || []).some((assignment) => {
              const route = activeRouteMap.get(assignment.route_id);
              return !!route && route.driver_user_id !== existingUserId;
            });
            addCheck("Driver assignment conflicts", !conflict,
              "No selected student is currently assigned to another active driver route.",
              "One or more selected students already have an active assignment with another driver. Review Drivers & Routes first.");
          }
        }
      }
    }
  } else {
    const validStudentId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(studentId);
    addCheck("Student selection", validStudentId, "A student profile is selected.", "Choose a valid student profile.");
    if (validStudentId) {
      const { data: student, error: studentError } = await adminClient
        .from("students").select("id,is_active").eq("id", studentId).maybeSingle();
      const activeStudent = !studentError && !!student && student.is_active === true;
      addCheck("Student profile", activeStudent, "The selected student profile is active.", "The selected student does not exist or is archived.");

    }
  }
  return { ready: blockers.length === 0, checks, blockers, resumeAuthUserId };
}
