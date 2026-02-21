import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const STEPS = ["persona", "level", "goal", "account"];

const personas = [
  { id: "leo", name: "Leo", gender: "Male", desc: "Calm, grounding, steady", color: "#5a845f" },
  { id: "cleo", name: "Cleo", gender: "Female", desc: "Warm, expressive, nurturing", color: "#845a5a" },
];

const levels = ["High School", "Undergraduate", "Graduate"];
const goals = [
  "Improve mental health", "Better focus & productivity",
  "Manage stress", "Build healthier habits", "Track my mood", "All of the above"
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ persona: "", level: "", goal: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      await register({ email: form.email, password: form.password, persona: form.persona });
      navigate("/");
    } catch (e) {
      setError(e.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const slide = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
    transition: { duration: 0.35, ease: "easeOut" }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-50 px-4">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex gap-2 justify-center mb-10">
          {STEPS.map((_, i) => (
            <motion.div key={i} animate={{ width: i === step ? 24 : 8, opacity: i <= step ? 1 : 0.3 }}
              className="h-2 rounded-full bg-sage-500 transition-all" />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="persona" {...slide}>
              <h1 className="font-display text-3xl text-center mb-2">Who do you want to talk to?</h1>
              <p className="text-center text-stone-500 font-body mb-8">Your companion will be here every day</p>
              <div className="grid grid-cols-2 gap-4">
                {personas.map((p) => (
                  <motion.button key={p.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => { setForm(f => ({ ...f, persona: p.id })); next(); }}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${form.persona === p.id ? "border-sage-500 bg-sage-50" : "border-cream-300 bg-white hover:border-sage-300"}`}>
                    <div className="w-12 h-12 rounded-full mb-3 orb" style={{ background: `radial-gradient(circle at 35% 35%, ${p.color}88, ${p.color})` }} />
                    <div className="font-display text-xl">{p.name}</div>
                    <div className="text-xs text-stone-400 mt-1">{p.desc}</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="level" {...slide}>
              <h1 className="font-display text-3xl text-center mb-2">What's your student level?</h1>
              <p className="text-center text-stone-500 mb-8">We'll personalize your experience</p>
              <div className="flex flex-col gap-3">
                {levels.map((l) => (
                  <motion.button key={l} whileHover={{ x: 4 }} whileTap={{ scale: 0.99 }}
                    onClick={() => { setForm(f => ({ ...f, level: l })); next(); }}
                    className={`p-4 rounded-xl border-2 text-left font-body transition-all ${form.level === l ? "border-sage-500 bg-sage-50" : "border-cream-300 bg-white hover:border-sage-300"}`}>
                    {l}
                  </motion.button>
                ))}
              </div>
              <button onClick={back} className="mt-6 text-stone-400 text-sm w-full text-center hover:text-stone-600">← Back</button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="goal" {...slide}>
              <h1 className="font-display text-3xl text-center mb-2">What brings you here?</h1>
              <p className="text-center text-stone-500 mb-8">Pick what resonates most</p>
              <div className="flex flex-col gap-3">
                {goals.map((g) => (
                  <motion.button key={g} whileHover={{ x: 4 }} whileTap={{ scale: 0.99 }}
                    onClick={() => { setForm(f => ({ ...f, goal: g })); next(); }}
                    className={`p-4 rounded-xl border-2 text-left font-body transition-all ${form.goal === g ? "border-sage-500 bg-sage-50" : "border-cream-300 bg-white hover:border-sage-300"}`}>
                    {g}
                  </motion.button>
                ))}
              </div>
              <button onClick={back} className="mt-6 text-stone-400 text-sm w-full text-center hover:text-stone-600">← Back</button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="account" {...slide}>
              <h1 className="font-display text-3xl text-center mb-2">Create your account</h1>
              <p className="text-center text-stone-500 mb-8">Almost there</p>
              <div className="flex flex-col gap-4">
                <input type="email" placeholder="Email address"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full p-4 rounded-xl border-2 border-cream-300 bg-white font-body focus:outline-none focus:border-sage-400 transition-colors" />
                <input type="password" placeholder="Password"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full p-4 rounded-xl border-2 border-cream-300 bg-white font-body focus:outline-none focus:border-sage-400 transition-colors" />
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-red-600 text-sm text-center font-body">{error}</p>
                  </div>
                )}
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={handleSubmit} disabled={loading || !form.email || !form.password}
                  className="w-full p-4 rounded-xl bg-sage-600 text-white font-body font-medium disabled:opacity-50 transition-all hover:bg-sage-700">
                  {loading ? "Creating account..." : "Start your journey →"}
                </motion.button>
              </div>
              <button onClick={back} className="mt-6 text-stone-400 text-sm w-full text-center hover:text-stone-600">← Back</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}