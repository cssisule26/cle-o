import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SparklesIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const DEMO_DATA = {
  week: "Feb 15 – Feb 21, 2026",
  user: "Chelsea",
  wellness: {
    days_logged: 7,
    averages: { mood: 6.6, stress: 4.9, sleep: 7.2, exercise: 22, water: 6.1 },
    trends: { mood: "improving", stress: "declining", sleep: "stable" },
    stability_score: 74,
    daily: [
      { date: "Feb 15", mood: 6, stress: 5, sleep: 7,   exercise: 20 },
      { date: "Feb 16", mood: 5, stress: 7, sleep: 6,   exercise: 0  },
      { date: "Feb 17", mood: 7, stress: 4, sleep: 8,   exercise: 30 },
      { date: "Feb 18", mood: 6, stress: 6, sleep: 7,   exercise: 15 },
      { date: "Feb 19", mood: 8, stress: 3, sleep: 8,   exercise: 45 },
      { date: "Feb 20", mood: 7, stress: 5, sleep: 7,   exercise: 20 },
      { date: "Feb 21", mood: 7, stress: 4, sleep: 7.5, exercise: 25 },
    ],
  },
  study: {
    total_sessions: 3,
    total_minutes: 133,
    sessions: [
      { subject: "Biology",       duration: 58, focus: 8, energy: 7, camera_focus: 82, distractions: 1, notes: "Got through cell respiration chapter." },
      { subject: "Mathematics",   duration: 30, focus: 6, energy: 5, camera_focus: 61, distractions: 3, notes: "Struggled with integration by parts." },
      { subject: "History Essay", duration: 45, focus: 4, energy: 3, camera_focus: null, distractions: 5, notes: "Too tired, ended early." },
    ],
    avg_focus: 6.0,
    avg_distractions: 3.0,
  },
  chat_highlights: [
    { role: "user",      text: "I'm really stressed about my biology exam next week." },
    { role: "assistant", text: "Let's break it down into smaller pieces. What topic feels hardest right now?" },
    { role: "user",      text: "Cell respiration. I keep mixing up the steps." },
    { role: "assistant", text: "Try drawing the process by hand — it helps cement the sequence. You've shown great consistency this week!" },
    { role: "user",      text: "I've been sleeping better though, that's something." },
    { role: "assistant", text: "Definitely! Your sleep averaged 7.2 hours — that's really solid and it's helping your mood trend upward." },
    { role: "user",      text: "Felt super unmotivated on Tuesday though." },
    { role: "assistant", text: "Tuesday was rough — stress spiked to 7. But you bounced back Wednesday and had your best day Friday. That resilience matters." },
  ],
  streaks: { checkin: 7, sleep: 5, study: 4 },
  upcoming: [
    { title: "Biology Midterm",      date: "Feb 25", type: "exam" },
    { title: "Essay Draft Due",      date: "Feb 23", type: "assignment" },
    { title: "Calculus Problem Set", date: "Feb 22", type: "assignment" },
  ],
};

