import { createClient } from "npm:@supabase/supabase-js@2";

const genericMessage = "Your request has been received. The DISCIPLINE administrator will review it. This request does not activate portal access.";

function allowedOrigin(origin: string) {
  return origin === "https://vophh44-byte.github.io" ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(origin) ? origin : "https://vophh44-byte.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function respond(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") || "";
  const headers = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (!allowedOrigin(origin)) return respond({ error: "This registration page is not allowed to submit requests." }, 403, headers);
  if (req.method !== "POST") return respond({ error: "Method not allowed." }, 405, headers);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return respond({ error: "Registration service is not configured." }, 500, headers);

  let input: {
    display_name?: string;
    email?: string;
    role?: string;
    phone?: string;
    website?: string;
  };
  try {
    input = await req.json();
  } catch {
    return respond({ error: "Invalid request body." }, 400, headers);
  }

  // Quietly accept honeypot submissions without storing them or revealing the trap.
  if ((input.website || "").trim()) return respond({ success: true, message: genericMessage }, 200, headers);

  const displayName = (input.display_name || "").trim();
  const email = (input.email || "").trim().toLowerCase();
  const role = input.role;
  const phone = (input.phone || "").trim();
  if (displayName.length < 2 || displayName.length > 100) {
    return respond({ error: "Enter a name between 2 and 100 characters." }, 400, headers);
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respond({ error: "Enter a valid email address." }, 400, headers);
  }
  if (role !== "parent" && role !== "driver") {
    return respond({ error: "Choose Parent / Guardian or Driver." }, 400, headers);
  }
  if (phone.length > 30 || (phone && !/^[+()\-\.\s\d]{7,30}$/.test(phone))) {
    return respond({ error: "Enter a valid phone number or leave it blank." }, 400, headers);
  }

  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Avoid duplicate requests and avoid disclosing whether an account already exists.
  const { data: existingProfile, error: profileError } = await adminClient
    .from("profiles").select("user_id").eq("email", email).limit(1).maybeSingle();
  if (profileError) return respond({ error: "The registration service could not verify this request. Please try again later." }, 500, headers);
  if (existingProfile) return respond({ success: true, message: genericMessage }, 200, headers);

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentRequest, error: recentError } = await adminClient
    .from("portal_signup_requests").select("id")
    .eq("email", email).gte("created_at", cutoff).limit(1).maybeSingle();
  if (recentError) return respond({ error: "The registration service is temporarily unavailable. Please try again later." }, 500, headers);
  if (recentRequest) return respond({ success: true, message: genericMessage }, 200, headers);

  const { error: insertError } = await adminClient.from("portal_signup_requests").insert({
    display_name: displayName,
    email,
    role,
    phone: phone || null,
  });
  if (insertError) {
    if (insertError.code === "23505") return respond({ success: true, message: genericMessage }, 200, headers);
    return respond({ error: "Your request could not be saved. Please try again later." }, 500, headers);
  }

  return respond({ success: true, message: genericMessage }, 201, headers);
});
