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

function getDaysBetween(d1: Date, d2: Date): number {
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getPhaseInfo(startDate: Date, periodLength: number, cycleLength: number) {
  const today = new Date();
  const diffDays = getDaysBetween(startDate, today);
  if (diffDays < 0) return { phase: "unknown", day: 0, cycleDay: 0 };

  const cycleDay = diffDays + 1;

  if (cycleDay <= periodLength) {
    return { phase: "menstrual", day: cycleDay, cycleDay };
  } else if (cycleDay <= 14) {
    return { phase: "follicular", day: cycleDay - periodLength, cycleDay };
  } else if (cycleDay <= 17) {
    return { phase: "ovulation", day: cycleDay - 14, cycleDay };
  } else if (cycleDay <= cycleLength) {
    return { phase: "luteal", day: cycleDay - 17, cycleDay };
  }

  return { phase: "luteal", day: cycleDay - 17, cycleDay };
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
    .order("cycle_start_date", { ascending: true });

  if (!cycleLogs || cycleLogs.length === 0) {
    return json({
      current_phase: { phase: "unknown", day: 0 },
      prediction: {
        status: "insufficient_data",
        message: "Log your first period to get a cycle prediction.",
      },
    });
  }

  const cycleLengths: number[] = [];
  for (let i = 1; i < cycleLogs.length; i++) {
    const diff = getDaysBetween(
      new Date(cycleLogs[i - 1].cycle_start_date),
      new Date(cycleLogs[i].cycle_start_date)
    );
    if (diff > 20 && diff < 45) cycleLengths.push(diff);
  }

  const latestLog = cycleLogs[cycleLogs.length - 1];
  const periodLength = latestLog.period_length || 5;
  const avgCycleLength = cycleLengths.length > 0
    ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
    : 28;
  const cyclesUsed = cycleLengths.length + 1;

  const today = new Date();
  const daysSinceStart = getDaysBetween(new Date(latestLog.cycle_start_date), today);

  const phaseInfo = getPhaseInfo(new Date(latestLog.cycle_start_date), periodLength, avgCycleLength);

  const daysUntilNextPeriod = avgCycleLength - daysSinceStart;
  let predictedNextPeriod: Date | null = null;
  let confidenceRange = "";
  let fertileWindow = "";
  let estimatedOvulation = "";
  let pmsOnset = "";

  if (daysUntilNextPeriod > 0) {
    predictedNextPeriod = new Date(today);
    predictedNextPeriod.setDate(predictedNextPeriod.getDate() + daysUntilNextPeriod);
    confidenceRange = `\u00B1${Math.max(2, 5 - cyclesUsed)} days`;
    const fertileStart = new Date(latestLog.cycle_start_date);
    fertileStart.setDate(fertileStart.getDate() + 10);
    const fertileEnd = new Date(latestLog.cycle_start_date);
    fertileEnd.setDate(fertileEnd.getDate() + 17);
    fertileWindow = `${formatDate(fertileStart)} \u2013 ${formatDate(fertileEnd)}`;
    const ovDay = new Date(latestLog.cycle_start_date);
    ovDay.setDate(ovDay.getDate() + 14);
    estimatedOvulation = formatDate(ovDay);
    if (predictedNextPeriod) {
      const pmsDate = new Date(predictedNextPeriod);
      pmsDate.setDate(pmsDate.getDate() - 5);
      pmsOnset = formatDate(pmsDate);
    }
  }

  const prediction: Record<string, unknown> = {
    status: cycleLengths.length >= 1 ? "ok" : "insufficient_data",
    predicted_next_period: predictedNextPeriod ? formatDate(predictedNextPeriod) : undefined,
    confidence_range: confidenceRange,
    avg_cycle_length_days: avgCycleLength,
    fertile_window: fertileWindow,
    estimated_ovulation_day: estimatedOvulation,
    pms_onset_estimate: pmsOnset,
    cycles_used: cyclesUsed,
  };

  if (cycleLengths.length === 0) {
    prediction.message = "Log one more cycle to get more accurate predictions.";
  }

  return json({ current_phase: phaseInfo, prediction });
});