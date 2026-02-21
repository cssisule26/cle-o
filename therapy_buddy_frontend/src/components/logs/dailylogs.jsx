import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckIcon } from "@heroicons/react/24/outline";
import { logsAPI, leoAPI, insightsAPI } from "../../api/client";

const SLIDERS = [
  { key: "mood", label: "Mood", low: "😔", high: "😊", max: 10 },
  { key: "stress", label: "Stress", low: "😌", high: "😫", max: 10 },
  { key: "sleep_hours", label: "Sleep (hrs)", low: "😴", high: "💤", max: 12, step: 0.5 },
  { key: "exercise_minutes", label: "Exercise (min)", low: "🪑", high: "🏃", max: 120, step: 5 },
  { key: "water_glasses", label: "Water (glasses)", low: "🌵", high: "💧", max: 12 },
];

export default function DailyLogs() {
  const [form, setForm] = useState({ mood: 5, stress: 5, sleep_hours: 7, exercise_minutes: 0, water_glasses: 4, notes: "" });
  const [todayLog, setTodayLog] = useState(null);
  const [leoResponse, setLeoResponse] = useState(null);
  const [goals, setGoals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("form");

  useEffect(() => {
    logsAPI.getToday()
      .then(r => { setTodayLog(r.data); setPhase("done"); })
      .catch(() => {}); // 404 = not logged yet, stay on form
    insightsAPI.goals()
      .then(r => setGoals(r.data.goals))
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const logRes = await logsAPI.create(form);
      setTodayLog(logRes.data);
      try {
        const leoRes = await leoAPI.respond(logRes.data.id);
        setLeoResponse(leoRes.data);
      } catch {
        // Leo failed but log saved — still show success
      }
      setPhase("response");
    } catch (e) {
      setError(e.response?.data?.detail || "Couldn't save your check-in. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-8">
      <h2 className="font-display text-2xl mb-1">Daily Check-in</h2>
      <p className="text-stone-400 text-sm font-body mb-6">How are you doing today?</p>

      <AnimatePresence mode="wait">
        {phase === "form" && (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* AI Goals */}
            {goals && (
              <div className="mb-6 flex flex-col gap-2">
                <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-1">Today's goals</p>
                {goals.map((g, i) => (
                  <div key={i} className="flex gap-2 items-start bg-cream-100 rounded-xl px-3 py-2">
                    <span className="text-xs text-sage-500 mt-0.5 font-mono">{g.type}</span>
                    <span className="text-xs text-stone-600 font-body">{g.goal}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Sliders */}
            {SLIDERS.map(s => (
              <div key={s.key} className="mb-5">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-body text-stone-600">{s.label}</span>
                  <span className="font-display text-sage-600">{form[s.key]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">{s.low}</span>
                  <input type="range"
                    min={s.key === "mood" || s.key === "stress" ? 1 : 0}
                    max={s.max || 10}
                    step={s.step || 1}
                    value={form[s.key]}
                    onChange={e => setForm(f => ({ ...f, [s.key]: Number(e.target.value) }))}
                    className="flex-1 accent-sage-600" />
                  <span className="text-base">{s.high}</span>
                </div>
              </div>
            ))}

            {/* Notes */}
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Anything on your mind? (optional)"
              rows={3} className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white font-body text-sm focus:outline-none focus:border-sage-400 mb-4 resize-none transition-colors" />

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <p className="text-red-600 text-sm font-body">{error}</p>
              </div>
            )}

            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              onClick={handleSubmit} disabled={loading}
              className="w-full py-4 rounded-xl bg-sage-600 text-white font-body font-medium flex items-center justify-center gap-2 hover:bg-sage-700 transition-colors disabled:opacity-50">
              {loading ? "Saving..." : <><CheckIcon className="w-5 h-5" /> Log today</>}
            </motion.button>
          </motion.div>
        )}

        {phase === "response" && (
          <motion.div key="response" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
            {leoResponse ? (
              <>
                <div className="bg-sage-50 border border-sage-200 rounded-2xl p-5">
                  <p className="text-xs font-mono text-sage-500 uppercase tracking-widest mb-2">Your companion says</p>
                  <p className="font-body text-stone-700 leading-relaxed">{leoResponse.summary}</p>
                </div>
                {[
                  { label: "Physical", value: leoResponse.physical_adjustment },
                  { label: "Mental", value: leoResponse.mental_reframe },
                  { label: "Action", value: leoResponse.behavioral_action },
                ].map(item => (
                  <div key={item.label} className="bg-white border border-cream-200 rounded-xl px-4 py-3">
                    <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="font-body text-sm text-stone-600">{item.value}</p>
                  </div>
                ))}
                <div className="bg-cream-100 rounded-xl px-4 py-3">
                  <p className="font-body text-sm text-stone-500 italic">{leoResponse.encouragement}</p>
                </div>
              </>
            ) : (
              <div className="bg-sage-50 border border-sage-200 rounded-2xl p-5">
                <p className="font-body text-stone-700">Check-in saved! ✓</p>
              </div>
            )}
            <p className="text-center text-xs text-stone-300 font-body mt-2">Logged today 💙</p>
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-sage-100 flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="w-6 h-6 text-sage-600" />
            </div>
            <h3 className="font-display text-xl mb-2">Already logged today</h3>
            <p className="text-stone-400 font-body text-sm">Come back tomorrow 💙</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}