import {
  format, addDays, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, getDay, isBefore, isAfter,
} from "date-fns";
import { fmt, todayStr, occursOn, isDoneOn, catOf } from "./App.jsx";

export const MOODS = [
  { id: "great", emoji: "😀", label: "Great" },
  { id: "okay", emoji: "😐", label: "Okay" },
  { id: "low", emoji: "😔", label: "Low" },
  { id: "frustrated", emoji: "😡", label: "Frustrated" },
  { id: "tired", emoji: "😴", label: "Tired" },
];

export const ENERGY_LEVELS = [
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

export const DISTRACTION_REASONS = ["Phone", "Social media", "Office", "Family", "Meeting", "Other"];

export function defaultDailyLog(date) {
  return {
    date,
    mood: null,
    energy: { morning: null, afternoon: null, night: null },
    distractions: [],
    pomodorosCompleted: 0,
    focusMinutes: 0,
    review: null, // { completed, productivity, moodNote, distractedBy, tomorrowPriorities, reviewedAt }
  };
}

export function getDailyLog(dailyLogs, date) {
  return dailyLogs[date] || defaultDailyLog(date);
}

/**
 * A 0-100 "productivity score" for one calendar day, blending how much of
 * that day's tasks got done (70%) with recorded focus time, capped at 2
 * hours (30%). Used by the heatmap and the weekly/monthly/yearly reviews.
 */
export function computeDayScore(dateStr, tasks, dailyLogs) {
  const dayTasks = tasks.filter((tk) => occursOn(tk, dateStr));
  const total = dayTasks.length;
  const done = dayTasks.filter((tk) => isDoneOn(tk, dateStr)).length;
  const completionPct = total ? (done / total) * 100 : 0;
  const focusMinutes = getDailyLog(dailyLogs, dateStr).focusMinutes || 0;
  const focusPct = Math.min(focusMinutes, 120) / 120 * 100;
  if (total === 0 && focusMinutes === 0) return 0;
  if (total === 0) return Math.round(focusPct);
  return Math.round(completionPct * 0.7 + focusPct * 0.3);
}

export function isProductiveDay(dateStr, tasks, dailyLogs) {
  const dayTasks = tasks.filter((tk) => occursOn(tk, dateStr));
  const done = dayTasks.some((tk) => isDoneOn(tk, dateStr));
  const focusMinutes = getDailyLog(dailyLogs, dateStr).focusMinutes || 0;
  return done || focusMinutes > 0;
}

/** Current streak (consecutive productive days ending today) and the
 * longest streak found in the lookback window. */
export function computeStreaks(tasks, dailyLogs, lookbackDays = 400) {
  let current = 0;
  let longest = 0;
  let running = 0;
  const today = todayStr();
  const days = [];
  for (let i = lookbackDays; i >= 0; i--) days.push(fmt(addDays(parseISO(today), -i)));

  for (const d of days) {
    if (isProductiveDay(d, tasks, dailyLogs)) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }
  // current streak = trailing run ending today
  for (let i = 0; i < days.length; i++) {
    const d = days[days.length - 1 - i];
    if (isProductiveDay(d, tasks, dailyLogs)) current += 1;
    else break;
  }
  return { current, longest };
}

export function weekDates(anchorDateStr, weekStartsMonday = true) {
  const wso = weekStartsMonday ? 1 : 0;
  const start = startOfWeek(parseISO(anchorDateStr), { weekStartsOn: wso });
  const end = endOfWeek(parseISO(anchorDateStr), { weekStartsOn: wso });
  return eachDayOfInterval({ start, end }).map(fmt);
}

export function computeWeeklyStats(anchorDateStr, tasks, dailyLogs, weekStartsMonday = true) {
  const days = weekDates(anchorDateStr, weekStartsMonday);
  let completed = 0, pending = 0, focusMinutes = 0;
  let best = { date: days[0], score: -1 };
  let worst = { date: days[0], score: 101 };
  const perDay = days.map((d) => {
    const dayTasks = tasks.filter((tk) => occursOn(tk, d));
    const done = dayTasks.filter((tk) => isDoneOn(tk, d));
    completed += done.length;
    pending += dayTasks.length - done.length;
    const log = getDailyLog(dailyLogs, d);
    focusMinutes += log.focusMinutes || 0;
    const score = computeDayScore(d, tasks, dailyLogs);
    if (score > best.score) best = { date: d, score };
    if (score < worst.score) worst = { date: d, score };
    return { date: d, completed: done.length, total: dayTasks.length, score };
  });

  const suggestions = [];
  const distractionCount = days.reduce((sum, d) => sum + (getDailyLog(dailyLogs, d).distractions?.length || 0), 0);
  if (distractionCount >= 5) suggestions.push("You logged several interruptions this week — consider a Focus Mode block for your hardest task each day.");
  if (worst.score < 30 && worst.score >= 0) suggestions.push(`${format(parseISO(worst.date), "EEEE")} was your toughest day — maybe lighten that day's load next week.`);
  if (pending > completed) suggestions.push("More tasks are pending than completed this week — try moving low-priority items out rather than letting them pile up.");
  if (focusMinutes < 60) suggestions.push("Very little focused time logged this week — try a couple of Pomodoro sessions on your top priority.");
  if (!suggestions.length) suggestions.push("Solid week — no red flags in the data.");

  return { days: perDay, completed, pending, focusMinutes, best, worst, suggestions };
}

export function computeMonthlyStats(monthCursorDate, tasks, dailyLogs, categories) {
  const start = startOfMonth(monthCursorDate);
  const end = endOfMonth(monthCursorDate);
  const days = eachDayOfInterval({ start, end }).map(fmt);

  const perDay = days.map((d) => ({ date: d, score: computeDayScore(d, tasks, dailyLogs), day: Number(format(parseISO(d), "d")) }));
  const avgProductivity = Math.round(perDay.reduce((s, d) => s + d.score, 0) / (perDay.length || 1));

  const byCategory = {};
  days.forEach((d) => {
    tasks.filter((tk) => occursOn(tk, d) && isDoneOn(tk, d)).forEach((tk) => {
      byCategory[tk.categoryId] = (byCategory[tk.categoryId] || 0) + 1;
    });
  });
  const categoryBreakdown = Object.entries(byCategory).map(([id, count]) => ({
    name: catOf(categories, id)?.name || "Uncategorized", value: count, color: catOf(categories, id)?.color || "#8B8F9C",
  })).sort((a, b) => b.value - a.value);

  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  days.forEach((d) => {
    const wd = getDay(parseISO(d)); // 0=Sun..6=Sat
    byWeekday[wd] += computeDayScore(d, tasks, dailyLogs);
    weekdayCounts[wd] += 1;
  });
  const weekdayAverages = byWeekday.map((sum, i) => ({
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i],
    avg: weekdayCounts[i] ? Math.round(sum / weekdayCounts[i]) : 0,
  }));
  const mostProductiveWeekday = [...weekdayAverages].sort((a, b) => b.avg - a.avg)[0];

  let longest = 0, running = 0;
  days.forEach((d) => {
    if (isProductiveDay(d, tasks, dailyLogs)) { running += 1; longest = Math.max(longest, running); }
    else running = 0;
  });

  const completedCount = days.reduce((sum, d) => sum + tasks.filter((tk) => occursOn(tk, d) && isDoneOn(tk, d)).length, 0);
  const totalCount = days.reduce((sum, d) => sum + tasks.filter((tk) => occursOn(tk, d)).length, 0);
  const completionPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  return { perDay, avgProductivity, categoryBreakdown, weekdayAverages, mostProductiveWeekday, longestStreak: longest, completionPct, completedCount, totalCount };
}

