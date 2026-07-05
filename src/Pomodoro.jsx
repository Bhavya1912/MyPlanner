import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, SkipForward, Coffee, Zap } from "lucide-react";

const FOCUS_SECONDS = 25 * 60;
const SHORT_BREAK_SECONDS = 5 * 60;
const LONG_BREAK_SECONDS = 15 * 60;

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1108].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.35);
    });
  } catch (e) { /* audio not available; fail silently */ }
}

function mmss(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * A classic 25/5 (15 after every 4th session) Pomodoro timer.
 * onFocusComplete(minutes) fires once per completed focus session.
 */
export default function PomodoroTimer({ t, taskTitle, sessionsCompleted = 0, onFocusComplete, compact = false }) {
  const [phase, setPhase] = useState("focus"); // focus | break
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          playChime();
          if (phase === "focus") {
            onFocusComplete?.(25);
            const nextIsLong = (sessionsCompleted + 1) % 4 === 0;
            setPhase("break");
            return nextIsLong ? LONG_BREAK_SECONDS : SHORT_BREAK_SECONDS;
          } else {
            setPhase("focus");
            return FOCUS_SECONDS;
          }
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, phase, sessionsCompleted, onFocusComplete]);

  function reset() {
    setRunning(false);
    setPhase("focus");
    setSecondsLeft(FOCUS_SECONDS);
  }
  function skip() {
    setRunning(false);
    if (phase === "focus") {
      const nextIsLong = (sessionsCompleted + 1) % 4 === 0;
      setPhase("break");
      setSecondsLeft(nextIsLong ? LONG_BREAK_SECONDS : SHORT_BREAK_SECONDS);
    } else {
      setPhase("focus");
      setSecondsLeft(FOCUS_SECONDS);
    }
  }

  const total = phase === "focus" ? FOCUS_SECONDS : (secondsLeft > SHORT_BREAK_SECONDS ? LONG_BREAK_SECONDS : SHORT_BREAK_SECONDS);
  const pct = Math.round(((total - secondsLeft) / total) * 100);

  return (
    <div className="flex flex-col items-center" style={{ gap: compact ? 10 : 16 }}>
      <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: phase === "focus" ? t.accent : "#4CAF7D" }}>
        {phase === "focus" ? <Zap size={13} /> : <Coffee size={13} />}
        {phase === "focus" ? "Focus session" : "Break"}
        {taskTitle && phase === "focus" && <span style={{ color: t.inkFaint, fontWeight: 400 }}>· {taskTitle}</span>}
      </div>

      <div className="relative flex items-center justify-center" style={{ width: compact ? 120 : 180, height: compact ? 120 : 180 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r="44" fill="none" stroke={t.surfaceAlt} strokeWidth="7" />
          <circle cx="50" cy="50" r="44" fill="none" stroke={phase === "focus" ? t.accent : "#4CAF7D"} strokeWidth="7"
            strokeDasharray={2 * Math.PI * 44} strokeDashoffset={2 * Math.PI * 44 * (1 - pct / 100)}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: compact ? 22 : 32, color: t.ink, fontWeight: 500 }}>{mmss(secondsLeft)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setRunning((r) => !r)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: t.accent, color: t.accentInk }}>
          {running ? <Pause size={14} /> : <Play size={14} />} {running ? "Pause" : "Start"}
        </button>
        <button onClick={skip} className="p-2 rounded-xl" style={{ background: t.surfaceAlt, color: t.inkMuted }} title="Skip to next phase">
          <SkipForward size={14} />
        </button>
        <button onClick={reset} className="p-2 rounded-xl" style={{ background: t.surfaceAlt, color: t.inkMuted }} title="Reset">
          <RotateCcw size={14} />
        </button>
      </div>

      {sessionsCompleted > 0 && (
        <span style={{ fontSize: 11, color: t.inkFaint }}>{sessionsCompleted} session{sessionsCompleted === 1 ? "" : "s"} completed today</span>
      )}
    </div>
  );
}
