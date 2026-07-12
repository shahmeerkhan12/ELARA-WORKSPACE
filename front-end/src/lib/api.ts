const API_BASE = "https://anaerobic-submitter-embattled.ngrok-free.dev";

export type Phase = "menstrual" | "follicular" | "ovulation" | "luteal" | "unknown";

export interface CheckinResponse {
  reply: string;
  mood_score: number;
  themes: string[];
  phase?: Phase;
  flag_for_support: boolean;
}

export interface CycleLogResponse {
  message: string;
}

export interface MoodEntry {
  entry_date: string;
  entry_text?: string;
  mood_emoji?: string;
  mood_score: number;
  phase: Phase;
  agent_response?: string | null;
}

export interface MoodHistoryResponse {
  user_id: string;
  entries: MoodEntry[];
}

export interface CyclePrediction {
  status: "ok" | "insufficient_data";
  predicted_next_period?: string;
  confidence_range?: string;
  avg_cycle_length_days?: number;
  fertile_window?: string;
  estimated_ovulation_day?: string;
  pms_onset_estimate?: string;
  cycles_used?: number;
  message?: string;
}

export interface PredictionResponse {
  current_phase: {
    phase: Phase;
    day: number;
  };
  prediction: CyclePrediction;
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  console.debug(`[API] ${options?.method ?? "GET"} ${url}`);

  const resp = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      "ngrok-skip-browser-warning": "true",
    },
  });

  const bodyText = await resp.text().catch(() => "");
  let data: any = {};
  try {
    data = JSON.parse(bodyText);
  } catch {
    data = { detail: bodyText || `HTTP ${resp.status}` };
  }

  if (!resp.ok) {
    console.error(`[API] Error ${resp.status}:`, data);
    const msg =
      typeof data.detail === "string"
        ? data.detail
        : Array.isArray(data.detail)
          ? data.detail.map((e: any) => e.msg ?? JSON.stringify(e)).join("; ")
          : `Error ${resp.status}`;
    throw new Error(msg);
  }

  return data as T;
}

export async function postCheckin(
  userId: string,
  entryText: string
): Promise<CheckinResponse> {
  return api<CheckinResponse>("/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      entry_text: entryText,
    }),
  });
}

export async function postCycleLog(
  userId: string,
  cycleStartDate: string,
  periodLength: number | null
): Promise<CycleLogResponse> {
  return api<CycleLogResponse>("/cycle-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      cycle_start_date: cycleStartDate,
      period_length: periodLength,
    }),
  });
}

export async function getPrediction(userId: string): Promise<PredictionResponse> {
  return api<PredictionResponse>(`/prediction/${encodeURIComponent(userId)}`);
}

export async function getMoodHistory(userId: string): Promise<MoodHistoryResponse> {
  return api<MoodHistoryResponse>(`/mood-history/${encodeURIComponent(userId)}`);
}