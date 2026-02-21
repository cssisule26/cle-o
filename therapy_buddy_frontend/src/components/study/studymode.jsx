import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayIcon, StopIcon, CheckIcon } from "@heroicons/react/24/outline";
import { studyAPI } from "../../api/client";
import { useLang } from "../../context/LanguageContext";

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

export default function StudyMode() {
  const { t } = useLang();
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [subject, setSubject] = useState("");
  const [phase, setPhase] = useState("setup");
  const [session, setSession] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [leoMessage, setLeoMessage] = useState("");
  const [ratings, setRatings] = useState({ focus: 7, energy: 7, notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

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
        const res = await studyAPI.end({ session_id: session.id, duration_minutes: elapsed, completed: false });
        setLeoMessage(res.data?.leo_prompt || t("great_work"));
      } catch { setLeoMessage(t("great_work")); }
    }
    setPhase("checkin");
  };

  const handleCheckin = async () => {
    if (session) {
      try { await studyAPI.checkin(session.id, { focus_rating: ratings.focus, energy_rating: ratings.energy, post_notes: ratings.notes }); } catch {}
    }
    setPhase("done");
  };

  const handleReset = () => {
    clearInterval(intervalRef.current);
    setPhase("setup"); setSession(null); setTimeLeft(0);
    setLeoMessage(""); setRatings({ focus: 7, energy: 7, notes: "" }); setError("");
  };

  const formatTime = (secs) => `${Math.floor(secs/60).toString().padStart(2,"0")}:${(secs%60).toString().padStart(2,"0")}`;
  const progress = phase === "running" ? ((selectedDuration*60-timeLeft)/(selectedDuration*60))*100 : 0;
  const circumference = 2 * Math.PI * 54;

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-8">
      <h2 className="font-display text-2xl mb-1">{t("study_timer")}</h2>
      <p className="text-stone-400 text-sm font-body mb-8">{t("focus_rest")}</p>

      <AnimatePresence mode="wait">
        {phase === "setup" && (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mb-6">
              <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-3">{t("subject")}</p>
              <input value={subject} onChange={e => { setSubject(e.target.value); setError(""); }}
                placeholder={t("subject_placeholder")}
                className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white font-body text-sm focus:outline-none focus:border-sage-400 transition-colors" />
            </div>
            <div className="mb-8">
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
            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4"><p className="text-red-600 text-sm font-body">{error}</p></div>}
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              onClick={handleStart} disabled={loading}
              className="w-full py-4 rounded-xl bg-sage-600 text-white font-body font-medium flex items-center justify-center gap-2 disabled:opacity-50">
              <PlayIcon className="w-5 h-5" />
              {loading ? t("starting") : t("start_session")}
            </motion.button>
          </motion.div>
        )}

        {phase === "running" && (
          <motion.div key="running" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
            <p className="font-body text-stone-500 text-sm mb-8">{subject}</p>
            <div className="relative w-40 h-40 mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#e8e0cc" strokeWidth="8" />
                <circle cx="60" cy="60" r="54" fill="none" stroke="#5a845f" strokeWidth="8"
                  strokeDasharray={circumference} strokeDashoffset={circumference-(progress/100)*circumference}
                  strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-3xl text-stone-700">{formatTime(timeLeft)}</span>
              </div>
            </div>
            <p className="text-stone-400 text-sm font-body mb-8">{t("stay_focused")}</p>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleQuit}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-cream-300 text-stone-500 font-body text-sm hover:text-red-400 transition-all">
              <StopIcon className="w-4 h-4" /> {t("end_early")}
            </motion.button>
          </motion.div>
        )}

        {phase === "checkin" && (
          <motion.div key="checkin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
            {leoMessage && <div className="bg-sage-50 border border-sage-200 rounded-2xl px-5 py-4"><p className="font-body text-stone-700">{leoMessage}</p></div>}
            {[
              { key: "focus", label: t("focus_rating"), low: t("scattered"), high: t("locked_in") },
              { key: "energy", label: t("energy_level"), low: t("drained"), high: t("energized") },
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

        {phase === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-12">
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