export function computeYearlyStats(year, tasks, dailyLogs, categories) {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const days = eachDayOfInterval({ start, end }).map(fmt).filter((d) => !isAfter(parseISO(d), parseISO(todayStr())));

  let tasksCompleted = 0, focusMinutes = 0, pomodoros = 0;
  const byCategory = {};
  days.forEach((d) => {
    const log = getDailyLog(dailyLogs, d);
    focusMinutes += log.focusMinutes || 0;
    pomodoros += log.pomodorosCompleted || 0;
    tasks.filter((tk) => occursOn(tk, d) && isDoneOn(tk, d)).forEach((tk) => {
      tasksCompleted += 1;
      byCategory[tk.categoryId] = (byCategory[tk.categoryId] || 0) + 1;
    });
  });

  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const { current, longest } = computeStreaks(tasks, dailyLogs, days.length + 5);

  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  days.forEach((d) => {
    const wd = getDay(parseISO(d));
    byWeekday[wd] += computeDayScore(d, tasks, dailyLogs);
    weekdayCounts[wd] += 1;
  });
  const weekdayAverages = byWeekday.map((sum, i) => ({
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i],
    avg: weekdayCounts[i] ? Math.round(sum / weekdayCounts[i]) : 0,
  }));
  const mostProductiveWeekday = [...weekdayAverages].sort((a, b) => b.avg - a.avg)[0];

  return {
    tasksCompleted, focusHours: Math.round((focusMinutes / 60) * 10) / 10, pomodoros,
    topCategoryName: topCategory ? (catOf(categories, topCategory[0])?.name || "Uncategorized") : "—",
    currentStreak: current, longestStreak: longest, mostProductiveWeekday,
  };
}
