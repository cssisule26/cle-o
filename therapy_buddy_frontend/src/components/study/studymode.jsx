import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayIcon, StopIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { studyAPI } from "../../api/client";
import { useLang } from "../../context/LanguageContext";
import FocusTracker from "./FocusTracker";

const DURATIONS = [30, 60, 90];

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = "sine";
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.3);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.3 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.3 + 1.2);
      osc.start(ctx.currentTime + i * 0.3);
      osc.stop(ctx.currentTime + i * 0.3 + 1.5);
    });
  } catch {}
}

function ScoreBar({ value, max = 10, color }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-cream-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono text-xs text-stone-400 w-4">{value}</span>
    </div>
  );
}

function SessionCard({ session }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(session.created_at);
  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timeStr = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const focusColor = session.focus_rating >= 7 ? "#5a845f" : session.focus_rating >= 5 ? "#84755a" : "#845a5a";
  const cameraColor = session.camera_focus_score >= 75 ? "#5a845f" : session.camera_focus_score >= 50 ? "#84755a" : "#845a5a";

  return (
    <motion.div layout className="bg-white border border-cream-200 rounded-xl overflow-hidden">
      {/* Summary row — always visible */}
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cream-50 transition-colors text-left">
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${session.completed ? "bg-sage-400" : "bg-amber-400"}`} />

        {/* Subject + date */}
        <div className="flex-1 min-w-0">
          <p className="font-body text-sm text-stone-700 truncate">{session.subject || "Session"}</p>
          <p className="text-xs text-stone-400 font-mono">{dateStr} · {timeStr}</p>
        </div>

        {/* Duration */}
        <div className="text-right flex-shrink-0">
          <p className="font-display text-base text-stone-700">{session.duration_minutes}<span className="text-xs text-stone-400 font-body ml-0.5">min</span></p>
          {!session.completed && <p className="text-xs text-amber-500 font-body">ended early</p>}
        </div>

        {/* Focus score pill */}
        {session.focus_rating && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: focusColor + "20" }}>
            <span className="font-display text-sm" style={{ color: focusColor }}>{session.focus_rating}</span>
          </div>
        )}

        {/* Expand chevron */}
        <div className="text-stone-300 flex-shrink-0">
          {expanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-cream-100">
            <div className="px-4 py-4 flex flex-col gap-3">

              {session.focus_rating && (
                <div>
                  <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-1.5">Focus</p>
                  <ScoreBar value={session.focus_rating} color={focusColor} />
                </div>
              )}

              {session.energy_rating && (
                <div>
                  <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-1.5">Energy</p>
                  <ScoreBar value={session.energy_rating} color="#5a6c84" />
                </div>
              )}

              {session.camera_focus_score != null && (
                <div>
                  <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-1.5">Camera focus</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${session.camera_focus_score}%`, backgroundColor: cameraColor }} />
                    </div>
                    <span className="font-mono text-xs text-stone-400 w-6">{session.camera_focus_score}</span>
                  </div>
                </div>
              )}

              {session.post_notes && (
                <div>
                  <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-1.5">Notes</p>
                  <p className="font-body text-sm text-stone-600 leading-relaxed">{session.post_notes}</p>
                </div>
              )}

              {!session.focus_rating && !session.post_notes && (
                <p className="text-xs text-stone-300 font-body italic">No details recorded</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function StudyMode() {
  const { t } = useLang();
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [subject, setSubject]         = useState("");
  const [phase, setPhase]             = useState("setup");
  const [session, setSession]         = useState(null);
  const [timeLeft, setTimeLeft]       = useState(0);
  const [leoMessage, setLeoMessage]   = useState("");
  const [ratings, setRatings]         = useState({ focus: 7, energy: 7, notes: "" });
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [useFocusCamera, setUseFocusCamera] = useState(false);
  const [liveScore, setLiveScore]     = useState(null);
  const [focusSessionData, setFocusSessionData] = useState(null);
  const [recentSessions, setRecentSessions]     = useState([]);
  const [distractionCount, setDistractionCount] = useState(0);
  const [showDistractWarning, setShowDistractWarning] = useState(false);
  const intervalRef       = useRef(null);
  const startTimeRef      = useRef(null);
  const containerRef      = useRef(null);
  const warningTimerRef   = useRef(null);

  useEffect(() => {
    studyAPI.history(3).then(r => {
      const sorted = [...(r.data || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentSessions(sorted.slice(0, 3));
    }).catch(() => {});
  }, [phase]); // refetch after finishing a session

  useEffect(() => {
    if (phase !== "running") return;
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = selectedDuration * 60 - elapsed;
      if (remaining <= 0) { clearInterval(intervalRef.current); setTimeLeft(0); handleTimerComplete(); }
      else setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [phase]);

  // ── Focus lock: fullscreen + tab visibility detection ──────────────────
  useEffect(() => {
    if (phase !== "running") return;

    // Request fullscreen
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();

    const onVisibilityChange = () => {
      if (document.hidden) {
        setDistractionCount(c => c + 1);
        setShowDistractWarning(true);
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = setTimeout(() => setShowDistractWarning(false), 4000);
      }
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement && phase === "running") {
        setDistractionCount(c => c + 1);
        setShowDistractWarning(true);
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = setTimeout(() => setShowDistractWarning(false), 4000);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      clearTimeout(warningTimerRef.current);
      // Exit fullscreen on cleanup
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [phase]);

  const handleStart = async () => {
    if (!subject.trim()) { setError(t("subject_placeholder")); return; }
    setError(""); setLoading(true);
    try {
      const res = await studyAPI.start({ planned_minutes: selectedDuration, subject: subject.trim() });
      setSession(res.data);
      setTimeLeft(selectedDuration * 60);
      startTimeRef.current = Date.now();
      setPhase("running");
    } catch { setError("Couldn't start session."); }
    setLoading(false);
  };

  const handleTimerComplete = async () => {
    playChime();
    if (session) {
      try {
        const res = await studyAPI.end({ session_id: session.id, duration_minutes: selectedDuration, completed: true });
        setLeoMessage(res.data?.leo_prompt || t("great_work"));
      } catch { setLeoMessage(t("great_work")); }
    }
    setPhase("checkin");
  };

  const handleQuit = async () => {
    clearInterval(intervalRef.current);
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 60000);
    if (session) {
      try {
        const res = await studyAPI.end({ session_id: session.id, duration_minutes: Math.max(1, elapsed), completed: false });
        setLeoMessage(res.data?.leo_prompt || t("great_work"));
      } catch { setLeoMessage(t("great_work")); }
    }
    setPhase("checkin");
  };

  const handleCheckin = async () => {
    if (session) {
      try {
        await studyAPI.checkin(session.id, {
          focus_rating: ratings.focus,
          energy_rating: ratings.energy,
          post_notes: ratings.notes,
          camera_focus_score: focusSessionData?.avgFocus ?? null,
          distraction_count: distractionCount,
        });
      } catch {}
    }
    setPhase("done");
  };

  const handleReset = () => {
    clearInterval(intervalRef.current);
    setPhase("setup"); setSession(null); setTimeLeft(0);
    setLeoMessage(""); setRatings({ focus: 7, energy: 7, notes: "" });
    setError(""); setLiveScore(null); setFocusSessionData(null);
    setDistractionCount(0); setShowDistractWarning(false);
  };

  const formatTime = (secs) => `${Math.floor(secs/60).toString().padStart(2,"0")}:${(secs%60).toString().padStart(2,"0")}`;
  const progress   = phase === "running" ? ((selectedDuration * 60 - timeLeft) / (selectedDuration * 60)) * 100 : 0;
  const circumference = 2 * Math.PI * 54;
  const focusColor = liveScore === null ? "#a0a0a0" : liveScore >= 75 ? "#5a845f" : liveScore >= 50 ? "#84755a" : "#845a5a";

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-8">
      <h2 className="font-display text-2xl mb-1">{t("study_timer")}</h2>
      <p className="text-stone-400 text-sm font-body mb-6">{t("focus_rest")}</p>

      <AnimatePresence mode="wait">

        {/* ── SETUP ── */}
        {phase === "setup" && (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            <div className="mb-5">
              <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-3">{t("subject")}</p>
              <input value={subject} onChange={e => { setSubject(e.target.value); setError(""); }}
                placeholder={t("subject_placeholder")}
                className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white font-body text-sm focus:outline-none focus:border-sage-400 transition-colors" />
            </div>

            <div className="mb-5">
              <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-3">{t("duration")}</p>
              <div className="flex gap-3">
                {DURATIONS.map(d => (
                  <motion.button key={d} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedDuration(d)}
                    className={`flex-1 py-4 rounded-xl font-body font-medium text-sm transition-all ${
                      selectedDuration === d ? "bg-sage-600 text-white shadow-lg shadow-sage-200" : "bg-white border border-cream-200 text-stone-500"}`}>
                    {d} {t("min")}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-3">Focus tracking</p>
              <div className="flex gap-3">
                {[{ id: false, label: "Without camera", emoji: "⏱" }, { id: true, label: "With camera", emoji: "📷" }].map(opt => (
                  <motion.button key={String(opt.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setUseFocusCamera(opt.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-body text-sm transition-all ${
                      useFocusCamera === opt.id ? "border-sage-400 bg-sage-50 text-sage-700" : "border-cream-200 bg-white text-stone-500"}`}>
                    <span>{opt.emoji}</span>{opt.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4"><p className="text-red-600 text-sm font-body">{error}</p></div>}

            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              onClick={handleStart} disabled={loading}
              className="w-full py-4 rounded-xl bg-sage-600 text-white font-body font-medium flex items-center justify-center gap-2 disabled:opacity-50 mb-8">
              <PlayIcon className="w-5 h-5" />
              {loading ? t("starting") : t("start_session")}
            </motion.button>

            {/* Recent sessions */}
            {recentSessions.length > 0 && (
              <div>
                <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-3">Recent sessions</p>
                <div className="flex flex-col gap-2">
                  {recentSessions.map(s => <SessionCard key={s.id} session={s} />)}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── RUNNING ── */}
        {phase === "running" && (
          <motion.div key="running" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center">

            {/* Tab switch / fullscreen exit warning */}
            <AnimatePresence>
              {showDistractWarning && (
                <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                  className="w-full mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <p className="font-body text-sm text-amber-700 font-medium">Stay focused!</p>
                    <p className="font-body text-xs text-amber-500">You left the session — distraction #{distractionCount}</p>
                  </div>
                  <button onClick={() => setShowDistractWarning(false)} className="ml-auto text-amber-400 hover:text-amber-600 text-xs font-body">✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="font-body text-stone-500 text-sm mb-6">{subject}</p>

            <div className="relative w-40 h-40 mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#e8e0cc" strokeWidth="8" />
                <circle cx="60" cy="60" r="54" fill="none" stroke="#5a845f" strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (progress / 100) * circumference}
                  strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <span className="font-display text-3xl text-stone-700">{formatTime(timeLeft)}</span>
                {liveScore !== null && (
                  <span className="font-mono text-xs font-medium" style={{ color: focusColor }}>focus {liveScore}</span>
                )}
              </div>
            </div>

            {useFocusCamera && (
              <div className="w-full mb-6">
                <FocusTracker active={phase === "running"} onScoreUpdate={setLiveScore} onSessionData={setFocusSessionData} />
              </div>
            )}

            <p className="text-stone-400 text-sm font-body mb-4">{t("stay_focused")}</p>

            {/* Distraction count + re-enter fullscreen */}
            <div className="flex items-center gap-3 mb-6">
              {distractionCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                  <span className="text-xs">👀</span>
                  <span className="text-xs font-body text-amber-600">{distractionCount} distraction{distractionCount !== 1 ? "s" : ""}</span>
                </div>
              )}
              {!document.fullscreenElement && (
                <button onClick={() => document.documentElement.requestFullscreen?.()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream-100 border border-cream-200 text-xs font-body text-stone-400 hover:text-sage-600 transition-colors">
                  ⛶ Re-enter fullscreen
                </button>
              )}
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleQuit}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-cream-300 text-stone-500 font-body text-sm hover:text-red-400 transition-all">
              <StopIcon className="w-4 h-4" /> {t("end_early")}
            </motion.button>
          </motion.div>
        )}

        {/* ── CHECKIN ── */}
        {phase === "checkin" && (
          <motion.div key="checkin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-5">
            {leoMessage && (
              <div className="bg-sage-50 border border-sage-200 rounded-2xl px-5 py-4">
                <p className="font-body text-stone-700">{leoMessage}</p>
              </div>
            )}

            {(focusSessionData || distractionCount > 0) && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-cream-200 rounded-2xl px-5 py-4 flex items-center gap-4">
                {focusSessionData && (
                  <>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                      style={{ background: `${focusSessionData.avgFocus >= 75 ? "#5a845f" : focusSessionData.avgFocus >= 50 ? "#84755a" : "#845a5a"}20` }}>
                      {focusSessionData.avgFocus >= 75 ? "🎯" : focusSessionData.avgFocus >= 50 ? "😶" : "😴"}
                    </div>
                    <div>
                      <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-1">Camera focus</p>
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-3xl" style={{ color: focusSessionData.avgFocus >= 75 ? "#5a845f" : focusSessionData.avgFocus >= 50 ? "#84755a" : "#845a5a" }}>
                          {focusSessionData.avgFocus}
                        </span>
                        <span className="text-stone-400 font-body text-sm">/100</span>
                      </div>
                    </div>
                  </>
                )}
                {distractionCount > 0 && (
                  <div className={focusSessionData ? "ml-auto text-right" : ""}>
                    <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-1">Distractions</p>
                    <p className="font-display text-3xl text-amber-500">{distractionCount}</p>
                  </div>
                )}
              </motion.div>
            )}

            {[
              { key: "focus",  label: t("focus_rating"), low: t("scattered"), high: t("locked_in") },
              { key: "energy", label: t("energy_level"),  low: t("drained"),   high: t("energized") },
            ].map(r => (
              <div key={r.key}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-body text-stone-600">{r.label}</span>
                  <span className="font-display text-sage-600">{ratings[r.key]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400 font-body w-16">{r.low}</span>
                  <input type="range" min={1} max={10} value={ratings[r.key]}
                    onChange={e => setRatings(v => ({ ...v, [r.key]: Number(e.target.value) }))}
                    className="flex-1 accent-sage-600" />
                  <span className="text-xs text-stone-400 font-body w-16 text-right">{r.high}</span>
                </div>
              </div>
            ))}

            <textarea value={ratings.notes} onChange={e => setRatings(v => ({ ...v, notes: e.target.value }))}
              placeholder={t("notes_optional")} rows={2}
              className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white font-body text-sm focus:outline-none focus:border-sage-400 resize-none" />

            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              onClick={handleCheckin}
              className="w-full py-4 rounded-xl bg-sage-600 text-white font-body font-medium flex items-center justify-center gap-2">
              <CheckIcon className="w-5 h-5" /> {t("save_finish")}
            </motion.button>
          </motion.div>
        )}

        {/* ── DONE ── */}
        {phase === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center py-12">
            <div className="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center mb-5">
              <CheckIcon className="w-8 h-8 text-sage-600" />
            </div>
            <h3 className="font-display text-2xl mb-2">{t("session_complete")}</h3>
            <p className="text-stone-400 font-body text-sm mb-8">{t("great_work")}</p>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleReset}
              className="px-8 py-3 rounded-xl bg-sage-600 text-white font-body font-medium">
              {t("start_another")}
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}