function buildPrompt(data) {
  return `You are a compassionate student wellness coach. Analyze this student's week and write a warm, personalized weekly report.

Student: ${data.user} | Week: ${data.week}

WELLNESS:
- Logged ${data.wellness.days_logged}/7 days
- Avg mood: ${data.wellness.averages.mood}/10 (${data.wellness.trends.mood}), stress: ${data.wellness.averages.stress}/10 (${data.wellness.trends.stress}), sleep: ${data.wellness.averages.sleep}h (${data.wellness.trends.sleep}), exercise: ${data.wellness.averages.exercise}min/day, water: ${data.wellness.averages.water} glasses
- Stability score: ${data.wellness.stability_score}/100
- Daily: ${JSON.stringify(data.wellness.daily)}

STUDY (${data.study.total_sessions} sessions, ${data.study.total_minutes} mins total):
${data.study.sessions.map(s => `  • ${s.subject}: ${s.duration}min, focus ${s.focus}/10, energy ${s.energy}/10${s.camera_focus ? `, camera ${s.camera_focus}/100` : ""}, ${s.distractions} distractions. "${s.notes}"`).join("\n")}
Avg focus: ${data.study.avg_focus}/10, avg distractions: ${data.study.avg_distractions}

CHAT HIGHLIGHTS:
${data.chat_highlights.map(m => `  ${m.role === "user" ? "Student" : "Leo"}: "${m.text}"`).join("\n")}

STREAKS: Check-in ${data.streaks.checkin}d, Sleep ${data.streaks.sleep}d, Study ${data.streaks.study}d
UPCOMING: ${data.upcoming.map(u => `${u.title} (${u.type}) ${u.date}`).join(", ")}

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "headline": "uplifting summary sentence max 12 words",
  "overall_grade": "letter grade like B+",
  "grade_reason": "one sentence why",
  "highlights": ["3 specific positives referencing real data"],
  "concerns": ["2-3 honest observations to watch"],
  "patterns": {
    "best_day": "day and why",
    "hardest_day": "day and why",
    "insight": "one interesting cross-data pattern"
  },
  "suggestions": [
    {"title": "short title", "detail": "1-2 sentence suggestion", "priority": "high|medium|low", "category": "sleep|stress|study|nutrition|exercise|mindset"},
    {"title": "...", "detail": "...", "priority": "...", "category": "..."},
    {"title": "...", "detail": "...", "priority": "...", "category": "..."},
    {"title": "...", "detail": "...", "priority": "...", "category": "..."}
  ],
  "exam_prep": "specific advice for upcoming Biology Midterm",
  "leo_message": "warm 2-3 sentence personal message from Leo reflecting on the week, written in first person"
}`;
}

