import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Search, Sun, Moon, X, Check,
  Tag as TagIcon, ListTodo, Clock, Repeat, Trash2, Pencil,
  PanelLeftClose, PanelLeftOpen, CheckCircle2, AlertCircle,
  CalendarDays, Star, Pin, Copy, Archive, ChevronDown, Menu, Inbox,
  Download, Upload, Settings as SettingsIcon, LogOut, CloudOff
} from "lucide-react";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek,
  endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, addDays,
  parseISO, differenceInCalendarDays, differenceInCalendarWeeks,
  differenceInCalendarMonths, getDay, getDate as getDateOfMonth, isToday as dfIsToday, isBefore
} from "date-fns";
import { supabase } from "./supabaseClient";

/* ---------------------------------- THEME ---------------------------------- */

const THEME = {
  light: {
    canvas: "#F1F2F6", surface: "#FFFFFF", surfaceAlt: "#F7F8FA",
    border: "#E3E5EC", borderStrong: "#D2D5DF",
    ink: "#14161C", inkMuted: "#6B7080", inkFaint: "#9498A6",
    accent: "#3730A3", accentSoft: "#EEF0FB", accentInk: "#FFFFFF",
    danger: "#DC4C4C", dangerSoft: "#FBEAEA",
    shadow: "0 1px 2px rgba(20,22,28,0.04), 0 8px 24px rgba(20,22,28,0.06)",
  },
  dark: {
    canvas: "#101114", surface: "#1A1C21", surfaceAlt: "#202329",
    border: "#2A2D34", borderStrong: "#383C46",
    ink: "#EDEEF2", inkMuted: "#9296A3", inkFaint: "#6E7280",
    accent: "#8B87F0", accentSoft: "#23223A", accentInk: "#101114",
    danger: "#E37272", dangerSoft: "#2E1F22",
    shadow: "0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.35)",
  },
};

const PRIORITIES = [
  { id: "critical", label: "Critical", color: "#DC4C4C" },
  { id: "high", label: "High", color: "#E08A3C" },
  { id: "medium", label: "Medium", color: "#3B82C4" },
  { id: "low", label: "Low", color: "#8B8F9C" },
];
const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
const priorityOf = (id) => PRIORITIES.find((p) => p.id === id) || PRIORITIES[2];

const DEFAULT_CATEGORIES = [
  { id: "work", name: "Work", color: "#3B82C4" },
  { id: "personal", name: "Personal", color: "#8B87F0" },
  { id: "fitness", name: "Fitness", color: "#4CAF7D" },
  { id: "study", name: "Study", color: "#E08A3C" },
  { id: "errands", name: "Errands", color: "#C8862E" },
];
const catOf = (cats, id) => cats.find((c) => c.id === id) || null;

const REPEAT_OPTIONS = [
  { id: "none", label: "Does not repeat" },
  { id: "daily", label: "Daily" },
  { id: "weekdays", label: "Every weekday" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
  { id: "custom", label: "Custom interval (days)" },
];

const SWATCHES = ["#3B82C4", "#8B87F0", "#4CAF7D", "#E08A3C", "#DC4C4C", "#C8862E", "#2FA9A1", "#B25FCF"];

const uid = () => Math.random().toString(36).slice(2, 10);
const todayStr = () => format(new Date(), "yyyy-MM-dd");
const fmt = (d) => format(d, "yyyy-MM-dd");

/* ------------------------------- PERSISTENCE ------------------------------- */

const STORAGE_KEY = "planner.app.v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Could not read saved planner data:", e);
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Could not save planner data:", e);
  }
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function csvEscape(v) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

/* ------------------------------- SEED DATA -------------------------------- */

function seedTasks() {
  const t = todayStr();
  const tomorrow = fmt(addDays(new Date(), 1));
  const yesterday = fmt(addDays(new Date(), -1));
  const mk = (over) => ({
    id: uid(), title: "", description: "", notes: "", dueDate: t, dueTime: "",
    createdAt: t, completedAt: null, priority: "medium", status: "active",
    categoryId: "personal", tags: [], estimatedDuration: null, actualDuration: null,
    color: null, reminder: null, repeat: null, completedDates: [], subtasks: [],
    pinned: false, favorite: false, order: 0, ...over,
  });
  return [
    mk({ title: "Exercise", categoryId: "fitness", priority: "high", order: 0,
      repeat: { freq: "daily", interval: 1, until: null }, dueDate: yesterday, tags: ["health"] }),
    mk({ title: "Read 30 pages", categoryId: "personal", priority: "low", order: 1,
      repeat: { freq: "daily", interval: 1, until: null }, dueDate: yesterday, tags: ["reading"] }),
    mk({ title: "Complete SAP Project", categoryId: "work", priority: "critical", order: 2,
      dueDate: t, dueTime: "18:00", estimatedDuration: 120, tags: ["sap", "office"],
      subtasks: [
        { id: uid(), title: "Build UI", done: true },
        { id: uid(), title: "Test API", done: false },
        { id: uid(), title: "Deploy", done: false },
      ] }),
    mk({ title: "Practice CAT QA", categoryId: "study", priority: "high", order: 3,
      dueDate: t, estimatedDuration: 60, tags: ["cat"] }),
    mk({ title: "Grocery shopping", categoryId: "errands", priority: "low", order: 4, dueDate: t }),
    mk({ title: "Plan next week", categoryId: "work", priority: "medium", order: 0, dueDate: tomorrow }),
    mk({ title: "Salary reminder", categoryId: "personal", priority: "medium", order: 1,
      repeat: { freq: "monthly", interval: 1, until: null }, dueDate: t }),
  ];
}

/* ---------------------------- RECURRENCE HELPERS --------------------------- */

function matchesRepeat(task, dateStr) {
  const due = parseISO(task.dueDate);
  const d = parseISO(dateStr);
  if (isBefore(d, due)) return false;
  const rep = task.repeat;
  if (rep.until && isBefore(parseISO(rep.until), d)) return false;
  switch (rep.freq) {
    case "daily": return true;
    case "weekdays": { const day = getDay(d); return day >= 1 && day <= 5; }
    case "weekly":
      return getDay(d) === getDay(due) &&
        differenceInCalendarWeeks(d, due, { weekStartsOn: 1 }) % (rep.interval || 1) === 0;
    case "monthly":
      return getDateOfMonth(d) === getDateOfMonth(due) &&
        differenceInCalendarMonths(d, due) % (rep.interval || 1) === 0;
    case "yearly":
      return format(d, "MM-dd") === format(due, "MM-dd");
    case "custom":
      return differenceInCalendarDays(d, due) % Math.max(1, rep.interval || 1) === 0;
    default: return false;
  }
}

function occursOn(task, dateStr) {
  if (task.status === "archived") return false;
  return task.repeat ? matchesRepeat(task, dateStr) : task.dueDate === dateStr;
}

function isDoneOn(task, dateStr) {
  return task.repeat ? (task.completedDates || []).includes(dateStr) : task.status === "completed";
}

function repeatLabel(rep) {
  if (!rep) return null;
  switch (rep.freq) {
    case "daily": return "Daily";
    case "weekdays": return "Weekdays";
    case "weekly": return rep.interval > 1 ? `Every ${rep.interval} wks` : "Weekly";
    case "monthly": return rep.interval > 1 ? `Every ${rep.interval} mo` : "Monthly";
    case "yearly": return "Yearly";
    case "custom": return `Every ${rep.interval}d`;
    default: return null;
  }
}

