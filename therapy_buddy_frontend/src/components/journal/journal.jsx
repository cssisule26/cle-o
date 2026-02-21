import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusIcon, LockClosedIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { journalAPI } from "../../api/client";

const MOOD_TAGS = ["happy", "anxious", "tired", "motivated", "sad", "grateful", "stressed", "calm"];

export default function Journal() {
  const [entries, setEntries] = useState([]);
  const [phase, setPhase] = useState("list"); // list | write | pin
  const [pinVerified, setPinVerified] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [form, setForm] = useState({ title: "", content: "", mood_tag: "", is_private: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchEntries(); }, [pinVerified]);

  const fetchEntries = async () => {
    try {
      const res = await journalAPI.getAll(pinVerified);
      setEntries(res.data);
    } catch {}
  };

  const handleVerifyPin = async () => {
    try {
      await journalAPI.verifyPin(pin);
      setPinVerified(true);
      setPhase("list");
      setPinError("");
    } catch {
      setPinError("Incorrect PIN");
    }
  };

  const handleSave = async () => {
    if (!form.content.trim()) return;
    setLoading(true);
    try {
      await journalAPI.create(form);
      setForm({ title: "", content: "", mood_tag: "", is_private: false });
      setPhase("list");
      fetchEntries();
    } catch {}
    setLoading(false);
  };

  const handleDelete = async (id) => {
    try {
      await journalAPI.delete(id);
      setEntries(e => e.filter(x => x.id !== id));
    } catch {}
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="font-display text-2xl mb-1">Journal</h2>
          <p className="text-stone-400 text-sm font-body">Your private space to reflect</p>
        </div>
        <div className="flex gap-2">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setPhase(phase === "pin" ? "list" : "pin")}
            className="w-9 h-9 rounded-lg border border-cream-300 bg-white flex items-center justify-center text-stone-400 hover:text-stone-600">
            <LockClosedIcon className="w-4 h-4" />
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setPhase("write")}
            className="w-9 h-9 rounded-lg bg-sage-600 flex items-center justify-center text-white">
            <PlusIcon className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "pin" && (
          <motion.div key="pin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-cream-200 rounded-2xl p-6 mb-6">
            <h3 className="font-display text-lg mb-4">{pinVerified ? "PIN verified ✓" : "Enter journal PIN"}</h3>
            {!pinVerified && <>
              <input type="password" maxLength={6} value={pin} onChange={e => setPin(e.target.value)}
                placeholder="4–6 digit PIN" className="w-full px-4 py-3 rounded-xl border border-cream-300 font-mono text-center text-xl tracking-widest focus:outline-none focus:border-sage-400 mb-3" />
              {pinError && <p className="text-red-400 text-sm text-center mb-3">{pinError}</p>}
              <button onClick={handleVerifyPin} className="w-full py-3 rounded-xl bg-sage-600 text-white font-body text-sm">Unlock</button>
            </>}
          </motion.div>
        )}

        {phase === "write" && (
          <motion.div key="write" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display text-lg">New entry</h3>
              <button onClick={() => setPhase("list")}><XMarkIcon className="w-5 h-5 text-stone-400" /></button>
            </div>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Title (optional)" className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white font-body text-sm focus:outline-none focus:border-sage-400" />
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="What's on your mind..." rows={6}
              className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white font-body text-sm focus:outline-none focus:border-sage-400 resize-none" />
            <div>
              <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-2">Mood</p>
              <div className="flex flex-wrap gap-2">
                {MOOD_TAGS.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, mood_tag: f.mood_tag === t ? "" : t }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-body transition-all ${form.mood_tag === t ? "bg-sage-600 text-white" : "bg-cream-200 text-stone-500 hover:bg-cream-300"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_private}
                onChange={e => setForm(f => ({ ...f, is_private: e.target.checked }))}
                className="accent-sage-600" />
              <span className="text-sm font-body text-stone-500 flex items-center gap-1">
                <LockClosedIcon className="w-3.5 h-3.5" /> Private (PIN protected)
              </span>
            </label>
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              onClick={handleSave} disabled={loading || !form.content.trim()}
              className="w-full py-4 rounded-xl bg-sage-600 text-white font-body font-medium disabled:opacity-50">
              {loading ? "Saving..." : "Save entry"}
            </motion.button>
          </motion.div>
        )}

        {phase === "list" && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col gap-3">
            {entries.length === 0 && (
              <div className="text-center py-16">
                <p className="font-display text-xl text-stone-300 mb-2">No entries yet</p>
                <p className="text-stone-400 text-sm font-body">Tap + to write your first</p>
              </div>
            )}
            {entries.map(e => (
              <motion.div key={e.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-cream-200 rounded-xl p-4 relative group">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {e.title && <h4 className="font-display text-base mb-1">{e.title}</h4>}
                    <p className="text-stone-500 font-body text-sm line-clamp-3 leading-relaxed">{e.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-stone-300 font-mono">{new Date(e.created_at).toLocaleDateString()}</span>
                      {e.mood_tag && <span className="text-xs bg-cream-200 text-stone-500 px-2 py-0.5 rounded-full font-body">{e.mood_tag}</span>}
                      {e.is_private && <LockClosedIcon className="w-3 h-3 text-stone-300" />}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(e.id)}
                    className="opacity-0 group-hover:opacity-100 ml-3 text-stone-300 hover:text-red-400 transition-all">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}