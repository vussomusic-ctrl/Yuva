// Supabase Edge Function: generate-description
// Generates a selling real-estate description via the Anthropic Messages API.
// The ANTHROPIC_API_KEY lives in Supabase secrets — never in the app bundle.
// Deploy: `supabase functions deploy generate-description` (verify_jwt stays ON
// by default → only authenticated users can call it).

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
    const { params, lang } = await req.json();
    const language = LANG_NAMES[lang as string] ?? "Russian";

    const system =
      `You write a selling real-estate listing description for a property in Azerbaijan. ` +
      `Write strictly in ${language}. The currency is the Azerbaijani manat (₼).\n\n` +
      `STRICT FACTUALITY — this is critical:\n` +
      `- Use ONLY the facts present in the JSON data. Describe nothing that is not there.\n` +
      `- NEVER mention surroundings or infrastructure unless they appear in the data: ` +
      `no metro, bus/transport, schools, kindergartens, parks, sea, beach, shops, malls, ` +
      `hospitals, restaurants, "city centre", "walking distance", or "nearby ..." of any kind. ` +
      `You do NOT know what is around the property — the only location info is the location field; ` +
      `treat it as a label, not a hint about amenities.\n` +
      `- Do NOT infer or assume: no "usually", "typically", "likely", "probably", ` +
      `"in such buildings", "perfect for ...". No renovation, view, furniture, amenity, year, ` +
      `floor, or condition that is not explicitly in the data.\n` +
      `- The amenities and features arrays are the ONLY amenities/extras you may mention. ` +
      `If a field is absent, it does not exist — say nothing about it.\n` +
      `- Never put contact details into the description: no phone numbers, no Telegram/WhatsApp ` +
      `handles, no links. Contacts are shown separately by the app.\n` +
      `- No unverifiable superlatives or hype ("best in the district", "unique offer", ` +
      `"dream investment", "once in a lifetime"). You cannot know these. Sell by presenting ` +
      `the real facts well, not by exaggeration.\n\n` +
      `Your job: present the REAL facts attractively, not to add new ones. ` +
      `Tone: professional, warm, selling — but 100% grounded in the data. No filler. ` +
      `Plain text only — NO markdown, no headings, no bullet points. ` +
      `2–4 short paragraphs. Output only the description text.`;

    const userContent =
      `Listing data (these facts only):\n` + JSON.stringify(params ?? {}, null, 2);

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
        // cache_control on the (static) system block — harmless if the prompt is
        // below the cacheable token threshold; helps if it grows later.
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      // Log full detail server-side; never leak the key/body to the client.
      const detail = await res.text();
      console.error("Anthropic error", res.status, detail);
      return json(502, { error: "AI provider error" });
    }

    const data = await res.json();
    const description = (data?.content?.[0]?.text ?? "").trim();
    if (!description) return json(502, { error: "Empty response from AI" });

    return json(200, { description });
  } catch (e) {
    console.error("generate-description failed", e);
    return json(500, { error: "Unexpected error" });
  }
});
