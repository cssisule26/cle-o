import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (e) {
      setError(e.response?.data?.detail || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-50 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }} className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-full orb mx-auto mb-4" />
          <h1 className="font-display text-3xl">Welcome back</h1>
          <p className="text-stone-400 font-body mt-1">Your companion is waiting</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="email" placeholder="Email" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full p-4 rounded-xl border-2 border-cream-300 bg-white font-body focus:outline-none focus:border-sage-400 transition-colors" />
          <input type="password" placeholder="Password" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="w-full p-4 rounded-xl border-2 border-cream-300 bg-white font-body focus:outline-none focus:border-sage-400 transition-colors" />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            type="submit" disabled={loading}
            className="w-full p-4 rounded-xl bg-sage-600 text-white font-body font-medium disabled:opacity-50 hover:bg-sage-700 transition-all">
            {loading ? "Signing in..." : "Sign in →"}
          </motion.button>
        </form>
        <p className="text-center text-stone-400 text-sm mt-6 font-body">
          New here?{" "}
          <Link to="/onboarding" className="text-sage-600 hover:underline">Create an account</Link>
        </p>
      </motion.div>
    </div>
  );
}