function MiniChart({ data, field, color }) {
  const vals = data.map(d => d[field]);
  const max = Math.max(...vals), min = Math.min(...vals), range = max - min || 1;
  const W = 220, H = 48;
  const pts = vals.map((v, i) => `${(i/(vals.length-1))*W},${H - ((v-min)/range)*(H-8) - 4}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible w-full">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {vals.map((v, i) => {
        const x = (i/(vals.length-1))*W, y = H - ((v-min)/range)*(H-8) - 4;
        return <circle key={i} cx={x} cy={y} r="3.5" fill={color} stroke="white" strokeWidth="1.5" />;
      })}
    </svg>
  );
}

const CAT_STYLE = {
  sleep:     "bg-blue-50 border-blue-200 text-blue-600",
  stress:    "bg-rose-50 border-rose-200 text-rose-600",
  study:     "bg-sage-50 border-sage-200 text-sage-700",
  nutrition: "bg-amber-50 border-amber-200 text-amber-600",
  exercise:  "bg-emerald-50 border-emerald-200 text-emerald-700",
  mindset:   "bg-purple-50 border-purple-200 text-purple-600",
};
const PRI_STYLE = { high: "bg-red-100 text-red-600", medium: "bg-amber-100 text-amber-600", low: "bg-stone-100 text-stone-500" };

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden mb-4">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-cream-50 transition-colors">
        <span className="font-display text-base text-stone-700">{title}</span>
        {open ? <ChevronUpIcon className="w-4 h-4 text-stone-400" /> : <ChevronDownIcon className="w-4 h-4 text-stone-400" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WeeklyReport() {
  const [report, setReport]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [generated, setGenerated] = useState(false);
  const topRef = useRef(null);

  const generate = async () => {
    if (!GEMINI_API_KEY) { setError("Add VITE_GEMINI_API_KEY=your_key to your .env file and restart."); return; }
    setLoading(true); setError(""); setReport(null);
    try {
      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(DEMO_DATA) }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Error ${res.status}`); }
      const data  = await res.json();
      const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      setReport(JSON.parse(clean));
      setGenerated(true);
      setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) { setError(e.message || "Failed to generate. Check your Gemini API key."); }
    setLoading(false);
  };

  const gradeColor = !report ? "#a0a0a0"
    : report.overall_grade?.startsWith("A") ? "#5a845f"
    : report.overall_grade?.startsWith("B") ? "#5a6c84"
    : report.overall_grade?.startsWith("C") ? "#84755a"
    : "#845a5a";

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-8" ref={topRef}>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl mb-1">Weekly Report</h2>
          <p className="text-stone-400 text-sm font-body">Powered by Gemini · {DEMO_DATA.week}</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={generate} disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sage-600 text-white font-body text-sm font-medium disabled:opacity-50 shadow-lg shadow-sage-200">
          {loading
            ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            : <SparklesIcon className="w-4 h-4" />}
          {loading ? "Generating..." : generated ? "Regenerate" : "Generate report"}
        </motion.button>
      </div>

      {/* API key warning */}
      {!GEMINI_API_KEY && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <p className="text-amber-700 text-sm font-body font-medium">Setup required</p>
          <p className="text-amber-600 text-xs font-body mt-1">Add <code className="bg-amber-100 px-1 rounded">VITE_GEMINI_API_KEY=your_key</code> to <code className="bg-amber-100 px-1 rounded">.env</code> and restart.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
          <p className="text-red-600 text-sm font-body">{error}</p>
        </div>
      )}

      {/* Loading animation */}
      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-20 gap-4">
          <div className="flex gap-1.5 items-end h-10">
            {[0,1,2,3,4].map(i => (
              <motion.div key={i} className="w-1.5 rounded-full bg-sage-400"
                animate={{ height: ["8px","32px","8px"] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }} />
            ))}
          </div>
          <p className="text-stone-400 font-body text-sm">Gemini is analysing your week...</p>
        </motion.div>
      )}

      {/* Pre-generate data preview */}
      {!report && !loading && (
        <div className="mb-6">
          <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-3">Data included in this report</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Avg mood",    value: `${DEMO_DATA.wellness.averages.mood}/10`,    color: "#5a845f" },
              { label: "Avg sleep",   value: `${DEMO_DATA.wellness.averages.sleep}h`,     color: "#5a6c84" },
              { label: "Avg stress",  value: `${DEMO_DATA.wellness.averages.stress}/10`,  color: "#845a5a" },
              { label: "Study mins",  value: `${DEMO_DATA.study.total_minutes}m`,         color: "#84755a" },
              { label: "Stability",   value: `${DEMO_DATA.wellness.stability_score}/100`, color: "#5a845f" },
              { label: "Sessions",    value: DEMO_DATA.study.total_sessions,              color: "#5a6c84" },
            ].map(s => (
              <div key={s.label} className="bg-white border border-cream-200 rounded-xl px-3 py-3 text-center">
                <p className="text-xs font-mono text-stone-400 mb-1">{s.label}</p>
                <p className="font-display text-xl" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-cream-200 rounded-xl px-4 py-4 mb-4">
            <p className="text-xs font-mono text-stone-400 mb-3">Mood trend</p>
            <MiniChart data={DEMO_DATA.wellness.daily} field="mood" color="#5a845f" />
            <div className="flex justify-between mt-2">
              {DEMO_DATA.wellness.daily.map(d => <span key={d.date} className="text-xs text-stone-300 font-mono">{d.date.split(" ")[1]}</span>)}
            </div>
          </div>
          <div className="bg-sage-50 border border-sage-200 rounded-xl px-4 py-3 text-center">
            <p className="text-sm font-body text-sage-600">Tap <strong>Generate report</strong> to let Gemini analyse your full week ✨</p>
          </div>
        </div>
      )}

      {/* ── GENERATED REPORT ── */}
      <AnimatePresence>
        {report && !loading && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

            {/* Grade hero */}
            <div className="bg-white border border-cream-200 rounded-2xl px-6 py-6 mb-4 flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl flex-shrink-0 flex items-center justify-center" style={{ background: gradeColor + "18" }}>
                <span className="font-display text-4xl" style={{ color: gradeColor }}>{report.overall_grade}</span>
              </div>
              <div>
                <p className="font-display text-lg text-stone-700 leading-snug mb-1.5">{report.headline}</p>
                <p className="text-sm font-body text-stone-400">{report.grade_reason}</p>
              </div>
            </div>

            {/* Leo message */}
            <div className="bg-sage-50 border border-sage-200 rounded-2xl px-5 py-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-sage-500 flex-shrink-0" />
                <span className="text-xs font-mono text-sage-500 uppercase tracking-widest">Leo says</span>
              </div>
              <p className="font-body text-stone-700 leading-relaxed">{report.leo_message}</p>
            </div>

            {/* Highlights */}
            <Section title="✨ Highlights">
              <div className="flex flex-col gap-2">
                {report.highlights?.map((h, i) => (
                  <div key={i} className="flex items-start gap-3 bg-sage-50 rounded-xl px-3 py-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-sage-400 mt-2 flex-shrink-0" />
                    <p className="font-body text-sm text-stone-600">{h}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* Concerns */}
            <Section title="⚠️ Areas to watch">
              <div className="flex flex-col gap-2">
                {report.concerns?.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 bg-amber-50 rounded-xl px-3 py-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                    <p className="font-body text-sm text-stone-600">{c}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* Patterns */}
            <Section title="📊 Patterns">
              <div className="flex flex-col gap-2">
                {[
                  { label: "Best day",    value: report.patterns?.best_day },
                  { label: "Hardest day", value: report.patterns?.hardest_day },
                  { label: "Key insight", value: report.patterns?.insight },
                ].map(p => (
                  <div key={p.label} className="bg-cream-50 rounded-xl px-4 py-3">
                    <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-1">{p.label}</p>
                    <p className="font-body text-sm text-stone-700">{p.value}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* Suggestions */}
            <Section title="💡 Suggestions for next week">
              <div className="flex flex-col gap-3">
                {report.suggestions?.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className={`rounded-xl border px-4 py-3 ${CAT_STYLE[s.category] || CAT_STYLE.mindset}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-body font-semibold">{s.title}</span>
                      <span className={`ml-auto text-xs font-body px-2 py-0.5 rounded-full ${PRI_STYLE[s.priority]}`}>{s.priority}</span>
                    </div>
                    <p className="font-body text-xs text-stone-600 leading-relaxed">{s.detail}</p>
                  </motion.div>
                ))}
              </div>
            </Section>

            {/* Exam prep */}
            <Section title="📚 Exam prep">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-4">
                <p className="font-body text-sm text-stone-700 leading-relaxed">{report.exam_prep}</p>
              </div>
            </Section>

            {/* Charts */}
            <Section title="📈 Trends in charts" defaultOpen={false}>
              {[
                { label: "Mood",     field: "mood",     color: "#5a845f" },
                { label: "Stress",   field: "stress",   color: "#845a5a" },
                { label: "Sleep",    field: "sleep",    color: "#5a6c84" },
                { label: "Exercise", field: "exercise", color: "#84755a" },
              ].map(c => (
                <div key={c.label} className="mb-5">
                  <p className="text-xs font-mono text-stone-400 mb-2">{c.label}</p>
                  <MiniChart data={DEMO_DATA.wellness.daily} field={c.field} color={c.color} />
                  <div className="flex justify-between mt-1">
                    {DEMO_DATA.wellness.daily.map(d => <span key={d.date} className="text-xs text-stone-300 font-mono">{d.date.split(" ")[1]}</span>)}
                  </div>
                </div>
              ))}
            </Section>

            {/* Chat highlights */}
            <Section title="💬 Chat highlights" defaultOpen={false}>
              <div className="flex flex-col gap-2">
                {DEMO_DATA.chat_highlights.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-xl font-body text-xs leading-relaxed ${m.role === "assistant" ? "bg-cream-100 text-stone-600" : "bg-sage-600 text-white"}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <p className="text-center text-xs text-stone-300 font-mono pb-4">Generated by Gemini 2.5 Flash · {DEMO_DATA.week}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}