/* --------------------------------- APP ------------------------------------ */

export default function PlannerApp({ user }) {
  const [mode, setMode] = useState("dark");
  const t = THEME[mode];

  useEffect(() => {
    const id = "planner-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id; link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [weekStartsMonday, setWeekStartsMonday] = useState(true);
  const [cloudStatus, setCloudStatus] = useState("loading"); // loading | synced | saving | offline
  const hasLoadedRef = useRef(false);
  const importInputRef = useRef(null);

  // On login, paint instantly from the local cache (if any), then reconcile
  // with the cloud copy in Supabase so the same account sees the same data
  // on any device.
  useEffect(() => {
    let cancelled = false;
    hasLoadedRef.current = false;

    const cached = loadState();
    if (cached) {
      setTasks(cached.tasks || seedTasks());
      setCategories(cached.categories || DEFAULT_CATEGORIES);
      setMode(cached.mode || "dark");
      setWeekStartsMonday(cached.weekStartsMonday ?? true);
    }

    if (user.isLocalOnly || !supabase) {
      if (!cached) setTasks(seedTasks());
      setCloudStatus("local");
      hasLoadedRef.current = true;
      return () => { cancelled = true; };
    }

    (async () => {
      const { data, error } = await supabase
        .from("app_state")
        .select("state")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.warn("Could not load cloud data, using local cache:", error.message);
        setCloudStatus("offline");
      } else if (data?.state) {
        const s = data.state;
        setTasks(s.tasks || []);
        setCategories(s.categories || DEFAULT_CATEGORIES);
        setMode(s.mode || "dark");
        setWeekStartsMonday(s.weekStartsMonday ?? true);
        setCloudStatus("synced");
      } else if (!cached) {
        // Brand-new account with nothing saved yet — start from sample data.
        setTasks(seedTasks());
        setCloudStatus("synced");
      } else {
        setCloudStatus("synced");
      }
      hasLoadedRef.current = true;
    })();

    return () => { cancelled = true; };
  }, [user.id]);

  // Save every change: instantly to the local cache, and (debounced) to
  // Supabase so it's available on other devices/browsers too.
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    saveState({ tasks, categories, mode, weekStartsMonday });
    if (user.isLocalOnly || !supabase) {
      setCloudStatus("local");
      return;
    }
    setCloudStatus("saving");
    const handle = setTimeout(async () => {
      const { error } = await supabase.from("app_state").upsert({
        user_id: user.id,
        state: { tasks, categories, mode, weekStartsMonday },
        updated_at: new Date().toISOString(),
      });
      setCloudStatus(error ? "offline" : "synced");
      if (error) console.warn("Cloud save failed, kept locally:", error.message);
    }, 800);
    return () => clearTimeout(handle);
  }, [tasks, categories, mode, weekStartsMonday, user.id]);

  function exportJSON() {
    downloadFile(
      `planner-backup-${todayStr()}.json`,
      JSON.stringify({ tasks, categories, exportedAt: new Date().toISOString() }, null, 2),
      "application/json"
    );
  }
  function exportCSV() {
    const header = ["Title", "Description", "Notes", "Due Date", "Due Time", "Priority", "Category", "Tags", "Status", "Repeat", "Completed At"];
    const rows = tasks.map((tk) => [
      tk.title, tk.description || "", tk.notes || "", tk.dueDate, tk.dueTime || "",
      tk.priority, catOf(categories, tk.categoryId)?.name || "", (tk.tags || []).join("|"),
      tk.status, repeatLabel(tk.repeat) || "", tk.completedAt || "",
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    downloadFile(`planner-export-${todayStr()}.csv`, csv, "text/csv");
  }
  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data.tasks)) setTasks(data.tasks);
        if (Array.isArray(data.categories)) setCategories(data.categories);
      } catch (err) {
        alert("That file couldn't be read as a planner backup.");
      }
    };
    reader.readAsText(file);
  }

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [monthCursor, setMonthCursor] = useState(startOfMonth(new Date()));
  const [mainView, setMainView] = useState("day"); // day | month | upcoming | overdue | completed
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [tagFilter, setTagFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | completed
  const [sortBy, setSortBy] = useState("priority"); // priority | time | alpha | manual | created
  const [modalTask, setModalTask] = useState(null); // task being edited/created, or null
  const [modalDate, setModalDate] = useState(null);
  const [dragTaskId, setDragTaskId] = useState(null);
  const searchRef = useRef(null);

  /* --------------------------- keyboard shortcuts --------------------------- */
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;
      if (e.key === "Escape") { setModalTask(null); setModalDate(null); return; }
      if (typing) return;
      if (e.key === "/" ) { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "n" || e.key === "N") { e.preventDefault(); openNewTask(selectedDate); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedDate]);

  /* -------------------------------- helpers --------------------------------- */

  const allTags = useMemo(() => {
    const s = new Set();
    tasks.forEach((tk) => (tk.tags || []).forEach((tg) => s.add(tg)));
    return [...s].sort();
  }, [tasks]);

  const tasksForDate = useCallback(
    (dateStr) => tasks.filter((tk) => occursOn(tk, dateStr)),
    [tasks]
  );

  function applyFilters(list) {
    let out = list;
    if (categoryFilter) out = out.filter((tk) => tk.categoryId === categoryFilter);
    if (tagFilter) out = out.filter((tk) => (tk.tags || []).includes(tagFilter));
    return out;
  }

  function sortList(list, dateStr) {
    const arr = [...list];
    arr.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      switch (sortBy) {
        case "priority": return priorityRank[a.priority] - priorityRank[b.priority];
        case "time": return (a.dueTime || "99:99").localeCompare(b.dueTime || "99:99");
        case "alpha": return a.title.localeCompare(b.title);
        case "created": return a.createdAt.localeCompare(b.createdAt);
        case "manual": default: return (a.order || 0) - (b.order || 0);
      }
    });
    return arr;
  }

  function toggleDone(task, dateStr) {
    setTasks((prev) => prev.map((tk) => {
      if (tk.id !== task.id) return tk;
      if (tk.repeat) {
        const set = new Set(tk.completedDates || []);
        set.has(dateStr) ? set.delete(dateStr) : set.add(dateStr);
        return { ...tk, completedDates: [...set] };
      }
      const willComplete = tk.status !== "completed";
      return { ...tk, status: willComplete ? "completed" : "active", completedAt: willComplete ? dateStr : null };
    }));
  }

  function saveTask(taskDraft) {
    setTasks((prev) => {
      const exists = prev.some((tk) => tk.id === taskDraft.id);
      if (exists) return prev.map((tk) => (tk.id === taskDraft.id ? taskDraft : tk));
      return [...prev, taskDraft];
    });
    setModalTask(null); setModalDate(null);
  }
  function deleteTask(id) { setTasks((prev) => prev.filter((tk) => tk.id !== id)); setModalTask(null); }
  function duplicateTask(task) {
    setTasks((prev) => [...prev, { ...task, id: uid(), title: task.title + " (copy)", createdAt: todayStr(), status: "active", completedAt: null, completedDates: [] }]);
  }
  function togglePin(task) { setTasks((prev) => prev.map((tk) => (tk.id === task.id ? { ...tk, pinned: !tk.pinned } : tk))); }
  function toggleFavorite(task) { setTasks((prev) => prev.map((tk) => (tk.id === task.id ? { ...tk, favorite: !tk.favorite } : tk))); }
  function archiveTask(task) { setTasks((prev) => prev.map((tk) => (tk.id === task.id ? { ...tk, status: "archived" } : tk))); }
  function moveTaskToDate(id, dateStr) { setTasks((prev) => prev.map((tk) => (tk.id === id ? { ...tk, dueDate: dateStr } : tk))); }

  function openNewTask(dateStr) {
    setModalDate(dateStr);
    setModalTask({
      id: uid(), title: "", description: "", notes: "", dueDate: dateStr, dueTime: "",
      createdAt: todayStr(), completedAt: null, priority: "medium", status: "active",
      categoryId: categories[0]?.id || "personal", tags: [], estimatedDuration: null,
      actualDuration: null, color: null, reminder: null, repeat: null, completedDates: [],
      subtasks: [], pinned: false, favorite: false, order: tasksForDate(dateStr).length,
    });
  }
  function openEditTask(task) { setModalTask(task); setModalDate(task.dueDate); }

  /* ---------------------------- derived view lists --------------------------- */

  const dayList = useMemo(() => sortList(applyFilters(tasksForDate(selectedDate)), selectedDate), [tasks, selectedDate, categoryFilter, tagFilter, sortBy]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return tasks.filter((tk) => tk.status !== "archived" && (
      tk.title.toLowerCase().includes(q) ||
      (tk.description || "").toLowerCase().includes(q) ||
      (tk.notes || "").toLowerCase().includes(q) ||
      (tk.tags || []).some((tg) => tg.toLowerCase().includes(q)) ||
      (catOf(categories, tk.categoryId)?.name || "").toLowerCase().includes(q) ||
      tk.priority.includes(q)
    ));
  }, [search, tasks, categories]);

  const upcomingList = useMemo(() => {
    const days = [...Array(7)].map((_, i) => fmt(addDays(new Date(), i)));
    const out = [];
    days.forEach((d) => tasksForDate(d).forEach((tk) => { if (!isDoneOn(tk, d)) out.push({ ...tk, __date: d }); }));
    return applyFilters(out);
  }, [tasks, categoryFilter, tagFilter]);

  const overdueList = useMemo(() => {
    const out = [];
    const start = fmt(addDays(new Date(), -60));
    let d = parseISO(start);
    while (d < parseISO(todayStr())) {
      const ds = fmt(d);
      tasksForDate(ds).forEach((tk) => { if (!isDoneOn(tk, ds)) out.push({ ...tk, __date: ds }); });
      d = addDays(d, 1);
    }
    // dedupe non-recurring tasks (they'd only ever match one date anyway)
    return applyFilters(out);
  }, [tasks, categoryFilter, tagFilter]);

  const completedList = useMemo(() => {
    const out = [];
    tasks.forEach((tk) => {
      if (tk.status === "archived") return;
      if (tk.repeat) (tk.completedDates || []).forEach((d) => out.push({ ...tk, __date: d }));
      else if (tk.status === "completed") out.push({ ...tk, __date: tk.completedAt || tk.dueDate });
    });
    out.sort((a, b) => b.__date.localeCompare(a.__date));
    return applyFilters(out);
  }, [tasks, categoryFilter, tagFilter]);

  const dayProgress = useMemo(() => {
    const total = dayList.length;
    const done = dayList.filter((tk) => isDoneOn(tk, selectedDate)).length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [dayList, selectedDate]);

  /* ---------------------------------- render --------------------------------- */

  const page = {
    minHeight: "100vh", background: t.canvas, color: t.ink,
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", transition: "background .25s ease, color .25s ease",
  };

  return (
    <div style={page} className="flex w-full">
      {/* mobile overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileSidebarOpen(false)}
          style={{ background: "rgba(0,0,0,0.4)" }} />
      )}

      <Sidebar
        t={t} mode={mode} setMode={setMode}
        open={sidebarOpen} setOpen={setSidebarOpen}
        mobileOpen={mobileSidebarOpen} setMobileOpen={setMobileSidebarOpen}
        selectedDate={selectedDate} setSelectedDate={setSelectedDate}
        monthCursor={monthCursor} setMonthCursor={setMonthCursor}
        mainView={mainView} setMainView={setMainView}
        categories={categories} setCategories={setCategories}
        categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
        allTags={allTags} tagFilter={tagFilter} setTagFilter={setTagFilter}
        tasks={tasks} weekStartsMonday={weekStartsMonday} setWeekStartsMonday={setWeekStartsMonday}
        onExportJSON={exportJSON} onExportCSV={exportCSV}
        onImportClick={() => importInputRef.current?.click()}
        cloudStatus={cloudStatus} userEmail={user.email}
      />
      <input ref={importInputRef} type="file" accept="application/json" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) importJSON(f); e.target.value = ""; }} />

      <main className="flex-1 min-w-0 flex flex-col">
        {/* top bar */}
        <div className="flex items-center gap-3 px-4 md:px-8 pt-5 pb-3 sticky top-0 z-20"
          style={{ background: t.canvas }}>
          <button className="md:hidden p-2 rounded-xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}
            onClick={() => setMobileSidebarOpen(true)}><Menu size={18} color={t.ink} /></button>
          <button className="hidden md:flex p-2 rounded-xl items-center justify-center" style={{ background: t.surface, border: `1px solid ${t.border}` }}
            onClick={() => setSidebarOpen((v) => !v)} title="Toggle sidebar">
            {sidebarOpen ? <PanelLeftClose size={16} color={t.inkMuted} /> : <PanelLeftOpen size={16} color={t.inkMuted} />}
          </button>

          <div className="flex items-center rounded-xl px-3 py-2 flex-1 max-w-md" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <Search size={15} color={t.inkFaint} />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks · press /" className="bg-transparent outline-none flex-1 ml-2 text-sm"
              style={{ color: t.ink }} />
            {search && <X size={14} className="cursor-pointer" color={t.inkFaint} onClick={() => setSearch("")} />}
          </div>

          <div className="hidden sm:flex items-center rounded-xl p-1 gap-1" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <ViewTab t={t} active={mainView === "day"} onClick={() => setMainView("day")}>Planner</ViewTab>
            <ViewTab t={t} active={mainView === "month"} onClick={() => setMainView("month")}>Month</ViewTab>
          </div>

          <button onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}
            className="p-2 rounded-xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            {mode === "light" ? <Moon size={16} color={t.ink} /> : <Sun size={16} color={t.ink} />}
          </button>

          <button onClick={() => openNewTask(mainView === "month" ? fmt(monthCursor) : selectedDate)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium"
            style={{ background: t.accent, color: t.accentInk }}>
            <Plus size={15} /> <span className="hidden sm:inline">New task</span>
          </button>
        </div>

        <div className="px-4 md:px-8 pb-16 flex-1">
          {search.trim() ? (
            <ResultsList t={t} title={`Search results for “${search}”`} icon={<Search size={16} />}
              items={searchResults.map((tk) => ({ task: tk, date: tk.dueDate }))}
              categories={categories} onToggle={(tk, d) => toggleDone(tk, d)} onEdit={openEditTask} empty="No tasks match your search." />
          ) : mainView === "month" ? (
            <MonthView t={t} monthCursor={monthCursor} setMonthCursor={setMonthCursor}
              selectedDate={selectedDate} weekStartsMonday={weekStartsMonday}
              onSelectDate={(d) => { setSelectedDate(d); setMainView("day"); }}
              tasksForDate={tasksForDate} categories={categories}
              onDropTask={(dateStr) => { if (dragTaskId) { moveTaskToDate(dragTaskId, dateStr); setDragTaskId(null); } }}
              setDragTaskId={setDragTaskId} />
          ) : mainView === "upcoming" ? (
            <ResultsList t={t} title="Upcoming (next 7 days)" icon={<CalendarDays size={16} />}
              items={upcomingList.map((tk) => ({ task: tk, date: tk.__date }))}
              categories={categories} onToggle={toggleDone} onEdit={openEditTask} empty="Nothing coming up. Enjoy the calm." />
          ) : mainView === "overdue" ? (
            <ResultsList t={t} title="Overdue" icon={<AlertCircle size={16} />}
              items={overdueList.map((tk) => ({ task: tk, date: tk.__date }))}
              categories={categories} onToggle={toggleDone} onEdit={openEditTask} empty="Nothing overdue — you're caught up." />
          ) : mainView === "completed" ? (
            <ResultsList t={t} title="Completed" icon={<CheckCircle2 size={16} />}
              items={completedList.map((tk) => ({ task: tk, date: tk.__date }))}
              categories={categories} onToggle={toggleDone} onEdit={openEditTask} empty="Nothing completed yet." showDate />
          ) : (
            <DayPlanner
              t={t} selectedDate={selectedDate} setSelectedDate={setSelectedDate}
              dayList={dayList} progress={dayProgress}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              sortBy={sortBy} setSortBy={setSortBy}
              categories={categories}
              onToggle={(tk) => toggleDone(tk, selectedDate)}
              onEdit={openEditTask}
              onDuplicate={duplicateTask}
              onDelete={(id) => setTasks((prev) => prev.filter((x) => x.id !== id))}
              onPin={togglePin} onFavorite={toggleFavorite} onArchive={archiveTask}
              onAddTask={() => openNewTask(selectedDate)}
              dragTaskId={dragTaskId} setDragTaskId={setDragTaskId}
              onReorder={(orderedIds) => {
                setTasks((prev) => {
                  const map = new Map(orderedIds.map((id, idx) => [id, idx]));
                  return prev.map((tk) => (map.has(tk.id) ? { ...tk, order: map.get(tk.id) } : tk));
                });
              }}
            />
          )}
        </div>
      </main>

      {modalTask && (
        <TaskModal
          t={t} task={modalTask} categories={categories} setCategories={setCategories}
          onSave={saveTask} onDelete={deleteTask} onClose={() => { setModalTask(null); setModalDate(null); }}
        />
      )}
    </div>
  );
}

