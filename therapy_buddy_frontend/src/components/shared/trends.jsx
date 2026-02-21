import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { insightsAPI, streaksAPI } from "../../api/client";

const METRICS = [
  { key: "mood",   label: "Mood",   color: "#5a845f" },
  { key: "stress", label: "Stress", color: "#845a5a" },
  { key: "sleep",  label: "Sleep",  color: "#5a6c84" },
];

export default function Trends() {
  const [period, setPeriod]           = useState("weekly");
  const [data, setData]               = useState(null);
  const [score, setScore]             = useState(null);
  const [streaks, setStreaks]         = useState(null);
  const [activeMetric, setActiveMetric] = useState("mood");
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetch = period === "weekly" ? insightsAPI.weekly() : insightsAPI.monthly();
    fetch.then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
    insightsAPI.stabilityScore().then(r => setScore(r.data)).catch(() => {});
    streaksAPI.get().then(r => setStreaks(r.data)).catch(() => {});
  }, [period]);

  const chartData = data?.daily_breakdown?.map(d => ({
    date: new Date(d.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    mood: d.mood,
    stress: d.stress,
    sleep: d.sleep,
  })) || [];

  const scoreColor = score?.score >= 80 ? "#5a845f" : score?.score >= 60 ? "#84755a" : "#845a5a";
  const activeColor = METRICS.find(m => m.key === activeMetric)?.color || "#5a845f";

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-8">
      <h2 className="font-display text-2xl mb-1">Trends</h2>
      <p className="text-stone-400 text-sm font-body mb-6">Your wellness patterns over time</p>

      {/* Top row: stability score + streaks */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {score && (
          <div className="bg-white border border-cream-200 rounded-2xl p-4">
            <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-2">Stability</p>
            <div className="flex items-end gap-1">
              <span className="font-display text-4xl" style={{ color: scoreColor }}>{score.score}</span>
              <span className="text-stone-400 font-body text-sm pb-1">/100</span>
            </div>
            <span className="text-xs font-body px-2 py-0.5 rounded-full mt-1 inline-block"
              style={{ background: scoreColor + "20", color: scoreColor }}>{score.label}</span>
          </div>
        )}
        {streaks && (
          <div className="bg-white border border-cream-200 rounded-2xl p-4">
            <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-2">Streaks</p>
            <div className="flex flex-col gap-1">
              {Object.entries(streaks.streaks).slice(0, 3).map(([key, s]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-xs text-stone-400 font-body">{s.label}</span>
                  <span className="font-display text-sage-600 text-sm">{s.current}🔥</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        {/* Metric selector */}
        <div className="flex gap-2">
          {METRICS.map(m => (
            <button key={m.key} onClick={() => setActiveMetric(m.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-body border transition-all ${activeMetric === m.key ? "text-white border-transparent" : "border-cream-300 text-stone-400"}`}
              style={activeMetric === m.key ? { background: m.color } : {}}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Period toggle */}
        <div className="flex bg-cream-200 rounded-full p-1 gap-1">
          {["weekly", "monthly"].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-full text-xs font-body font-medium capitalize transition-all ${period === p ? "bg-white shadow text-stone-700" : "text-stone-400"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* BIG CHART */}
      <div className="bg-white border border-cream-200 rounded-2xl p-5 mb-6" style={{ height: 420 }}>
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
              className="text-stone-300 font-body text-sm">Loading...</motion.div>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe0" />
              <XAxis dataKey="date"
                tick={{ fontSize: 11, fill: "#a09080", fontFamily: "DM Mono" }}
                axisLine={false} tickLine={false} />
              <YAxis domain={[0, 12]}
                tick={{ fontSize: 11, fill: "#a09080", fontFamily: "DM Mono" }}
                axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontFamily: "DM Sans", fontSize: 13, borderRadius: 12, border: "1px solid #e8e0cc", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
                cursor={{ stroke: activeColor, strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Line
                type="monotone"
                dataKey={activeMetric}
                stroke={activeColor}
                strokeWidth={3}
                dot={{ fill: activeColor, r: 5, strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 7, stroke: activeColor, strokeWidth: 2, fill: "#fff" }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <p className="font-display text-xl text-stone-300 mb-2">No data yet</p>
            <p className="text-stone-400 text-sm font-body">Start logging daily to see trends</p>
          </div>
        )}
      </div>

      {/* Averages row */}
      {data?.averages && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Avg Mood",   value: data.averages.mood },
            { label: "Avg Sleep",  value: data.averages.sleep + "h" },
            { label: "Avg Stress", value: data.averages.stress },
          ].map(s => (
            <div key={s.label} className="bg-white border border-cream-200 rounded-xl p-4 text-center">
              <div className="font-display text-2xl text-stone-700">{s.value}</div>
              <div className="text-xs text-stone-400 font-body mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}