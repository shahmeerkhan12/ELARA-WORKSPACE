import { useState, useEffect, useCallback } from "react";
import { getUserId } from "../lib/auth";
import {
  postCheckin,
  postCycleLog,
  getPrediction,
  getMoodHistory,
  type CheckinResponse,
  type PredictionResponse,
  type MoodEntry,
  type Phase,
} from "../lib/api";
import { PHASE_LABELS, MOOD_SCORES, todayLocal } from "../lib/types";
import {
  BookOpen,
  X,
  Sparkles,
  RefreshCw,
  Lightbulb,
  Heart,
  Star,
  Calendar,
  Moon,
  Sun,
  Thermometer,
  Droplets,
  Brain,
  MessageCircle,
} from "lucide-react";

const PHASE_TIPS: Record<string, string[]> = {
  menstrual: [
    "Rest when you can — your energy is naturally lower right now.",
    "Iron-rich foods like spinach or lentils can help replenish you.",
    "Gentle movement like stretching or walking supports circulation.",
    "Stay hydrated to ease cramps and bloating.",
  ],
  follicular: [
    "Your energy is building — great time for creative projects.",
    "Try a new workout or class — your body is primed for strength gains.",
    "Social plans may feel more rewarding this week.",
    "Load up on fermented foods for gut health.",
  ],
  ovulation: [
    "Communication flows easily — schedule important conversations.",
    "Your skin may be at its clearest; enjoy a simple glow routine.",
    "High energy window — cardio and group workouts feel great.",
    "Include antioxidant-rich berries in your meals.",
  ],
  luteal: [
    "Cravings are real — opt for dark chocolate or complex carbs.",
    "You might feel more introspective — journaling helps.",
    "Prioritize sleep; your body needs more rest in this phase.",
    "Magnesium-rich foods (nuts, seeds, bananas) can ease PMS.",
  ],
  unknown: [
    "Log a period to unlock phase-personalized tips!",
    "Stay hydrated and listen to what your body needs.",
    "A short walk can boost your mood any day.",
    "Try a 5-minute breathing exercise to centre yourself.",
  ],
};

const PHASE_ICONS: Record<string, typeof Droplets> = {
  menstrual: Droplets,
  follicular: Sun,
  ovulation: Star,
  luteal: Moon,
  unknown: Brain,
};

/** Greeting based on local time of day */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getPhaseFromPrediction(prediction: PredictionResponse | null): Phase {
  return prediction?.current_phase?.phase ?? "unknown";
}