/* -------------------------------- SIDEBAR ---------------------------------- */

function Sidebar({ t, mode, setMode, open, setOpen, mobileOpen, setMobileOpen, selectedDate, setSelectedDate,
  monthCursor, setMonthCursor, mainView, setMainView, categories, setCategories,
  categoryFilter, setCategoryFilter, allTags, tagFilter, setTagFilter, tasks,
  weekStartsMonday, setWeekStartsMonday, onExportJSON, onExportCSV, onImportClick,
  cloudStatus, userEmail }) {

  const [addingCat, setAddingCat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(SWATCHES[0]);

  const overdueCount = useMemo(() => {
    let c = 0; const start = addDays(new Date(), -60);
    let d = start;
    while (d < parseISO(todayStr())) {
      const ds = fmt(d);
      tasks.forEach((tk) => { if (occursOn(tk, ds) && !isDoneOn(tk, ds)) c++; });
      d = addDays(d, 1);
    }
    return c;
  }, [tasks]);

  const width = open ? 264 : 76;

  const content = (
    <div className="h-full flex flex-col" style={{ background: t.surface, borderRight: `1px solid ${t.border}`, width }}>
      <div className="flex items-center gap-2 px-4 py-5" style={{ borderBottom: `1px solid ${t.border}` }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: t.accent }}>
          <span style={{ fontFamily: "Fraunces, serif", color: t.accentInk, fontWeight: 600, fontSize: 15 }}>P</span>
        </div>
        {open && <span style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 500 }}>Planner</span>}
        <button className="md:hidden ml-auto p-1" onClick={() => setMobileOpen(false)}><X size={16} color={t.inkMuted} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5">
        {open && <MiniCalendar t={t} monthCursor={monthCursor} setMonthCursor={setMonthCursor}
          selectedDate={selectedDate} weekStartsMonday={weekStartsMonday}
          onSelectDate={(d) => { setSelectedDate(d); setMainView("day"); setMobileOpen(false); }}
          tasks={tasks} />}

        <NavItem t={t} open={open} icon={<CalendarDays size={16} />} label="Today"
          active={mainView === "day" && selectedDate === todayStr()}
          onClick={() => { setSelectedDate(todayStr()); setMonthCursor(startOfMonth(new Date())); setMainView("day"); setMobileOpen(false); }} />
        <div className="flex flex-col gap-1">
          <NavItem t={t} open={open} icon={<Clock size={16} />} label="Upcoming"
            active={mainView === "upcoming"} onClick={() => { setMainView("upcoming"); setMobileOpen(false); }} />
          <NavItem t={t} open={open} icon={<AlertCircle size={16} />} label="Overdue" badge={overdueCount || null}
            active={mainView === "overdue"} onClick={() => { setMainView("overdue"); setMobileOpen(false); }} />
          <NavItem t={t} open={open} icon={<CheckCircle2 size={16} />} label="Completed"
            active={mainView === "completed"} onClick={() => { setMainView("completed"); setMobileOpen(false); }} />
        </div>

        {open && (
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <SectionLabel t={t}>Categories</SectionLabel>
              <button onClick={() => setAddingCat((v) => !v)} className="p-0.5 rounded"
                style={{ color: t.inkFaint }}><Plus size={13} /></button>
            </div>
            <div className="flex flex-col gap-0.5">
              <FilterRow t={t} active={!categoryFilter} label="All categories" dot={null}
                onClick={() => setCategoryFilter(null)} />
              {categories.map((c) => (
                <FilterRow key={c.id} t={t} active={categoryFilter === c.id} label={c.name} dot={c.color}
                  onClick={() => setCategoryFilter(categoryFilter === c.id ? null : c.id)} />
              ))}
            </div>
            {addingCat && (
              <div className="mt-2 p-2 rounded-lg flex flex-col gap-2" style={{ background: t.surfaceAlt }}>
                <input autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category name" className="text-sm px-2 py-1.5 rounded-md outline-none"
                  style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.ink }} />
                <div className="flex gap-1.5 flex-wrap">
                  {SWATCHES.map((sw) => (
                    <button key={sw} onClick={() => setNewCatColor(sw)} className="w-5 h-5 rounded-full"
                      style={{ background: sw, outline: newCatColor === sw ? `2px solid ${t.ink}` : "none", outlineOffset: 2 }} />
                  ))}
                </div>
                <button onClick={() => {
                  if (!newCatName.trim()) return;
                  setCategories((prev) => [...prev, { id: uid(), name: newCatName.trim(), color: newCatColor }]);
                  setNewCatName(""); setAddingCat(false);
                }} className="text-xs font-medium py-1.5 rounded-md" style={{ background: t.accent, color: t.accentInk }}>Add category</button>
              </div>
            )}
          </div>
        )}

        {open && allTags.length > 0 && (
          <div>
            <SectionLabel t={t} className="px-2 mb-2">Tags</SectionLabel>
            <div className="flex flex-wrap gap-1.5 px-2">
              {allTags.map((tg) => (
                <button key={tg} onClick={() => setTagFilter(tagFilter === tg ? null : tg)}
                  className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                  style={{
                    background: tagFilter === tg ? t.accent : t.surfaceAlt,
                    color: tagFilter === tg ? t.accentInk : t.inkMuted,
                    border: `1px solid ${tagFilter === tg ? t.accent : t.border}`,
                  }}>
                  <TagIcon size={10} /> {tg}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${t.border}` }}>
        {open && showSettings && (
          <div className="rounded-lg p-2.5 flex flex-col gap-2.5" style={{ background: t.surfaceAlt }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 12, color: t.inkMuted }}>Week starts on</span>
              <div className="flex rounded-md overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
                <button onClick={() => setWeekStartsMonday(true)} className="text-[11px] px-2 py-1"
                  style={{ background: weekStartsMonday ? t.accent : "transparent", color: weekStartsMonday ? t.accentInk : t.inkMuted }}>Mon</button>
                <button onClick={() => setWeekStartsMonday(false)} className="text-[11px] px-2 py-1"
                  style={{ background: !weekStartsMonday ? t.accent : "transparent", color: !weekStartsMonday ? t.accentInk : t.inkMuted }}>Sun</button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 pt-1" style={{ borderTop: `1px solid ${t.border}` }}>
              <span style={{ fontSize: 10, color: t.inkFaint, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>Backup</span>
              <button onClick={onExportJSON} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md" style={{ color: t.ink, background: t.surface }}>
                <Download size={12} /> Export JSON backup
              </button>
              <button onClick={onExportCSV} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md" style={{ color: t.ink, background: t.surface }}>
                <Download size={12} /> Export CSV
              </button>
              <button onClick={onImportClick} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md" style={{ color: t.ink, background: t.surface }}>
                <Upload size={12} /> Import JSON backup
              </button>
            </div>
            <div className="flex flex-col gap-1.5 pt-1" style={{ borderTop: `1px solid ${t.border}` }}>
              <div className="flex items-center gap-1.5 px-0.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: cloudStatus === "offline" ? t.danger : t.accent, opacity: cloudStatus === "saving" ? 0.5 : 1 }} />
                <span style={{ fontSize: 11, color: t.inkFaint }}>
                  {cloudStatus === "loading" && "Loading…"}
                  {cloudStatus === "saving" && "Saving…"}
                  {cloudStatus === "synced" && "Synced"}
                  {cloudStatus === "offline" && "Offline — saved locally only"}
                  {cloudStatus === "local" && "Local only"}
                </span>
              </div>
              {userEmail && <span style={{ fontSize: 11, color: t.inkFaint }} className="truncate px-0.5">{userEmail}</span>}
              {!userEmail?.startsWith("Local") && (
                <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md" style={{ color: t.danger, background: t.surface }}>
                  <LogOut size={12} /> Sign out
                </button>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={() => setMode(mode === "light" ? "dark" : "light")}
            className="flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg flex-1"
            style={{ background: t.surfaceAlt, color: t.inkMuted }}>
            {mode === "light" ? <Moon size={13} /> : <Sun size={13} />}
            {open && <span>{mode === "light" ? "Dark mode" : "Light mode"}</span>}
          </button>
          <button onClick={() => setShowSettings((v) => !v)} className="p-2 rounded-lg"
            style={{ background: showSettings ? t.accentSoft : t.surfaceAlt, color: showSettings ? t.accent : t.inkMuted }}>
            <SettingsIcon size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:block shrink-0 transition-all duration-200" style={{ width }}>{content}</div>
      {mobileOpen && (
        <div className="fixed left-0 top-0 bottom-0 z-50 md:hidden" style={{ width: 264 }}>{content}</div>
      )}
    </>
  );
}

function SectionLabel({ t, children }) {
  return <div style={{ color: t.inkFaint, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{children}</div>;
}

function NavItem({ t, open, icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm w-full"
      style={{ background: active ? t.accentSoft : "transparent", color: active ? t.accent : t.inkMuted, fontWeight: active ? 600 : 500 }}>
      <span style={{ color: active ? t.accent : t.inkFaint }}>{icon}</span>
      {open && <span className="flex-1 text-left">{label}</span>}
      {open && badge ? (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: t.danger, color: "#fff" }}>{badge}</span>
      ) : null}
    </button>
  );
}

function FilterRow({ t, active, label, dot, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm w-full"
      style={{ background: active ? t.accentSoft : "transparent", color: active ? t.ink : t.inkMuted, fontWeight: active ? 600 : 500 }}>
      {dot ? <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} /> : <span className="w-2 h-2 rounded-full shrink-0" style={{ border: `1.5px solid ${t.inkFaint}` }} />}
      <span className="text-left truncate">{label}</span>
    </button>
  );
}

/* ------------------------------ MINI CALENDAR ------------------------------- */

function MiniCalendar({ t, monthCursor, setMonthCursor, selectedDate, onSelectDate, tasks, weekStartsMonday = true }) {
  const wso = weekStartsMonday ? 1 : 0;
  const start = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: wso });
  const end = endOfWeek(endOfMonth(monthCursor), { weekStartsOn: wso });
  const days = eachDayOfInterval({ start, end });
  const countFor = (d) => tasks.filter((tk) => occursOn(tk, fmt(d))).length;
  const dayLabels = weekStartsMonday ? ["M", "T", "W", "T", "F", "S", "S"] : ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="px-1">
      <div className="flex items-center justify-between mb-2 px-1">
        <span style={{ fontFamily: "Fraunces, serif", fontSize: 14, fontWeight: 500 }}>{format(monthCursor, "MMMM yyyy")}</span>
        <div className="flex gap-0.5">
          <button onClick={() => setMonthCursor(subMonths(monthCursor, 1))} className="p-1 rounded"><ChevronLeft size={13} color={t.inkFaint} /></button>
          <button onClick={() => setMonthCursor(addMonths(monthCursor, 1))} className="p-1 rounded"><ChevronRight size={13} color={t.inkFaint} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {dayLabels.map((d, i) => (
          <div key={i} style={{ fontSize: 10, color: t.inkFaint, fontFamily: "IBM Plex Mono, monospace" }}>{d}</div>
        ))}
        {days.map((d) => {
          const ds = fmt(d);
          const inMonth = isSameMonth(d, monthCursor);
          const selected = ds === selectedDate;
          const today = dfIsToday(d);
          const n = countFor(d);
          return (
            <button key={ds} onClick={() => onSelectDate(ds)}
              className="flex flex-col items-center justify-center rounded-md mx-auto"
              style={{
                width: 26, height: 26,
                background: selected ? t.accent : "transparent",
                color: selected ? t.accentInk : inMonth ? t.ink : t.inkFaint,
                fontFamily: "IBM Plex Mono, monospace", fontSize: 11,
                border: today && !selected ? `1px solid ${t.accent}` : "1px solid transparent",
              }}>
              {format(d, "d")}
              <span className="rounded-full" style={{ width: 3, height: 3, marginTop: 1, background: n > 0 ? (selected ? t.accentInk : t.accent) : "transparent" }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------- MONTH VIEW ------------------------------- */

function MonthView({ t, monthCursor, setMonthCursor, selectedDate, onSelectDate, tasksForDate, categories, onDropTask, setDragTaskId, weekStartsMonday = true }) {
  const wso = weekStartsMonday ? 1 : 0;
  const start = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: wso });
  const end = endOfWeek(endOfMonth(monthCursor), { weekStartsOn: wso });
  const days = eachDayOfInterval({ start, end });
  const weekLabels = weekStartsMonday ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 pt-1">
        <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 500 }}>{format(monthCursor, "MMMM yyyy")}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonthCursor(startOfMonth(new Date()))} className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.inkMuted }}>Today</button>
          <button onClick={() => setMonthCursor(subMonths(monthCursor, 1))} className="p-2 rounded-lg" style={{ background: t.surface, border: `1px solid ${t.border}` }}><ChevronLeft size={15} color={t.ink} /></button>
          <button onClick={() => setMonthCursor(addMonths(monthCursor, 1))} className="p-2 rounded-lg" style={{ background: t.surface, border: `1px solid ${t.border}` }}><ChevronRight size={15} color={t.ink} /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 rounded-xl overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
        {weekLabels.map((d) => (
          <div key={d} className="text-center py-2" style={{ background: t.surfaceAlt, fontSize: 11, fontWeight: 600, color: t.inkFaint, letterSpacing: "0.04em" }}>{d}</div>
        ))}
        {days.map((d) => {
          const ds = fmt(d);
          const inMonth = isSameMonth(d, monthCursor);
          const dayTasks = tasksForDate(ds);
          const today = dfIsToday(d);
          const selected = ds === selectedDate;
          const catColors = [...new Set(dayTasks.map((tk) => catOf(categories, tk.categoryId)?.color).filter(Boolean))];
          return (
            <div key={ds} onClick={() => onSelectDate(ds)}
              onDragOver={(e) => e.preventDefault()} onDrop={() => onDropTask(ds)}
              className="min-h-[92px] p-2 cursor-pointer flex flex-col gap-1"
              style={{
                background: selected ? t.accentSoft : t.surface, opacity: inMonth ? 1 : 0.45,
                borderRight: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`,
              }}>
              <div className="flex items-center justify-between">
                <span style={{
                  fontFamily: "IBM Plex Mono, monospace", fontSize: 12,
                  color: today ? t.accentInk : t.ink, fontWeight: today ? 700 : 500,
                  background: today ? t.accent : "transparent", borderRadius: 5, width: 20, height: 20,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{format(d, "d")}</span>
                {dayTasks.length > 0 && <span style={{ fontSize: 10, color: t.inkFaint, fontFamily: "IBM Plex Mono, monospace" }}>{dayTasks.length}</span>}
              </div>
              <div className="flex flex-wrap gap-1 mt-auto">
                {catColors.slice(0, 4).map((c, i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />)}
                {catColors.length > 4 && <span style={{ fontSize: 9, color: t.inkFaint }}>+{catColors.length - 4}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------- DAY PLANNER ------------------------------ */

function DayPlanner({ t, selectedDate, setSelectedDate, dayList, progress, statusFilter, setStatusFilter,
  sortBy, setSortBy, categories, onToggle, onEdit, onDuplicate, onDelete, onPin, onFavorite, onArchive,
  onAddTask, dragTaskId, setDragTaskId, onReorder }) {

  const dateObj = parseISO(selectedDate);
  const visible = dayList.filter((tk) => {
    const done = isDoneOn(tk, selectedDate);
    if (statusFilter === "active") return !done;
    if (statusFilter === "completed") return done;
    return true;
  });

  const handleDrop = (targetId) => {
    if (!dragTaskId || dragTaskId === targetId || sortBy !== "manual") { setDragTaskId(null); return; }
    const ids = visible.map((v) => v.id);
    const from = ids.indexOf(dragTaskId), to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    onReorder(ids);
    setDragTaskId(null);
  };

  return (
    <div>
      <div className="flex items-start justify-between pt-1 mb-5 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => setSelectedDate(fmt(addDays(dateObj, -1)))} className="p-1 rounded" style={{ color: t.inkFaint }}><ChevronLeft size={16} /></button>
            <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: t.inkFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {format(dateObj, "EEEE")}
            </span>
            <button onClick={() => setSelectedDate(fmt(addDays(dateObj, 1)))} className="p-1 rounded" style={{ color: t.inkFaint }}><ChevronRight size={16} /></button>
            {selectedDate !== todayStr() && (
              <button onClick={() => setSelectedDate(todayStr())} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: t.accentSoft, color: t.accent }}>Today</button>
            )}
          </div>
          <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 30, fontWeight: 500 }}>{format(dateObj, "MMMM d, yyyy")}</h1>
        </div>

        <div className="rounded-xl p-3.5 min-w-[220px]" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="flex items-center justify-between mb-1.5">
            <span style={{ fontSize: 11, color: t.inkFaint, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>Progress</span>
            <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: t.ink }}>{progress.pct}%</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden mb-1.5" style={{ background: t.surfaceAlt }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress.pct}%`, background: t.accent }} />
          </div>
          <span style={{ fontSize: 12, color: t.inkMuted }}>{progress.done}/{progress.total} tasks complete</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {["all", "active", "completed"].map((f) => (
          <button key={f} onClick={() => setStatusFilter(f)} className="text-xs px-3 py-1.5 rounded-lg font-medium capitalize"
            style={{ background: statusFilter === f ? t.ink : t.surface, color: statusFilter === f ? t.canvas : t.inkMuted, border: `1px solid ${statusFilter === f ? t.ink : t.border}` }}>
            {f}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <span style={{ fontSize: 12, color: t.inkFaint }}>Sort</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg outline-none"
            style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.ink }}>
            <option value="priority">Priority</option>
            <option value="time">Due time</option>
            <option value="alpha">Alphabetical</option>
            <option value="created">Creation date</option>
            <option value="manual">Manual order</option>
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState t={t} label="Nothing planned yet" hint="Press N or tap “New task” to add one." />
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((task) => (
            <TaskCard key={task.id} t={t} task={task} dateStr={selectedDate} categories={categories}
              done={isDoneOn(task, selectedDate)} onToggle={() => onToggle(task)} onEdit={() => onEdit(task)}
              onDuplicate={() => onDuplicate(task)} onDelete={() => onDelete(task.id)}
              onPin={() => onPin(task)} onFavorite={() => onFavorite(task)} onArchive={() => onArchive(task)}
              draggable={sortBy === "manual"}
              onDragStart={() => setDragTaskId(task.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(task.id)}
            />
          ))}
        </div>
      )}

      <button onClick={onAddTask} className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium"
        style={{ border: `1.5px dashed ${t.border}`, color: t.inkMuted }}>
        <Plus size={15} /> Add task to {format(dateObj, "MMM d")}
      </button>
    </div>
  );
}

function EmptyState({ t, label, hint }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 rounded-2xl" style={{ background: t.surface, border: `1px dashed ${t.border}` }}>
      <Inbox size={26} color={t.inkFaint} />
      <p className="mt-3 text-sm font-medium" style={{ color: t.ink }}>{label}</p>
      {hint && <p className="text-xs mt-1" style={{ color: t.inkFaint }}>{hint}</p>}
    </div>
  );
}

/* ---------------------------------- TASK CARD -------------------------------- */

function TaskCard({ t, task, dateStr, categories, done, onToggle, onEdit, onDuplicate, onDelete, onPin, onFavorite, onArchive,
  draggable, onDragStart, onDragOver, onDrop }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cat = catOf(categories, task.categoryId);
  const pr = priorityOf(task.priority);
  const subDone = (task.subtasks || []).filter((s) => s.done).length;
  const subTotal = (task.subtasks || []).length;

  return (
    <div draggable={draggable} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop}
      className="group flex gap-3 rounded-xl p-3 relative"
      style={{ background: t.surface, border: `1px solid ${t.border}`, borderLeft: `3px solid ${task.color || pr.color}`, opacity: done ? 0.6 : 1 }}>

      <button onClick={onToggle} className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all"
        style={{ border: `1.5px solid ${done ? pr.color : t.borderStrong}`, background: done ? pr.color : "transparent" }}>
        {done && <Check size={12} color="#fff" strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.pinned && <Pin size={11} color={t.accent} fill={t.accent} />}
          <span className="text-sm font-medium" style={{ color: t.ink, textDecoration: done ? "line-through" : "none" }}>{task.title}</span>
          {task.favorite && <Star size={11} color="#E08A3C" fill="#E08A3C" />}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {cat && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-md flex items-center gap-1" style={{ background: t.surfaceAlt, color: t.inkMuted }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} /> {cat.name}
            </span>
          )}
          {task.dueTime && <span className="text-[11px] flex items-center gap-1" style={{ color: t.inkFaint, fontFamily: "IBM Plex Mono, monospace" }}><Clock size={10} />{task.dueTime}</span>}
          {task.repeat && <span className="text-[11px] flex items-center gap-1" style={{ color: t.inkFaint }}><Repeat size={10} />{repeatLabel(task.repeat)}</span>}
          {subTotal > 0 && <span className="text-[11px]" style={{ color: t.inkFaint, fontFamily: "IBM Plex Mono, monospace" }}>{subDone}/{subTotal} subtasks</span>}
          {(task.tags || []).slice(0, 3).map((tg) => (
            <span key={tg} className="text-[11px]" style={{ color: t.accent }}>#{tg}</span>
          ))}
        </div>
        {subTotal > 0 && (
          <div className="w-full h-1 rounded-full overflow-hidden mt-2" style={{ background: t.surfaceAlt, maxWidth: 160 }}>
            <div className="h-full rounded-full" style={{ width: `${(subDone / subTotal) * 100}%`, background: cat?.color || t.accent }} />
          </div>
        )}
      </div>

      <div className="relative shrink-0">
        <button onClick={() => setMenuOpen((v) => !v)} className="opacity-0 group-hover:opacity-100 p-1 rounded" style={{ color: t.inkFaint }}>
          <ChevronDown size={15} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-7 z-30 rounded-lg overflow-hidden py-1 w-40" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}
            onMouseLeave={() => setMenuOpen(false)}>
            <MenuItem t={t} icon={<Pencil size={13} />} label="Edit" onClick={onEdit} />
            <MenuItem t={t} icon={<Pin size={13} />} label={task.pinned ? "Unpin" : "Pin"} onClick={onPin} />
            <MenuItem t={t} icon={<Star size={13} />} label={task.favorite ? "Unfavorite" : "Favorite"} onClick={onFavorite} />
            <MenuItem t={t} icon={<Copy size={13} />} label="Duplicate" onClick={onDuplicate} />
            <MenuItem t={t} icon={<Archive size={13} />} label="Archive" onClick={onArchive} />
            <MenuItem t={t} icon={<Trash2 size={13} />} label="Delete" danger onClick={onDelete} />
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({ t, icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left"
      style={{ color: danger ? t.danger : t.ink }}>
      {icon} {label}
    </button>
  );
}

/* -------------------------------- RESULTS LIST ------------------------------- */

function ResultsList({ t, title, icon, items, categories, onToggle, onEdit, empty, showDate }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4 pt-1">
        <span style={{ color: t.inkFaint }}>{icon}</span>
        <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 500 }}>{title}</h1>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: t.surfaceAlt, color: t.inkFaint }}>{items.length}</span>
      </div>
      {items.length === 0 ? <EmptyState t={t} label={empty} /> : (
        <div className="flex flex-col gap-2">
          {items.map(({ task, date }, i) => (
            <div key={task.id + date + i}>
              {showDate && <div style={{ fontSize: 11, color: t.inkFaint, fontFamily: "IBM Plex Mono, monospace", margin: "10px 0 4px 2px" }}>{format(parseISO(date), "MMM d, yyyy")}</div>}
              <TaskCard t={t} task={task} dateStr={date} categories={categories}
                done={isDoneOn(task, date)} onToggle={() => onToggle(task, date)} onEdit={() => onEdit(task)}
                onDuplicate={() => {}} onDelete={() => {}} onPin={() => {}} onFavorite={() => {}} onArchive={() => {}} />
              {!showDate && <div style={{ fontSize: 10, color: t.inkFaint, marginTop: 2, marginLeft: 4 }}>{format(parseISO(date), "EEE, MMM d")}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ViewTab({ t, active, onClick, children }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 rounded-lg text-xs font-medium"
      style={{ background: active ? t.ink : "transparent", color: active ? t.canvas : t.inkMuted }}>
      {children}
    </button>
  );
}

/* --------------------------------- TASK MODAL -------------------------------- */

function TaskModal({ t, task, categories, setCategories, onSave, onDelete, onClose }) {
  const [draft, setDraft] = useState(task);
  const [tagInput, setTagInput] = useState("");
  const [subInput, setSubInput] = useState("");
  const isNew = !task.title && (task.subtasks || []).length === 0;

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const addTag = () => {
    const v = tagInput.trim().replace(/^#/, "");
    if (v && !draft.tags.includes(v)) set({ tags: [...draft.tags, v] });
    setTagInput("");
  };
  const addSub = () => {
    if (!subInput.trim()) return;
    set({ subtasks: [...(draft.subtasks || []), { id: uid(), title: subInput.trim(), done: false }] });
    setSubInput("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-0 md:p-6"
      style={{ background: "rgba(10,10,12,0.5)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-lg h-full md:h-auto md:max-h-[88vh] overflow-y-auto md:rounded-2xl"
        style={{ background: t.surface, boxShadow: t.shadow }}>

        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10" style={{ background: t.surface, borderBottom: `1px solid ${t.border}` }}>
          <span style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 500 }}>{isNew ? "New task" : "Edit task"}</span>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: t.inkFaint }}><X size={16} /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <input autoFocus value={draft.title} onChange={(e) => set({ title: e.target.value })}
            placeholder="Task title" className="w-full text-lg font-medium outline-none bg-transparent"
            style={{ color: t.ink, fontFamily: "Fraunces, serif" }} />

          <textarea value={draft.description} onChange={(e) => set({ description: e.target.value })}
            placeholder="Description" rows={2} className="w-full text-sm outline-none rounded-lg p-2.5 resize-none"
            style={{ background: t.surfaceAlt, color: t.ink }} />

          <textarea value={draft.notes} onChange={(e) => set({ notes: e.target.value })}
            placeholder="Notes" rows={2} className="w-full text-sm outline-none rounded-lg p-2.5 resize-none"
            style={{ background: t.surfaceAlt, color: t.ink }} />

          <div className="grid grid-cols-2 gap-3">
            <Field t={t} label="Due date">
              <input type="date" value={draft.dueDate} onChange={(e) => set({ dueDate: e.target.value })}
                className="w-full text-sm outline-none bg-transparent" style={{ color: t.ink }} />
            </Field>
            <Field t={t} label="Due time">
              <input type="time" value={draft.dueTime || ""} onChange={(e) => set({ dueTime: e.target.value })}
                className="w-full text-sm outline-none bg-transparent" style={{ color: t.ink }} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field t={t} label="Priority">
              <select value={draft.priority} onChange={(e) => set({ priority: e.target.value })}
                className="w-full text-sm outline-none bg-transparent" style={{ color: t.ink }}>
                {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </Field>
            <Field t={t} label="Category">
              <select value={draft.categoryId} onChange={(e) => set({ categoryId: e.target.value })}
                className="w-full text-sm outline-none bg-transparent" style={{ color: t.ink }}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field t={t} label="Estimated duration (min)">
              <input type="number" min="0" value={draft.estimatedDuration || ""} onChange={(e) => set({ estimatedDuration: e.target.value ? Number(e.target.value) : null })}
                className="w-full text-sm outline-none bg-transparent" style={{ color: t.ink }} placeholder="—" />
            </Field>
            <Field t={t} label="Actual duration (min)">
              <input type="number" min="0" value={draft.actualDuration || ""} onChange={(e) => set({ actualDuration: e.target.value ? Number(e.target.value) : null })}
                className="w-full text-sm outline-none bg-transparent" style={{ color: t.ink }} placeholder="—" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field t={t} label="Status">
              <select value={draft.status || "active"} onChange={(e) => set({ status: e.target.value, completedAt: e.target.value === "completed" ? (draft.completedAt || todayStr()) : null })}
                className="w-full text-sm outline-none bg-transparent" style={{ color: t.ink }}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <Field t={t} label="Reminder">
              <select value={draft.reminder || ""} onChange={(e) => set({ reminder: e.target.value || null })}
                className="w-full text-sm outline-none bg-transparent" style={{ color: t.ink }}>
                <option value="">None</option>
                <option value="10">10 min before</option>
                <option value="30">30 min before</option>
                <option value="60">1 hour before</option>
                <option value="1440">1 day before</option>
              </select>
            </Field>
          </div>

          <Field t={t} label="Task color">
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => set({ color: null })} className="text-xs px-2 py-1 rounded-md" style={{ background: draft.color ? t.surfaceAlt : t.accent, color: draft.color ? t.inkMuted : t.accentInk }}>Auto</button>
              {SWATCHES.map((sw) => (
                <button key={sw} onClick={() => set({ color: sw })} className="w-6 h-6 rounded-full"
                  style={{ background: sw, outline: draft.color === sw ? `2px solid ${t.ink}` : `1px solid ${t.border}`, outlineOffset: 2 }} />
              ))}
            </div>
          </Field>

          <Field t={t} label="Repeat">
            <div className="flex gap-2 items-center flex-wrap">
              <select value={draft.repeat?.freq || "none"} onChange={(e) => {
                const freq = e.target.value;
                set({ repeat: freq === "none" ? null : { freq, interval: draft.repeat?.interval || 1, until: draft.repeat?.until || null } });
              }} className="text-sm outline-none bg-transparent" style={{ color: t.ink }}>
                {REPEAT_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              {draft.repeat && (draft.repeat.freq === "custom" || draft.repeat.freq === "weekly" || draft.repeat.freq === "monthly") && (
                <input type="number" min="1" value={draft.repeat.interval} onChange={(e) => set({ repeat: { ...draft.repeat, interval: Number(e.target.value) || 1 } })}
                  className="w-14 text-sm outline-none rounded-md px-1.5 py-1" style={{ background: t.surfaceAlt, color: t.ink }} />
              )}
              {draft.repeat && (
                <input type="date" value={draft.repeat.until || ""} onChange={(e) => set({ repeat: { ...draft.repeat, until: e.target.value || null } })}
                  className="text-xs outline-none rounded-md px-1.5 py-1" style={{ background: t.surfaceAlt, color: t.inkMuted }} title="Ends on (optional)" />
              )}
            </div>
          </Field>

          <Field t={t} label="Tags">
            <div className="flex flex-wrap gap-1.5 items-center">
              {draft.tags.map((tg) => (
                <span key={tg} className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ background: t.accentSoft, color: t.accent }}>
                  #{tg} <X size={10} className="cursor-pointer" onClick={() => set({ tags: draft.tags.filter((x) => x !== tg) })} />
                </span>
              ))}
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                placeholder="add tag…" className="text-xs outline-none bg-transparent flex-1 min-w-[80px]" style={{ color: t.ink }} />
            </div>
          </Field>

          <Field t={t} label={`Subtasks ${draft.subtasks?.length ? `(${draft.subtasks.filter(s=>s.done).length}/${draft.subtasks.length})` : ""}`}>
            <div className="flex flex-col gap-1.5">
              {(draft.subtasks || []).map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={s.done} onChange={() => set({ subtasks: draft.subtasks.map((x) => x.id === s.id ? { ...x, done: !x.done } : x) })} />
                  <span className="text-sm flex-1" style={{ color: t.ink, textDecoration: s.done ? "line-through" : "none" }}>{s.title}</span>
                  <X size={12} className="cursor-pointer" color={t.inkFaint} onClick={() => set({ subtasks: draft.subtasks.filter((x) => x.id !== s.id) })} />
                </div>
              ))}
              <div className="flex items-center gap-2 mt-1">
                <input value={subInput} onChange={(e) => setSubInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSub(); } }}
                  placeholder="Add subtask…" className="text-sm outline-none bg-transparent flex-1" style={{ color: t.ink }} />
                <button onClick={addSub} className="p-1 rounded" style={{ color: t.accent }}><Plus size={14} /></button>
              </div>
            </div>
          </Field>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-1.5 text-xs" style={{ color: t.inkMuted }}>
              <input type="checkbox" checked={!!draft.pinned} onChange={(e) => set({ pinned: e.target.checked })} /> Pinned
            </label>
            <label className="flex items-center gap-1.5 text-xs" style={{ color: t.inkMuted }}>
              <input type="checkbox" checked={!!draft.favorite} onChange={(e) => set({ favorite: e.target.checked })} /> Favorite
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-4 sticky bottom-0" style={{ background: t.surface, borderTop: `1px solid ${t.border}` }}>
          {!isNew && (
            <button onClick={() => onDelete(draft.id)} className="p-2.5 rounded-xl" style={{ background: t.dangerSoft, color: t.danger }}>
              <Trash2 size={15} />
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: t.surfaceAlt, color: t.inkMuted }}>Cancel</button>
          <button onClick={() => draft.title.trim() && onSave(draft)} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: t.accent, color: t.accentInk, opacity: draft.title.trim() ? 1 : 0.5 }}>Save task</button>
        </div>
      </div>
    </div>
  );
}

function Field({ t, label, children }) {
  return (
    <div className="rounded-lg px-2.5 py-2" style={{ background: t.surfaceAlt }}>
      <div style={{ fontSize: 10, color: t.inkFaint, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      {children}
    </div>
  );
}
