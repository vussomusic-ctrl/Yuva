// Supabase Edge Function: translate-description
// Translates a listing description into the target language via the Anthropic
// Messages API. ANTHROPIC_API_KEY lives in Supabase secrets (shared across the
// project's functions) — never in the app bundle.
// Deploy: `supabase functions deploy translate-description` (verify_jwt stays ON
// by default → callers send a valid JWT; guests pass via the anon key).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Cheapest/fastest current Haiku (verified at platform.claude.com, 2026-06).
const MODEL = "claude-haiku-4-5-20251001";

const LANG_NAMES: Record<string, string> = {
  az: "Azerbaijani",
  ru: "Russian",
  en: "English",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json(500, { error: "ANTHROPIC_API_KEY is not configured" });

  try {
    const { text, targetLang } = await req.json();
    if (typeof text !== "string" || !text.trim() || !LANG_NAMES[targetLang as string]) {
      return json(400, { error: "Missing or invalid text/targetLang" });
    }
    const language = LANG_NAMES[targetLang as string];

    const system =
      `Translate this real-estate listing description into ${language} ` +
      `(az=Azerbaijani, ru=Russian, en=English). ` +
      `Preserve the meaning, tone, and all facts exactly. ` +
      `Currency is the Azerbaijani manat (₼). ` +
      `Plain text only — no markdown. Return ONLY the translation, nothing else.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        // cache_control on the (static) system block — harmless if below the
        // cacheable token threshold; helps if it grows later.
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: text }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Anthropic error", res.status, detail);
      return json(502, { error: "AI provider error" });
    }

    const data = await res.json();
    const translation = (data?.content?.[0]?.text ?? "").trim();
    if (!translation) return json(502, { error: "Empty response from AI" });

    return json(200, { translation });
  } catch (e) {
    console.error("translate-description failed", e);
    return json(500, { error: "Unexpected error" });
  }
});
