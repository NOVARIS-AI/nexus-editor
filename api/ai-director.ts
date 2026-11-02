export const config = { runtime: "nodejs" };

const system = `You are NEXUS AI Director, a practical creative-planning assistant inside a video editor. Return ONLY valid JSON with this shape:
{"summary":"short useful summary","scenes":[{"title":"...","visual":"...","duration":5,"narration":"...","searchTerms":["..."],"overlayText":"..."}],"editPlan":[{"action":"...","target":"...","details":"..."}],"assetNeeds":[{"kind":"image or video","query":"...","reason":"..."}],"userReferenceNeeded":false}
Create 3-8 scenes. Make durations add up approximately to the requested duration. Use concise visual descriptions and useful search terms. Do not claim to generate or fetch assets. If the brief asks to depict a specific private person, set userReferenceNeeded true unless reference media is already supplied.`;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(503).json({ error: "AI Director brain is not configured yet. Add GROQ_API_KEY in Vercel Environment Variables when ready. The local storyboard fallback remains available." });
  try {
    const { brief, context = {} } = req.body || {};
    if (typeof brief !== "string" || !brief.trim()) return res.status(400).json({ error: "A creative brief is required." });
    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.NEXUS_BRAIN_MODEL || "llama-3.3-70b-versatile", temperature: 0.5, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify({ brief: brief.slice(0, 6000), context }) }] })
    });
    const payload = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: payload.error?.message || "AI provider request failed." });
    const raw = payload.choices?.[0]?.message?.content;
    const plan = JSON.parse(raw || "{}");
    if (!Array.isArray(plan.scenes) || !plan.scenes.length) return res.status(502).json({ error: "AI Director returned an incomplete storyboard. Try again." });
    return res.status(200).json({ plan, model: payload.model || process.env.NEXUS_BRAIN_MODEL || "llama-3.3-70b-versatile", provider: "Groq" });
  } catch (error: any) { return res.status(500).json({ error: error?.message || "AI Director failed." }); }
}
