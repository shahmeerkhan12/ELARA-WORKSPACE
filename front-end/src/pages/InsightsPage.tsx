import { useState, useEffect } from "react";
import { getUserId } from "../lib/auth";
import { getMoodHistory, getPrediction, type MoodEntry } from "../lib/api";
import { PHASE_LABELS } from "../lib/types";

export default function InsightsPage() {
  const userId = getUserId();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [avgMood, setAvgMood] = useState<number | null>(null);
  const [phaseMoodAvg, setPhaseMoodAvg] = useState<Record<string, number>>({});
  const [moodTrend, setMoodTrend] = useState<"up" | "down" | "stable" | null>(null);
  const [cycleCount, setCycleCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [moodData, predData] = await Promise.all([
          getMoodHistory(userId).catch(() => null as any),
          getPrediction(userId).catch(() => null),
        ]);

        const entries_ = moodData?.entries ?? [];
        setEntries(entries_);

        // Compute insights
        const allMoods = entries_.filter((e) => e.mood_score);
        if (allMoods.length > 0) {
          const total = allMoods.reduce((sum, e) => sum + e.mood_score, 0);
          setAvgMood(Math.round((total / allMoods.length) * 10) / 10);

          // Phase averages
          const phaseScores: Record<string, number[]> = {};
          for (const e of allMoods) {
            const phase = e.phase || "unknown";
            if (!phaseScores[phase]) phaseScores[phase] = [];
            phaseScores[phase].push(e.mood_score);
          }
          const phaseAvg: Record<string, number> = {};
          for (const [phase, scores] of Object.entries(phaseScores)) {
            phaseAvg[phase] =
              Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
          }
          setPhaseMoodAvg(phaseAvg);

          // Mood trend (last 5 vs previous 5)
          const sorted = [...allMoods].sort(
            (a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
          );
          const recent = sorted.slice(-5);
          const previous = sorted.slice(-10, -5);
          if (recent.length >= 3 && previous.length >= 3) {
            const recentAvg =
              recent.reduce((s, e) => s + e.mood_score, 0) / recent.length;
            const prevAvg =
              previous.reduce((s, e) => s + e.mood_score, 0) / previous.length;
            if (recentAvg > prevAvg + 0.3) setMoodTrend("up");
            else if (recentAvg < prevAvg - 0.3) setMoodTrend("down");
            else setMoodTrend("stable");
          }
        }

        if (predData?.prediction?.cycles_used) {
          setCycleCount(predData.prediction.cycles_used);
        }
      } catch (err: any) {
        setError(err.message || "Could not load insights.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const trendIcon = moodTrend === "up" ? "📈" : moodTrend === "down" ? "📉" : "➡️";
  const trendLabel =
    moodTrend === "up"
      ? "Trending upward"
      : moodTrend === "down"
        ? "Trending downward"
        : moodTrend === "stable"
          ? "Stable"
          : "Not enough data";

  const phaseOrder = ["menstrual", "follicular", "ovulation", "luteal"];

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <p className="text-text-soft text-center py-16">Loading insights...</p>
      </div>
    );
  }

  if (error && !entries.length) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="card text-center py-16">
          <p className="text-text-soft">{error}</p>
        </div>
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="card text-center py-16">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="font-heading text-2xl text-foreground mb-2">No insights yet</h2>
          <p className="text-text-soft">
            Start logging your moods and periods to unlock personalized insights about your cycle.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-foreground">📊 Insights</h1>
        <p className="text-text-soft mt-1">
          Patterns and trends based on your {entries.length} check-in{entries.length !== 1 ? "s" : ""}.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl mb-1">📅</div>
          <div className="text-2xl font-heading text-primary">{cycleCount}</div>
          <div className="text-xs text-text-soft">Cycles tracked</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl mb-1">💭</div>
          <div className="text-2xl font-heading text-primary">{entries.length}</div>
          <div className="text-xs text-text-soft">Check-ins</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl mb-1">⭐</div>
          <div className="text-2xl font-heading text-primary">{avgMood ?? "—"}</div>
          <div className="text-xs text-text-soft">Avg mood</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl mb-1">{trendIcon}</div>
          <div className="text-sm font-heading text-primary">{trendLabel}</div>
          <div className="text-xs text-text-soft">Recent trend</div>
        </div>
      </div>

      {/* Phase mood averages */}
      {Object.keys(phaseMoodAvg).length > 0 && (
        <section className="card">
          <h2 className="font-heading text-xl text-foreground mb-4">Mood by phase</h2>
          <div className="space-y-3">
            {phaseOrder
              .filter((p) => phaseMoodAvg[p] !== undefined)
              .map((phase) => {
                const avg = phaseMoodAvg[phase];
                const emojis = ["😢", "😕", "😐", "🙂", "😄"];
                const emojiIndex = Math.min(Math.floor(avg - 1), 4);
                return (
                  <div key={phase} className="flex items-center gap-3">
                    <span className="w-24 text-sm font-medium text-foreground">
                      {PHASE_LABELS[phase]}
                    </span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${(avg / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm w-12 text-right text-text-soft">
                      {avg.toFixed(1)}
                    </span>
                    <span className="text-lg">{emojis[emojiIndex]}</span>
                  </div>
                );
              })}
            {/* Also add any non-standard phases */}
            {Object.entries(phaseMoodAvg)
              .filter(([p]) => !phaseOrder.includes(p))
              .map(([phase, avg]) => {
                const emojis = ["😢", "😕", "😐", "🙂", "😄"];
                const emojiIndex = Math.min(Math.floor(avg - 1), 4);
                return (
                  <div key={phase} className="flex items-center gap-3">
                    <span className="w-24 text-sm font-medium text-foreground">
                      {PHASE_LABELS[phase] || phase}
                    </span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${(avg / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm w-12 text-right text-text-soft">
                      {avg.toFixed(1)}
                    </span>
                    <span className="text-lg">{emojis[emojiIndex]}</span>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* Recent entries timeline */}
      <section className="card">
        <h2 className="font-heading text-xl text-foreground mb-4">Recent check-ins</h2>
        <div className="space-y-3">
          {[...entries]
            .reverse()
            .slice(0, 10)
            .map((entry, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 border-b border-border pb-3 last:border-b-0"
              >
                <span className="text-xl">{entry.mood_emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary-dark">
                      {new Date(entry.entry_date + "T00:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {entry.phase && entry.phase !== "unknown" && (
                      <span className="text-[0.65rem] bg-primary-light text-primary-dark rounded-full px-2 py-0.5">
                        {PHASE_LABELS[entry.phase]}
                      </span>
                    )}
                    <span className="text-xs text-text-soft ml-auto">
                      {entry.mood_score}/5
                    </span>
                  </div>
                  {entry.entry_text && (
                    <p className="text-sm text-foreground mt-1">{entry.entry_text}</p>
                  )}
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}