function PhaseIndicator({ phase, day }: { phase: Phase; day?: number }) {
  const Icon = PHASE_ICONS[phase] ?? Brain;
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
      phase === "menstrual" ? "bg-red-50 text-red-600" :
      phase === "follicular" ? "bg-amber-50 text-amber-600" :
      phase === "ovulation" ? "bg-emerald-50 text-emerald-600" :
      phase === "luteal" ? "bg-blue-50 text-blue-600" :
      "bg-muted text-text-soft"
    }`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{PHASE_LABELS[phase]}</span>
      {day !== undefined && <span className="opacity-70">· Day {day}</span>}
    </div>
  );
}

// ── History Modal ──────────────────────────────────────────────
function HistoryModal({
  history,
  loading,
  msg,
  open,
  onClose,
}: {
  history: MoodEntry[];
  loading: boolean;
  msg: string;
  open: boolean;
  onClose: () => void;
}) {
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Check-in history"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl max-h-[80vh] flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary-dark" />
            <h2 className="font-heading text-lg text-primary-dark">History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-soft hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close history"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-12 text-text-soft">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : msg ? (
            <div className="flex flex-col items-center gap-2 py-12 text-text-soft">
              <MessageCircle className="w-8 h-8 opacity-40" />
              <p className="text-sm text-center">{msg}</p>
            </div>
          ) : (
            <ul className="space-y-1" role="list">
              {[...history].reverse().map((entry, idx) => {
                const emoji =
                  MOOD_SCORES.find((m) => m.score === entry.mood_score)?.emoji ?? "—";
                return (
                  <li key={idx}>
                    <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm">
                      <span className="text-lg leading-none shrink-0">{emoji}</span>
                      <span className="font-semibold text-primary-dark text-xs whitespace-nowrap">
                        {formatTime(entry.entry_date)}
                      </span>
                      {entry.phase && entry.phase !== "unknown" && (
                        <span className="text-[0.6rem] bg-primary-light text-primary-dark rounded-full px-1.5 py-0.5 ml-auto shrink-0">
                          {PHASE_LABELS[entry.phase]}
                        </span>
                      )}
                      {entry.entry_text && (
                        <span className="text-text-soft text-xs truncate min-w-0 flex-1 hidden md:inline">
                          {entry.entry_text}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────
export default function DashboardPage() {
  const userId = getUserId();

  // State: Check-in
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [entryText, setEntryText] = useState("");
  const [checkinResult, setCheckinResult] = useState<CheckinResponse | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinMsg, setCheckinMsg] = useState("");

  // State: Cycle log
  const [cycleDate, setCycleDate] = useState(todayLocal());
  const [periodLength, setPeriodLength] = useState("");
  const [cycleMsg, setCycleMsg] = useState("");
  const [cycleLoading, setCycleLoading] = useState(false);

  // State: Prediction / phase
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [predictionMsg, setPredictionMsg] = useState("");
  const [predictionLoading, setPredictionLoading] = useState(false);

  // State: History
  const [history, setHistory] = useState<MoodEntry[]>([]);
  const [historyMsg, setHistoryMsg] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Derived phase-based tips
  const currentPhase = getPhaseFromPrediction(prediction);
  const tips = PHASE_TIPS[currentPhase] ?? PHASE_TIPS.unknown;
  const PhaseIcon = PHASE_ICONS[currentPhase] ?? Brain;

  // Loaders
  const loadPrediction = useCallback(async () => {
    setPredictionLoading(true);
    setPredictionMsg("");
    try {
      const data = await getPrediction(userId);
      setPrediction(data);
    } catch (err: any) {
      setPredictionMsg(err.message || "Log your first period to unlock your cycle forecast.");
    } finally {
      setPredictionLoading(false);
    }
  }, [userId]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryMsg("");
    try {
      const data = await getMoodHistory(userId);
      setHistory(data.entries ?? []);
      if (!data.entries?.length) setHistoryMsg("No check-ins yet.");
    } catch (err: any) {
      setHistoryMsg(err.message || "Could not load history.");
    } finally {
      setHistoryLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPrediction();
    loadHistory();
  }, [loadPrediction, loadHistory]);

  // Handlers
  const handleCheckin = async () => {
    if (!selectedScore) {
      setCheckinMsg("Pick the emoji that matches your mood first.");
      return;
    }
    setCheckinLoading(true);
    setCheckinMsg("Saving… Elara may take a few seconds to reply.");
    setCheckinResult(null);
    try {
      const data = await postCheckin(userId, entryText);
      setCheckinResult(data);
      setCheckinMsg("");
      setEntryText("");
      setSelectedScore(null);
      setSelectedEmoji(null);
      loadHistory();
    } catch (err: any) {
      setCheckinMsg(err.message);
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleCycleLog = async () => {
    if (!cycleDate) {
      setCycleMsg("Pick the start date.");
      return;
    }
    if (cycleDate > todayLocal()) {
      setCycleMsg("The date can't be in the future.");
      return;
    }
    setCycleLoading(true);
    setCycleMsg("");
    try {
      await postCycleLog(userId, cycleDate, periodLength ? Number(periodLength) : null);
      setCycleMsg(`Period logged for ${cycleDate}.`);
      loadPrediction();
    } catch (err: any) {
      setCycleMsg(err.message);
    } finally {
      setCycleLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen">
      <HistoryModal
        history={history}
        loading={historyLoading}
        msg={historyMsg}
        open={showHistory}
        onClose={() => setShowHistory(false)}
      />

      <div className="mx-auto max-w-2xl px-4 md:px-6 pb-4 md:pb-6 space-y-6">
        {/* ── Welcome header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground">
              {greeting()}, <span className="text-primary">lovely</span> ✨
            </h1>
            <p className="text-text-soft text-sm mt-1">
              Here's how you're doing today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(true)}
              className="btn-ghost text-xs"
              aria-label="View check-in history"
            >
              <BookOpen className="w-3.5 h-3.5" />
              History
            </button>
            <button
              onClick={() => { loadPrediction(); loadHistory(); }}
              disabled={predictionLoading || historyLoading}
              className="btn-ghost text-xs shrink-0"
              aria-label="Refresh dashboard"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  predictionLoading || historyLoading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Phase Banner ── */}
        <section className="bg-gradient-to-br from-primary-light via-accent-light to-cream rounded-xl p-5 border border-primary/10 shadow-soft">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/70 rounded-full shadow-sm">
              <PhaseIcon className={`w-5 h-5 ${
                currentPhase === "menstrual" ? "text-red-500" :
                currentPhase === "follicular" ? "text-amber-500" :
                currentPhase === "ovulation" ? "text-emerald-500" :
                currentPhase === "luteal" ? "text-blue-500" :
                "text-primary"
              }`} />
            </div>
            <div className="flex-1">
              <p className="font-heading text-sm text-text-soft">Current phase</p>
              <PhaseIndicator
                phase={currentPhase}
                day={prediction?.current_phase?.day}
              />
            </div>
          </div>
          <ul className="space-y-2 mt-3">
            {tips.slice(0, 2).map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-foreground"
              >
                <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={loadPrediction}
            disabled={predictionLoading}
            className="text-xs text-primary font-medium mt-2 hover:text-primary-dark transition-colors"
          >
            See all tips for this phase →
          </button>
        </section>

        {/* ── Mood Check-in ── */}
        <section className="card">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-xl text-foreground">
              How are you feeling?
            </h2>
          </div>
          <p className="text-text-soft text-sm mb-4">Tap an emoji that matches your mood</p>

          <div className="flex gap-2 md:gap-3 mb-4">
            {MOOD_SCORES.map((m) => (
              <button
                key={m.score}
                onClick={() => {
                  setSelectedScore(m.score);
                  setSelectedEmoji(m.emoji);
                }}
                className={`text-2xl md:text-3xl p-2 md:p-3 rounded-xl border-2 transition-all duration-150 hover:scale-110 active:scale-95 ${
                  selectedScore === m.score
                    ? "border-primary bg-primary-light scale-110 shadow-md"
                    : "border-border bg-white hover:border-primary/40"
                }`}
                title={m.label}
                aria-label={`Mood: ${m.label}`}
                aria-pressed={selectedScore === m.score}
              >
                {m.emoji}
              </button>
            ))}
          </div>

          <textarea
            value={entryText}
            onChange={(e) => setEntryText(e.target.value)}
            rows={2}
            placeholder="What's on your mind? (optional)"
            className="input-field mb-3 resize-y"
          />

          <button
            onClick={handleCheckin}
            disabled={checkinLoading}
            className="btn-primary w-full justify-center"
          >
            {checkinLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4" />
                Save check-in
              </>
            )}
          </button>
          {checkinMsg && (
            <p
              className={`mt-2 text-sm ${
                checkinMsg.includes("Pick") || checkinMsg.includes("Error")
                  ? "msg-error"
                  : checkinMsg.includes("Saving")
                    ? "text-text-soft"
                    : ""
              }`}
            >
              {checkinMsg}
            </p>
          )}

          {checkinResult && (
            <div className="mt-4 p-4 bg-accent-light rounded-lg border-l-4 border-primary animate-fadeIn">
              <div className="flex items-start gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-foreground">{checkinResult.reply}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-soft mt-2">
                <span className="flex items-center gap-1">
                  Mood: {selectedEmoji ?? "—"} · {checkinResult.mood_score}/5
                </span>
                {checkinResult.themes?.length > 0 && (
                  <span className="flex items-center gap-1">
                    · Themes: {checkinResult.themes.join(", ")}
                  </span>
                )}
                {currentPhase !== "unknown" && (
                  <span className="flex items-center gap-1">
                    · {PHASE_LABELS[currentPhase]} phase
                  </span>
                )}
              </div>
              {checkinResult.flag_for_support && (
                <p className="text-primary text-sm mt-3 flex items-center gap-2 bg-white/70 rounded-lg p-3">
                  <Heart className="w-4 h-4 shrink-0" />
                  You're not alone — consider reaching out to someone you trust or a professional.
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── Log Your Period ── */}
        <section className="card">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-xl text-foreground">Log your period</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <label className="flex flex-col gap-1 text-sm text-text-soft flex-1">
              Start date
              <input
                type="date"
                value={cycleDate}
                onChange={(e) => setCycleDate(e.target.value)}
                max={todayLocal()}
                className="input-field"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-soft flex-1">
              Duration in days (optional)
              <input
                type="number"
                value={periodLength}
                onChange={(e) => setPeriodLength(e.target.value)}
                min={1}
                max={15}
                placeholder="e.g. 5"
                className="input-field"
              />
            </label>
          </div>
          <button
            onClick={handleCycleLog}
            disabled={cycleLoading}
            className="btn-primary w-full justify-center"
          >
            {cycleLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Droplets className="w-4 h-4" />
                Save period
              </>
            )}
          </button>
          {cycleMsg && (
            <p
              className={`mt-2 text-sm ${
                cycleMsg.includes("logged") ? "text-green-600" : "msg-error"
              }`}
            >
              {cycleMsg}
            </p>
          )}
        </section>

        {/* ── Cycle Forecast ── */}
        <section className="card">
          <div className="flex items-center gap-2 mb-4">
            <Thermometer className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-xl text-foreground">Cycle forecast</h2>
          </div>
          {predictionLoading ? (
            <div className="flex items-center gap-3 py-6 text-text-soft">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading prediction...</span>
            </div>
          ) : predictionMsg ? (
            <div className="flex flex-col items-center gap-2 py-8 text-text-soft">
              <Calendar className="w-10 h-10 opacity-30" />
              <p className="text-sm text-center">{predictionMsg}</p>
            </div>
          ) : prediction ? (
            <div>
              <PhaseIndicator
                phase={prediction.current_phase?.phase ?? "unknown"}
                day={prediction.current_phase?.day}
              />

              {prediction.prediction?.status === "ok" ? (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm mt-4">
                  {[
                    ["Next period", prediction.prediction?.predicted_next_period],
                    ["Confidence range", prediction.prediction?.confidence_range],
                    ["Avg cycle", `${prediction.prediction?.avg_cycle_length_days ?? "—"} days`],
                    ["Fertile window", prediction.prediction?.fertile_window],
                    ["Ovulation est.", prediction.prediction?.estimated_ovulation_day],
                    ["PMS onset est.", prediction.prediction?.pms_onset_estimate],
                    ["Cycles used", prediction.prediction?.cycles_used],
                  ].map(([label, value]) =>
                    value ? (
                      <div key={label as string} className="contents">
                        <dt className="text-text-soft">{label}</dt>
                        <dd className="font-medium text-foreground">{value}</dd>
                      </div>
                    ) : null
                  )}
                </dl>
              ) : (
                <p className="text-text-soft text-sm mt-4">
                  {prediction.prediction?.message ?? "Not enough data yet. Log a few cycles to see your forecast."}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-text-soft">
              <Calendar className="w-10 h-10 opacity-30" />
              <p className="text-sm text-center">Log your first period to unlock your forecast.</p>
            </div>
          )}
        </section>

        {/* ── Recent Check-ins (inline) ── */}
        {history.length > 0 && (
          <section className="card">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h2 className="font-heading text-xl text-foreground">
                Recent check-ins
              </h2>
              <span className="text-xs text-text-soft ml-auto">
                {history.length} total
              </span>
            </div>
            <div className="space-y-2">
              {[...history]
                .reverse()
                .slice(0, 5)
                .map((entry, idx) => {
                  const emoji =
                    MOOD_SCORES.find((m) => m.score === entry.mood_score)?.emoji ?? "—";
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 border border-border rounded-lg px-3 py-2 text-sm"
                    >
                      <span className="text-lg leading-none">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary-dark text-xs">
                            {formatDate(entry.entry_date)}
                          </span>
                          {entry.phase && entry.phase !== "unknown" && (
                            <span className="text-[0.6rem] bg-primary-light text-primary-dark rounded-full px-1.5 py-0.5">
                              {PHASE_LABELS[entry.phase]}
                            </span>
                          )}
                          <span className="text-xs text-text-soft ml-auto">
                            {entry.mood_score}/5
                          </span>
                        </div>
                        {entry.entry_text && (
                          <p className="text-foreground text-xs mt-0.5 truncate">
                            {entry.entry_text}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}