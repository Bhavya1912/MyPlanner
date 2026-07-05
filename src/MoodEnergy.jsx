import React, { useState } from "react";
import { Zap as ZapIcon, X } from "lucide-react";
import { MOODS, ENERGY_LEVELS, DISTRACTION_REASONS } from "./dailyLog";

export function MoodEnergyCard({ t, dailyLog, onUpdate }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <div style={{ fontSize: 11, color: t.inkFaint, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>
        Mood & energy
      </div>
      <div className="flex items-center gap-1.5 mb-3">
        {MOODS.map((m) => (
          <button key={m.id} onClick={() => onUpdate({ mood: dailyLog.mood === m.id ? null : m.id })}
            title={m.label}
            className="text-lg w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: dailyLog.mood === m.id ? t.accentSoft : "transparent", outline: dailyLog.mood === m.id ? `1.5px solid ${t.accent}` : "none" }}>
            {m.emoji}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {["morning", "afternoon", "night"].map((period) => (
          <div key={period} className="flex items-center justify-between gap-2">
            <span className="text-xs capitalize" style={{ color: t.inkMuted, minWidth: 62 }}>{period}</span>
            <div className="flex gap-1">
              {ENERGY_LEVELS.map((lvl) => (
                <button key={lvl.id}
                  onClick={() => onUpdate({ energy: { ...dailyLog.energy, [period]: dailyLog.energy[period] === lvl.id ? null : lvl.id } })}
                  className="text-[10px] px-2 py-1 rounded-md font-medium"
                  style={{
                    background: dailyLog.energy[period] === lvl.id ? t.accent : t.surfaceAlt,
                    color: dailyLog.energy[period] === lvl.id ? t.accentInk : t.inkMuted,
                  }}>
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DistractionLogButton({ t, onLog }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-medium"
        style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.inkMuted }}>
        <ZapIcon size={13} /> Interrupted
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-30 rounded-xl p-2 w-48" style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow }}
          onMouseLeave={() => setOpen(false)}>
          <div className="flex items-center justify-between px-1 pb-1.5">
            <span style={{ fontSize: 10, color: t.inkFaint, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>What pulled you away?</span>
            <X size={11} className="cursor-pointer" color={t.inkFaint} onClick={() => setOpen(false)} />
          </div>
          {DISTRACTION_REASONS.map((reason) => (
            <button key={reason} onClick={() => { onLog(reason); setOpen(false); }}
              className="w-full text-left text-xs px-2 py-1.5 rounded-md" style={{ color: t.ink }}>
              {reason}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
