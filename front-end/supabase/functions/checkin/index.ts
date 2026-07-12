import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const client = createClient(supabaseUrl, supabaseKey);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function getPhase(startDate: Date, periodLength: number): string {
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "unknown";
  const cycleDay = diffDays + 1;
  if (cycleDay <= periodLength) return "menstrual";
  if (cycleDay <= 14) return "follicular";
  if (cycleDay <= 17) return "ovulation";
  return "luteal";
}

const REPLIES: Record<string, string[]> = {
  low: [
    "I hear you. It's okay to not be okay. Be gentle with yourself today.",
    "That sounds tough. Remember, you're not alone — even small steps count.",
    "Sending you warmth. Rest is productive too, and tomorrow is a new day.",
  ],
  moderate: [
    "Thanks for sharing. A pretty balanced day — that's something to appreciate.",
    "Right in the middle — and that's perfectly fine. Steady is good.",
    "Not bad, not great — just a regular day. Sometimes that's exactly what we need.",
  ],
  positive: [
    "That's wonderful! I'm glad things are going well. Savor this energy!",
    "Love to hear it! You're thriving — keep doing what feels good.",
    "Amazing! Your positivity is contagious. Take a moment to celebrate yourself.",
  ],
};

function pickReply(bucket: string): string {
  const pool = REPLIES[bucket] || REPLIES.moderate;
  return pool[Math.floor(Math.random() * pool.length)];
}

function extractThemes(text: string): string[] {
  const themes: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes("work") || lower.includes("job") || lower.includes("deadline")) themes.push("work");
  if (lower.includes("friend") || lower.includes("family") || lower.includes("partner") || lower.includes("love"))
    themes.push("relationships");
  if (lower.includes("tired") || lower.includes("sleep") || lower.includes("exhausted") || lower.includes("insomnia"))
    themes.push("sleep");
  if (lower.includes("anxious") || lower.includes("stress") || lower.includes("worry") || lower.includes("overwhelm"))
    themes.push("anxiety");
  if (lower.includes("sad") || lower.includes("cry") || lower.includes("depress") || lower.includes("down"))
    themes.push("mood");
  if (lower.includes("pain") || lower.includes("cramp") || lower.includes("headache") || lower.includes("ache"))
    themes.push("physical");
  if (lower.includes("energ") || lower.includes("motivat") || lower.includes("focus")) themes.push("energy");
  if (lower.includes("eat") || lower.includes("food") || lower.includes("crave") || lower.includes("hungry"))
    themes.push("nutrition");
  if (lower.includes("exercise") || lower.includes("gym") || lower.includes("run") || lower.includes("yoga"))
    themes.push("fitness");
  return themes;
}

function needsSupport(text: string, score: number): boolean {
  const flagWords = ["hurt myself", "self-harm", "suicide", "want to die", "can't go on", "hopeless"];
  const lower = text.toLowerCase();
  return flagWords.some((w) => lower.includes(w)) || (score <= 2 && lower.includes("help"));
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ detail: "Method not allowed" }, 405);
  }

  const body = await req.json();
  const { user_id, entry_text, mood_emoji, mood_score } = body;

  if (!user_id || !mood_emoji || !mood_score) {
    return json({ detail: "Missing required fields: user_id, mood_emoji, mood_score" }, 400);
  }

  const { data: cycleLogs } = await client
    .from("cycle_logs")
    .select("cycle_start_date, period_length")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false })
    .limit(1);

  let phase = "unknown";
  if (cycleLogs && cycleLogs.length > 0) {
    const log = cycleLogs[0];
    phase = getPhase(new Date(log.cycle_start_date), log.period_length || 5);
  }

  const themes = entry_text ? extractThemes(entry_text) : [];
  const bucket = mood_score <= 2 ? "low" : mood_score <= 3 ? "moderate" : "positive";
  const reply = pickReply(bucket);
  const flag_for_support = entry_text ? needsSupport(entry_text, mood_score) : false;

  const { error } = await client.from("check_ins").insert({
    user_id,
    entry_date: new Date().toISOString().split("T")[0],
    entry_text: entry_text || "",
    mood_emoji,
    mood_score,
    phase,
    agent_response: reply,
    themes,
    flag_for_support,
  });

  if (error) {
    console.error("Insert error:", error);
    return json({ detail: "Failed to save check-in" }, 500);
  }

  return json({ reply, mood_score, themes, phase, flag_for_support });
});