import React from "react";
import { format, parseISO, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { ChevronLeft, ChevronRight, Sparkles, Flame, TrendingUp, Clock, Timer, Trophy } from "lucide-react";
import {
  getDailyLog, MOODS, computeWeeklyStats, computeMonthlyStats, computeYearlyStats, computeDayScore, weekDates,
} from "./dailyLog";
import { fmt, todayStr } from "./App.jsx";

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function StatCard({ t, icon, label, value, sub }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <div className="flex items-center gap-1.5" style={{ color: t.inkFaint }}>{icon}<span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span></div>
      <span style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 500, color: t.ink }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: t.inkFaint }}>{sub}</span>}
    </div>
  );
}

/* ------------------------------------ HEATMAP ------------------------------- */

export function Heatmap({ t, year, tasks, dailyLogs }) {
  const start = new Date(year, 0, 1);
  const endCap = new Date(year, 11, 31);
  const end = endCap > new Date() && year === new Date().getFullYear() ? new Date() : endCap;
  const firstSunday = startOfWeek(start, { weekStartsOn: 0 });
  const lastSaturday = endOfWeek(end, { weekStartsOn: 0 });
  const allDays = eachDayOfInterval({ start: firstSunday, end: lastSaturday });
  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7));

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]" style={{ width: "max-content" }}>
        {weeks.map((week, wi) => {
          const showLabel = week[0].getDate() <= 7 && week[0].getMonth() !== (weeks[wi - 1]?.[0]?.getMonth());
          return (
            <div key={wi} className="flex flex-col gap-[3px]">
              <div style={{ height: 12, fontSize: 9, color: t.inkFaint, fontFamily: "IBM Plex Mono, monospace" }}>
                {showLabel ? format(week[0], "MMM") : ""}
              </div>
              {week.map((d) => {
                const ds = fmt(d);
                const inYear = d.getFullYear() === year && d <= end;
                const score = inYear ? computeDayScore(ds, tasks, dailyLogs) : null;
                const bg = score === null ? "transparent" : score === 0 ? t.surfaceAlt : hexToRgba(t.accent, 0.15 + (Math.min(score, 100) / 100) * 0.8);
                return (
                  <div key={ds} title={inYear ? `${format(d, "MMM d, yyyy")} — score ${score}` : ""}
                    style={{ width: 11, height: 11, borderRadius: 2, background: bg }} />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------- DAILY REVIEW ----------------------------- */

export function DailyReviewView({ t, selectedDate, setSelectedDate, dailyLogs, onUpdateReview }) {
  const dateObj = parseISO(selectedDate);
  const log = getDailyLog(dailyLogs, selectedDate);
  const review = log.review || { completed: null, productivity: null, distractedBy: "", tomorrowPriorities: "" };
  const mood = MOODS.find((m) => m.id === log.mood);

  const set = (patch) => onUpdateReview(selectedDate, { ...review, ...patch, reviewedAt: new Date().toISOString() });

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => setSelectedDate(fmt(addDays(dateObj, -1)))} className="p-1 rounded" style={{ color: t.inkFaint }}><ChevronLeft size={16} /></button>
        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: t.inkFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>Daily review</span>
        <button onClick={() => setSelectedDate(fmt(addDays(dateObj, 1)))} className="p-1 rounded" style={{ color: t.inkFaint }}><ChevronRight size={16} /></button>
      </div>
      <h1 className="mb-5" style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 500 }}>{format(dateObj, "EEEE, MMM d")}</h1>

      <div className="flex flex-col gap-4 max-w-lg">
        <div className="rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 12, color: t.inkMuted, marginBottom: 8 }}>Did you complete today's planned work?</div>
          <div className="flex gap-2">
            {["yes", "partial", "no"].map((v) => (
              <button key={v} onClick={() => set({ completed: v })} className="flex-1 text-xs py-2 rounded-lg font-medium capitalize"
                style={{ background: review.completed === v ? t.accent : t.surfaceAlt, color: review.completed === v ? t.accentInk : t.inkMuted }}>
                {v === "partial" ? "Partially" : v}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 12, color: t.inkMuted, marginBottom: 8 }}>How productive were you? (1–5)</div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => set({ productivity: n })}
                className="flex-1 py-2 rounded-lg text-sm font-medium"
                style={{ background: review.productivity === n ? t.accent : t.surfaceAlt, color: review.productivity === n ? t.accentInk : t.inkMuted }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 12, color: t.inkMuted, marginBottom: 6 }}>Mood</div>
          {mood ? (
            <span className="text-sm" style={{ color: t.ink }}>{mood.emoji} {mood.label}</span>
          ) : (
            <span className="text-xs" style={{ color: t.inkFaint }}>Not set — log it from the Planner view's Mood & Energy card.</span>
          )}
        </div>

        {log.distractions?.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 12, color: t.inkMuted, marginBottom: 6 }}>Logged interruptions</div>
            <div className="flex flex-col gap-1">
              {log.distractions.map((d) => (
                <div key={d.id} className="flex items-center gap-2 text-xs" style={{ color: t.inkFaint }}>
                  <span style={{ fontFamily: "IBM Plex Mono, monospace" }}>{format(parseISO(d.time), "HH:mm")}</span>
                  <span>{d.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 12, color: t.inkMuted, marginBottom: 6 }}>What distracted you?</div>
          <textarea value={review.distractedBy} onChange={(e) => set({ distractedBy: e.target.value })} rows={2}
            className="w-full text-sm outline-none rounded-lg p-2 resize-none" style={{ background: t.surfaceAlt, color: t.ink }} />
        </div>

        <div className="rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 12, color: t.inkMuted, marginBottom: 6 }}>Tomorrow's priorities</div>
          <textarea value={review.tomorrowPriorities} onChange={(e) => set({ tomorrowPriorities: e.target.value })} rows={3}
            className="w-full text-sm outline-none rounded-lg p-2 resize-none" style={{ background: t.surfaceAlt, color: t.ink }} />
        </div>

        {review.reviewedAt && (
          <span style={{ fontSize: 11, color: t.inkFaint }}>Saved · {format(parseISO(review.reviewedAt), "MMM d, HH:mm")}</span>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- WEEKLY REVIEW ---------------------------- */

export function WeeklyReviewView({ t, anchorDate, setAnchorDate, weekStartsMonday, tasks, dailyLogs }) {
  const stats = computeWeeklyStats(anchorDate, tasks, dailyLogs, weekStartsMonday);
  const days = weekDates(anchorDate, weekStartsMonday);
  const rangeLabel = `${format(parseISO(days[0]), "MMM d")} – ${format(parseISO(days[6]), "MMM d, yyyy")}`;
  const maxScore = Math.max(1, ...stats.days.map((d) => d.score));

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => setAnchorDate(fmt(addDays(parseISO(anchorDate), -7)))} className="p-1 rounded" style={{ color: t.inkFaint }}><ChevronLeft size={16} /></button>
        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: t.inkFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>Weekly review</span>
        <button onClick={() => setAnchorDate(fmt(addDays(parseISO(anchorDate), 7)))} className="p-1 rounded" style={{ color: t.inkFaint }}><ChevronRight size={16} /></button>
      </div>
      <h1 className="mb-5" style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 500 }}>{rangeLabel}</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <StatCard t={t} icon={<TrendingUp size={13} />} label="Completed" value={stats.completed} />
        <StatCard t={t} icon={<Clock size={13} />} label="Hours worked" value={(stats.focusMinutes / 60).toFixed(1)} />
        <StatCard t={t} icon={<Sparkles size={13} />} label="Pending" value={stats.pending} />
      </div>

      <div className="rounded-xl p-4 mb-5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 11, color: t.inkFaint, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>Day by day</div>
        <div className="flex items-end gap-2" style={{ height: 90 }}>
          {stats.days.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full rounded-md" style={{ height: `${Math.max(4, (d.score / maxScore) * 70)}px`, background: t.accent, opacity: 0.25 + (d.score / 100) * 0.75 }} />
              <span style={{ fontSize: 10, color: t.inkFaint }}>{format(parseISO(d.date), "EEE")}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 11, color: t.inkFaint }}>Best day</div>
          <div style={{ fontSize: 14, color: t.ink, fontWeight: 500 }}>{format(parseISO(stats.best.date), "EEEE")} · {stats.best.score}</div>
        </div>
        <div className="rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 11, color: t.inkFaint }}>Toughest day</div>
          <div style={{ fontSize: 14, color: t.ink, fontWeight: 500 }}>{format(parseISO(stats.worst.date), "EEEE")} · {stats.worst.score}</div>
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: t.accentSoft, border: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 11, color: t.accent, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>Suggestions</div>
        <ul className="flex flex-col gap-1.5">
          {stats.suggestions.map((s, i) => <li key={i} style={{ fontSize: 13, color: t.ink }}>· {s}</li>)}
        </ul>
      </div>
    </div>
  );
}

/* --------------------------------- MONTHLY REVIEW --------------------------- */

export function MonthlyReviewView({ t, monthCursor, setMonthCursor, tasks, dailyLogs, categories }) {
  const stats = computeMonthlyStats(monthCursor, tasks, dailyLogs, categories);
  const maxCatValue = Math.max(1, ...stats.categoryBreakdown.map((c) => c.value));
  const maxWeekdayAvg = Math.max(1, ...stats.weekdayAverages.map((w) => w.avg));

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))} className="p-1 rounded" style={{ color: t.inkFaint }}><ChevronLeft size={16} /></button>
        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: t.inkFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>Monthly review</span>
        <button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))} className="p-1 rounded" style={{ color: t.inkFaint }}><ChevronRight size={16} /></button>
      </div>
      <h1 className="mb-5" style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 500 }}>{format(monthCursor, "MMMM yyyy")}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard t={t} icon={<TrendingUp size={13} />} label="Completion" value={`${stats.completionPct}%`} />
        <StatCard t={t} icon={<Sparkles size={13} />} label="Avg productivity" value={stats.avgProductivity} />
        <StatCard t={t} icon={<Flame size={13} />} label="Longest streak" value={`${stats.longestStreak}d`} />
        <StatCard t={t} icon={<Trophy size={13} />} label="Best weekday" value={stats.mostProductiveWeekday?.weekday || "—"} />
      </div>

      <div className="rounded-xl p-4 mb-5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 11, color: t.inkFaint, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>Daily score</div>
        <div className="flex items-end gap-[2px]" style={{ height: 70 }}>
          {stats.perDay.map((d) => (
            <div key={d.date} className="flex-1 rounded-sm" title={`${d.day}: ${d.score}`}
              style={{ height: `${Math.max(3, d.score * 0.7)}px`, background: t.accent, opacity: 0.25 + (d.score / 100) * 0.75 }} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 11, color: t.inkFaint, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>By category</div>
          <div className="flex flex-col gap-2">
            {stats.categoryBreakdown.length === 0 && <span style={{ fontSize: 12, color: t.inkFaint }}>No completed tasks this month yet.</span>}
            {stats.categoryBreakdown.map((c) => (
              <div key={c.name} className="flex items-center gap-2">
                <span className="text-xs w-20 truncate" style={{ color: t.inkMuted }}>{c.name}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: t.surfaceAlt }}>
                  <div className="h-full rounded-full" style={{ width: `${(c.value / maxCatValue) * 100}%`, background: c.color }} />
                </div>
                <span className="text-xs" style={{ color: t.inkFaint, fontFamily: "IBM Plex Mono, monospace" }}>{c.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 11, color: t.inkFaint, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>By weekday</div>
          <div className="flex flex-col gap-2">
            {stats.weekdayAverages.map((w) => (
              <div key={w.weekday} className="flex items-center gap-2">
                <span className="text-xs w-8" style={{ color: t.inkMuted }}>{w.weekday}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: t.surfaceAlt }}>
                  <div className="h-full rounded-full" style={{ width: `${(w.avg / maxWeekdayAvg) * 100}%`, background: t.accent }} />
                </div>
                <span className="text-xs" style={{ color: t.inkFaint, fontFamily: "IBM Plex Mono, monospace" }}>{w.avg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- YEAR REVIEW ----------------------------- */

export function YearReviewView({ t, year, setYear, tasks, dailyLogs, categories }) {
  const stats = computeYearlyStats(year, tasks, dailyLogs, categories);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => setYear(year - 1)} className="p-1 rounded" style={{ color: t.inkFaint }}><ChevronLeft size={16} /></button>
        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: t.inkFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>Year in review</span>
        <button onClick={() => setYear(year + 1)} className="p-1 rounded" style={{ color: t.inkFaint }}><ChevronRight size={16} /></button>
      </div>
      <h1 className="mb-5" style={{ fontFamily: "Fraunces, serif", fontSize: 30, fontWeight: 500 }}>{year} wrapped</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard t={t} icon={<TrendingUp size={13} />} label="Tasks completed" value={stats.tasksCompleted.toLocaleString()} />
        <StatCard t={t} icon={<Clock size={13} />} label="Hours worked" value={stats.focusHours} />
        <StatCard t={t} icon={<Timer size={13} />} label="Pomodoros" value={stats.pomodoros} />
        <StatCard t={t} icon={<Trophy size={13} />} label="Top category" value={stats.topCategoryName} />
        <StatCard t={t} icon={<Flame size={13} />} label="Longest streak" value={`${stats.longestStreak} days`} />
        <StatCard t={t} icon={<Sparkles size={13} />} label="Current streak" value={`${stats.currentStreak} days`} />
        <StatCard t={t} icon={<Trophy size={13} />} label="Best weekday" value={stats.mostProductiveWeekday?.weekday || "—"} />
      </div>

      <div className="rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 11, color: t.inkFaint, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>{year} heatmap</div>
        <Heatmap t={t} year={year} tasks={tasks} dailyLogs={dailyLogs} />
      </div>
    </div>
  );
}
