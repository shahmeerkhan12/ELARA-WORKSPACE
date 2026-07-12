import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const client = createClient(supabaseUrl, supabaseKey);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const PHASE_ORDER = ["menstrual", "follicular", "ovulation", "luteal"];
const PHASE_EMOJIS: Record<string, string> = {
  menstrual: "\u{1F338}",
  follicular: "\u{1F331}",
  ovulation: "\u2728",
  luteal: "\u{1F319}",
};

function getPhase(startDate: Date, periodLength: number): { phase: string; day: number } {
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { phase: "unknown", day: 0 };

  const cycleDay = diffDays + 1;

  if (cycleDay <= periodLength) {
    return { phase: "menstrual", day: cycleDay };
  } else if (cycleDay <= 14) {
    return { phase: "follicular", day: cycleDay - periodLength };
  } else if (cycleDay <= 17) {
    return { phase: "ovulation", day: cycleDay - 14 };
  } else if (cycleDay <= 30) {
    return { phase: "luteal", day: cycleDay - 17 };
  }

  return { phase: "luteal", day: cycleDay - 17 };
}

const RECOMMENDATIONS: Record<string, string[]> = {
  menstrual: [
    "Rest when you need to \u2014 your body is doing important work.",
    "Stay hydrated and try gentle movement like stretching or walking.",
    "Iron-rich foods like spinach or lentils can help support your energy.",
    "Heat therapy on your lower belly can ease cramps.",
    "Track your flow and symptoms \u2014 patterns help Elara give better tips.",
  ],
  follicular: [
    "This is your power phase \u2014 great time for creative projects and new ideas.",
    "Your energy is rising, so try a workout that feels fun and dynamic.",
    "Eat fresh, colorful foods to fuel your growing energy.",
    "Social plans? Your communication skills are peaking!",
    "Start something new \u2014 your mind is primed for learning.",
  ],
  ovulation: [
    "You're glowing! Your confidence and energy are at their peak.",
    "Great time for important conversations and presentations.",
    "Your skin may be extra radiant \u2014 enjoy it!",
    "Collaboration flows easily right now \u2014 team up on something.",
    "Schedule that difficult chat you've been putting off.",
  ],
  luteal: [
    "Your body is winding down \u2014 be gentle with yourself.",
    "You might crave comfort foods \u2014 that's okay, just balance it out.",
    "Prioritize sleep and low-key evenings.",
    "Journaling or meditation can help process emotions.",
    "If PMS symptoms show up, track them \u2014 knowledge is power.",
  ],
};

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

  if (req.method !== "GET") {
    return json({ detail: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const userId = url.pathname.split("/").pop();

  if (!userId) {
    return json({ detail: "Missing user_id" }, 400);
  }

  const { data: cycleLogs } = await client
    .from("cycle_logs")
    .select("cycle_start_date, period_length")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: latestMood } = await client
    .from("check_ins")
    .select("mood_score, mood_emoji")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  let phase: string = "unknown";
  let moodBucket: string | null = null;

  if (cycleLogs && cycleLogs.length > 0) {
    const log = cycleLogs[0];
    const startDate = new Date(log.cycle_start_date);
    const pLen = log.period_length || 5;
    const p = getPhase(startDate, pLen);
    phase = p.phase;
  }

  if (latestMood && latestMood.length > 0) {
    const score = latestMood[0].mood_score;
    if (score <= 2) moodBucket = "low";
    else if (score <= 3) moodBucket = "moderate";
    else moodBucket = "positive";
  }

  const tips = RECOMMENDATIONS[phase] || RECOMMENDATIONS.luteal;
  let selected = [...tips];
  if (moodBucket === "low") {
    selected = selected.filter(
      (t) => t.includes("rest") || t.includes("gentle") || t.includes("sleep") || t.includes("kind")
    );
  }
  if (selected.length < 2) selected = tips;
  const shuffled = selected.sort(() => Math.random() - 0.5).slice(0, 3);

  return json({ phase, mood_bucket: moodBucket, recommendations: shuffled });
});