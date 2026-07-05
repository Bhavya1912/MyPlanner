import React from "react";
import { X, Check, ChevronRight, SkipForward } from "lucide-react";
import PomodoroTimer from "./Pomodoro";
import { DistractionLogButton } from "./MoodEnergy";
import { catOf } from "./App.jsx";

export default function FocusMode({ t, task, upNext, progress, categories, dailyLog, onComplete, onSkip, onFocusComplete, onLogDistraction, onExit }) {
  const cat = task ? catOf(categories, task.categoryId) : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: t.canvas }}>
      <div className="w-full max-w-lg flex items-center justify-between px-6 pt-6">
        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: t.inkFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Focus mode
        </span>
        <button onClick={onExit} className="p-2 rounded-xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <X size={15} color={t.ink} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg px-6 gap-8">
        {task ? (
          <>
            <div className="text-center">
              {cat && (
                <span className="text-xs px-2 py-1 rounded-full inline-flex items-center gap-1.5 mb-2" style={{ background: t.surfaceAlt, color: t.inkMuted }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} /> {cat.name}
                </span>
              )}
              <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 500, color: t.ink }}>{task.title}</h1>
            </div>

            <PomodoroTimer t={t} taskTitle={null} sessionsCompleted={dailyLog.pomodorosCompleted || 0}
              onFocusComplete={(minutes) => onFocusComplete(task.id, minutes)} />

            <div className="flex items-center gap-2">
              <button onClick={() => onComplete(task)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: t.accent, color: t.accentInk }}>
                <Check size={15} /> Mark complete
              </button>
              {upNext && (
                <button onClick={onSkip} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: t.surfaceAlt, color: t.inkMuted }}>
                  <SkipForward size={14} /> Next task
                </button>
              )}
              <DistractionLogButton t={t} onLog={onLogDistraction} />
            </div>

            {upNext && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: t.inkFaint }}>
                Up next <ChevronRight size={12} /> {upNext.title}
              </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 500, color: t.ink }}>Nothing left for today 🎉</h1>
            <p className="text-sm mt-1" style={{ color: t.inkFaint }}>Every task for today is done, or there's nothing planned.</p>
          </div>
        )}
      </div>

      <div className="w-full max-w-lg px-6 pb-8">
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: t.surfaceAlt }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress.pct}%`, background: t.accent }} />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span style={{ fontSize: 11, color: t.inkFaint }}>{progress.done}/{progress.total} tasks complete today</span>
          <span style={{ fontSize: 11, color: t.inkFaint }}>{progress.pct}%</span>
        </div>
      </div>
    </div>
  );
}
