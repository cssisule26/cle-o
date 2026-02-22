import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckIcon } from "@heroicons/react/24/outline";
import { logsAPI, leoAPI, insightsAPI } from "../../api/client";
import { useLang } from "../../context/LanguageContext";

const TYPE_EMOJI = { physical: "💪", mental: "🧠", behavioral: "⚡" };

export default function DailyLogs() {
  const { t } = useLang();
  const [form, setForm] = useState({ mood: 5, stress: 5, sleep_hours: 7, exercise_minutes: 0, water_glasses: 4, notes: "" });
  const [todayLog, setTodayLog]     = useState(null);
  const [leoResponse, setLeoResponse] = useState(null);
  const [goals, setGoals]           = useState(null);
  const [checked, setChecked]       = useState({});
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [phase, setPhase]           = useState("form");

  const SLIDERS = [
    { key: "mood",             label: t("mood"),     low: "😔", high: "😊", max: 10 },
    { key: "stress",           label: t("stress"),   low: "😌", high: "😫", max: 10 },
    { key: "sleep_hours",      label: t("sleep"),    low: "😴", high: "💤", max: 12, step: 0.5 },
    { key: "exercise_minutes", label: t("exercise"), low: "🪑", high: "🏃", max: 120, step: 5 },
    { key: "water_glasses",    label: t("water"),    low: "🌵", high: "💧", max: 12 },
  ];

  useEffect(() => {
    logsAPI.getToday()
      .then(r => { setTodayLog(r.data); setPhase("done"); })
      .catch(() => {});
    insightsAPI.goals()
      .then(r => setGoals(r.data.goals))
      .catch(() => {});
  }, []);

  const toggleGoal = (i) => {
    setChecked(prev => ({ ...prev, [i]: !prev[i] }));
  };

  const doneCount = Object.values(checked).filter(Boolean).length;
  const totalGoals = goals?.length || 0;

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const logRes = await logsAPI.create(form);
      setTodayLog(logRes.data);
      try { const leoRes = await leoAPI.respond(logRes.data.id); setLeoResponse(leoRes.data); } catch {}
      setPhase("response");
    } catch (e) {
      setError(e.response?.data?.detail || "Couldn't save your check-in.");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-8">
      <h2 className="font-display text-2xl mb-1">{t("daily_checkin")}</h2>
      <p className="text-stone-400 text-sm font-body mb-6">{t("how_today")}</p>

      <AnimatePresence mode="wait">
        {phase === "form" && (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {/* Goals with checkboxes */}
            {goals && goals.length > 0 && (
              <div className="mb-7">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-mono text-stone-400 uppercase tracking-widest">{t("todays_goals")}</p>
                  {doneCount > 0 && (
                    <span className="text-xs font-body text-sage-500">{doneCount}/{totalGoals} done</span>
                  )}
                </div>

                {/* Progress bar */}
                {totalGoals > 0 && (
                  <div className="h-1 bg-cream-200 rounded-full mb-3 overflow-hidden">
                    <motion.div className="h-full bg-sage-400 rounded-full"
                      animate={{ width: `${(doneCount / totalGoals) * 100}%` }}
                      transition={{ duration: 0.4 }} />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {goals.map((g, i) => {
                    const done = !!checked[i];
                    return (
                      <motion.button key={i} layout
                        onClick={() => toggleGoal(i)}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                          done
                            ? "border-sage-300 bg-sage-50"
                            : "border-cream-200 bg-cream-50 hover:border-cream-300"
                        }`}>

                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                          done ? "bg-sage-500 border-sage-500" : "border-cream-400"
                        }`}>
                          <AnimatePresence>
                            {done && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                <CheckIcon className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Emoji + text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm">{TYPE_EMOJI[g.type] || "✦"}</span>
                            <span className="text-xs font-mono text-stone-400 uppercase">{g.type}</span>
                          </div>
                          <p className={`font-body text-sm leading-relaxed transition-all ${
                            done ? "text-stone-400 line-through" : "text-stone-600"
                          }`}>{g.goal}</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* All done celebration */}
                <AnimatePresence>
                  {doneCount === totalGoals && totalGoals > 0 && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mt-3 text-center">
                      <p className="text-sm font-body text-sage-600">All goals done today! 🎉</p>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                    max={s.max || 10} step={s.step || 1} value={form[s.key]}
                    onChange={e => setForm(f => ({ ...f, [s.key]: Number(e.target.value) }))}
                    className="flex-1 accent-sage-600" />
                  <span className="text-base">{s.high}</span>
                </div>
              </div>
            ))}

            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder={t("notes_placeholder")}
              rows={3} className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white font-body text-sm focus:outline-none focus:border-sage-400 mb-4 resize-none transition-colors" />

            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4"><p className="text-red-600 text-sm font-body">{error}</p></div>}

            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              onClick={handleSubmit} disabled={loading}
              className="w-full py-4 rounded-xl bg-sage-600 text-white font-body font-medium flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? t("saving") : <><CheckIcon className="w-5 h-5" /> {t("log_today")}</>}
            </motion.button>
          </motion.div>
        )}

        {phase === "response" && (
          <motion.div key="response" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">

            {/* Goals summary if any were checked */}
            {totalGoals > 0 && (
              <div className="bg-white border border-cream-200 rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-sage-100 flex items-center justify-center text-lg">
                  {doneCount === totalGoals ? "🎉" : doneCount > 0 ? "✨" : "💪"}
                </div>
                <div>
                  <p className="font-body text-sm text-stone-700 font-medium">
                    {doneCount === totalGoals ? "All goals completed!" : `${doneCount} of ${totalGoals} goals done`}
                  </p>
                  <p className="text-xs text-stone-400 font-body">Keep it up 💙</p>
                </div>
              </div>
            )}

            {leoResponse ? (
              <>
                <div className="bg-sage-50 border border-sage-200 rounded-2xl p-5">
                  <p className="text-xs font-mono text-sage-500 uppercase tracking-widest mb-2">{t("companion_says")}</p>
                  <p className="font-body text-stone-700 leading-relaxed">{leoResponse.summary}</p>
                </div>
                {[
                  { label: "Physical", value: leoResponse.physical_adjustment },
                  { label: "Mental",   value: leoResponse.mental_reframe },
                  { label: "Action",   value: leoResponse.behavioral_action },
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
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-sage-100 flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="w-6 h-6 text-sage-600" />
            </div>
            <h3 className="font-display text-xl mb-2">{t("already_logged")}</h3>
            <p className="text-stone-400 font-body text-sm">{t("come_back")}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}