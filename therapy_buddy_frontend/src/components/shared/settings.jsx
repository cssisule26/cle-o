import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { settingsAPI } from "../../api/client";

export default function Settings() {
  const { user, logout, updateUser } = useAuth();
  const [switching, setSwitching] = useState(false);
  const [saved, setSaved] = useState(false);

  const switchPersona = async (persona) => {
    if (persona === user?.persona || switching) return;
    setSwitching(true);
    try {
      await settingsAPI.switchPersona(persona);
      updateUser({ persona });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Persona switch failed:", e);
    }
    setSwitching(false);
  };

  const personas = [
    { id: "leo",  name: "Leo",  emoji: "🌿", desc: "Calm, grounding, steady" },
    { id: "cleo", name: "Cleo", emoji: "🌸", desc: "Warm, expressive, uplifting" },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-8">
      <h2 className="font-display text-2xl mb-1">Settings</h2>
      <p className="text-stone-400 text-sm font-body mb-8">Customize your experience</p>

      {/* Persona */}
      <div className="mb-8">
        <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-3">Your companion</p>
        <div className="flex flex-col gap-3">
          {personas.map(p => {
            const isActive = user?.persona === p.id;
            return (
              <motion.button key={p.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                onClick={() => switchPersona(p.id)}
                disabled={switching}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all ${
                  isActive
                    ? "border-sage-400 bg-sage-50"
                    : "border-cream-200 bg-white hover:border-cream-300"
                }`}>
                <span className="text-2xl">{p.emoji}</span>
                <div className="flex-1">
                  <p className={`font-body font-medium ${isActive ? "text-sage-700" : "text-stone-600"}`}>{p.name}</p>
                  <p className="text-xs text-stone-400 font-body">{p.desc}</p>
                </div>
                {isActive && (
                  <div className="w-2 h-2 rounded-full bg-sage-500" />
                )}
              </motion.button>
            );
          })}
        </div>

        {saved && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-sage-600 text-sm font-body mt-3 text-center">
            ✓ Companion switched!
          </motion.p>
        )}
      </div>

      {/* Account info */}
      <div className="mb-8">
        <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-3">Account</p>
        <div className="bg-white border border-cream-200 rounded-2xl px-5 py-4">
          <p className="text-sm font-body text-stone-500">Signed in as</p>
          <p className="font-body text-stone-700 font-medium mt-0.5">{user?.email || "demo@therapybuddy.com"}</p>
        </div>
      </div>

      {/* Logout */}
      <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
        onClick={logout}
        className="w-full py-4 rounded-xl border-2 border-red-100 text-red-400 font-body font-medium hover:bg-red-50 hover:border-red-200 transition-all">
        Sign out
      </motion.button>
    </div>
  );
}