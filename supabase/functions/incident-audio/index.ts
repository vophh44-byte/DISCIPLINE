import { createClient } from "npm:@supabase/supabase-js@2";

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const localDevelopmentOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const allowedOrigin = origin === "https://vophh44-byte.github.io" || localDevelopmentOrigin
    ? origin
    : "https://vophh44-byte.github.io";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  if (!url || !anonKey || !serviceKey) return respond({ error: "Server configuration is incomplete." }, 500);

  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return respond({ error: "Sign-in required." }, 401);

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return respond({ error: "Your session is invalid. Please sign in again." }, 401);

  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: caller, error: callerError } = await adminClient
    .from("profiles").select("role,is_active")
    .eq("user_id", authData.user.id).maybeSingle();

  if (callerError || !caller || caller.role !== "admin" || caller.is_active !== true) {
    return respond({ error: "Administrator permission required." }, 403);
  }

  const bucket = "discipline-temp-audio";
  const userId = authData.user.id;

  try {
    const contentType = req.headers.get("content-type") || "";
    let input: Record<string, unknown>;
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      input = {
        action: String(form.get("action") || ""),
        incident_id: String(form.get("incident_id") || ""),
        consent_confirmed: String(form.get("consent_confirmed") || ""),
      };
      const candidate = form.get("audio");
      if (candidate instanceof File) file = candidate;
    } else {
      input = await req.json();
    }

    const action = String(input.action || "");
    const incidentId = String(input.incident_id || "");

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(incidentId)) {
      return respond({ error: "A valid incident ID is required." }, 400);
    }

    const { data: incident, error: incidentError } = await adminClient
      .from("incidents").select("id,transcript_verified,published_to_parent_at").eq("id", incidentId).maybeSingle();
    if (incidentError || !incident) return respond({ error: "Incident record not found." }, 404);

    if (action === "upload") {
      if (incident.transcript_verified === true || incident.published_to_parent_at) {
        return respond({ error: "Temporary audio can only be attached before transcript verification and parent publication." }, 409);
      }
      if (String(input.consent_confirmed || "") !== "true") {
        return respond({ error: "Confirm that the required school / guardian permission and recording notice have been handled." }, 400);
      }
      if (!file) return respond({ error: "Choose a recorded audio file." }, 400);
      const allowed = new Set(["audio/webm", "audio/mp4", "audio/ogg", "audio/wav"]);
      const mime = file.type.split(";")[0].toLowerCase();
      if (!allowed.has(mime)) return respond({ error: "Unsupported audio type. Use WebM, MP4, OGG or WAV." }, 415);
      if (file.size < 1 || file.size > 8 * 1024 * 1024) {
        return respond({ error: "Audio must be smaller than 8 MB." }, 413);
      }

      const { data: prior, error: priorError } = await adminClient
        .from("incident_evidence").select("id")
        .eq("incident_id", incidentId).eq("evidence_type", "audio_temp").maybeSingle();
      if (priorError) throw priorError;
      if (prior) return respond({ error: "This incident already has temporary audio evidence." }, 409);

      const extension = mime === "audio/mp4" ? "mp4" : mime === "audio/ogg" ? "ogg" : mime === "audio/wav" ? "wav" : "webm";
      const storagePath = incidentId + "/" + crypto.randomUUID() + "." + extension;
      const bytes = new Uint8Array(await file.arrayBuffer());

      const { error: uploadError } = await adminClient.storage.from(bucket).upload(storagePath, bytes, {
        contentType: mime,
        upsert: false,
        cacheControl: "0",
      });
      if (uploadError) throw uploadError;

      const { error: evidenceError } = await adminClient.from("incident_evidence").insert({
        incident_id: incidentId,
        storage_path: storagePath,
        evidence_type: "audio_temp",
        created_by: userId,
      });
      if (evidenceError) {
        await adminClient.storage.from(bucket).remove([storagePath]);
        throw evidenceError;
      }
      return respond({ success: true, message: "Temporary audio saved in private storage." }, 201);
    }

    if (action === "listen") {
      const { data: evidence, error: evidenceError } = await adminClient
        .from("incident_evidence").select("storage_path,audio_deleted_at")
        .eq("incident_id", incidentId).eq("evidence_type", "audio_temp").maybeSingle();
      if (evidenceError) throw evidenceError;
      if (!evidence?.storage_path || evidence.audio_deleted_at) {
        return respond({ error: "No temporary audio is available. It may already have been deleted." }, 404);
      }
      const { data: signed, error: signedError } = await adminClient.storage
        .from(bucket).createSignedUrl(evidence.storage_path, 60);
      if (signedError) throw signedError;
      return respond({ signed_url: signed.signedUrl, expires_in_seconds: 60 });
    }

    if (action === "verify") {
      const transcript = typeof input.transcript_text === "string" ? input.transcript_text.trim() : "";
      if (transcript.length > 1000) return respond({ error: "Transcript must be 1000 characters or fewer." }, 400);

      const { data: evidence, error: evidenceError } = await adminClient
        .from("incident_evidence").select("id,storage_path,audio_deleted_at")
        .eq("incident_id", incidentId).eq("evidence_type", "audio_temp").maybeSingle();
      if (evidenceError) throw evidenceError;

      const hasStoredAudio = !!evidence?.storage_path;
      if (hasStoredAudio && !transcript) {
        return respond({ error: "Enter and review the transcript before deleting the audio." }, 400);
      }

      if (hasStoredAudio) {
        const storedPath = evidence!.storage_path!;
        const separator = storedPath.lastIndexOf("/");
        const folder = separator >= 0 ? storedPath.slice(0, separator) : "";
        const filename = separator >= 0 ? storedPath.slice(separator + 1) : storedPath;
        const { data: storedFiles, error: listError } = await adminClient.storage
          .from(bucket).list(folder, { search: filename, limit: 20 });
        if (listError) {
          return respond({ error: "Could not confirm temporary audio deletion state: " + listError.message }, 502);
        }
        const fileStillExists = (storedFiles || []).some((item) => item.name === filename);
        if (fileStillExists) {
          const { error: removeError } = await adminClient.storage.from(bucket).remove([storedPath]);
          if (removeError) {
            return respond({ error: "The transcript was not verified because temporary audio could not be deleted: " + removeError.message }, 502);
          }
        }
      }

      const { data: verified, error: verifyError } = await adminClient.rpc("admin_verify_incident_transcript", {
        p_incident_id: incidentId,
        p_transcript_text: transcript || null,
        p_actor_user_id: userId,
        p_audio_deleted: hasStoredAudio,
      });
      if (verifyError) {
        return respond({
          error: hasStoredAudio
            ? "Audio was deleted, but the verification record could not be saved. Reopen this incident and retry verification. " + verifyError.message
            : verifyError.message,
          audio_deleted: hasStoredAudio,
        }, 500);
      }
      return respond({ success: true, verified, audio_deleted: hasStoredAudio });
    }

    return respond({ error: "Unsupported action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return respond({ error: message }, 500);
  }
});
