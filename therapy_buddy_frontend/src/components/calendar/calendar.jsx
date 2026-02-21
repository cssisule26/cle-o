import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusIcon, CheckIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { calendarAPI } from "../../api/client";

const EVENT_TYPES = ["exam", "assignment", "class", "other"];
const TYPE_STYLES = {
  exam: "bg-red-100 text-red-600 border-red-200",
  assignment: "bg-amber-100 text-amber-600 border-amber-200",
  class: "bg-blue-100 text-blue-600 border-blue-200",
  other: "bg-stone-100 text-stone-500 border-stone-200",
};

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [upcoming, setUpcoming] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", event_type: "assignment", subject: "", due_date: "", due_time: "", notes: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
    calendarAPI.getUpcoming(14).then(r => setUpcoming(r.data)).catch(() => {});
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await calendarAPI.getAll();
      setEvents(res.data);
    } catch {}
  };

  const handleSave = async () => {
    if (!form.title || !form.due_date) return;
    setLoading(true);
    try {
      await calendarAPI.create(form);
      setShowForm(false);
      setForm({ title: "", event_type: "assignment", subject: "", due_date: "", due_time: "", notes: "" });
      fetchEvents();
    } catch (e) {
      alert(e.response?.data?.detail || "Couldn't save event");
    }
    setLoading(false);
  };

  const handleComplete = async (id) => {
    try {
      await calendarAPI.complete(id);
      setEvents(ev => ev.map(e => e.id === id ? { ...e, completed: true } : e));
    } catch {}
  };

  const handleDelete = async (id) => {
    try {
      await calendarAPI.delete(id);
      setEvents(ev => ev.filter(e => e.id !== id));
    } catch {}
  };

  const daysUntil = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return `${diff} days`;
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="font-display text-2xl mb-1">Calendar</h2>
          <p className="text-stone-400 text-sm font-body">Exams, assignments & classes</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="w-9 h-9 rounded-lg bg-sage-600 flex items-center justify-center text-white">
          {showForm ? <XMarkIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
        </motion.button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className="bg-white border border-cream-200 rounded-2xl p-5 flex flex-col gap-3">
              <h3 className="font-display text-lg">Add event</h3>
              {/* Type */}
              <div className="flex gap-2 flex-wrap">
                {EVENT_TYPES.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, event_type: t }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-body border capitalize transition-all ${form.event_type === t ? TYPE_STYLES[t] : "border-cream-300 text-stone-400"}`}>
                    {t}
                  </button>
                ))}
              </div>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Title" className="w-full px-4 py-3 rounded-xl border border-cream-300 font-body text-sm focus:outline-none focus:border-sage-400" />
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Subject (optional)" className="w-full px-4 py-3 rounded-xl border border-cream-300 font-body text-sm focus:outline-none focus:border-sage-400" />
              <div className="flex gap-3">
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="flex-1 px-4 py-3 rounded-xl border border-cream-300 font-body text-sm focus:outline-none focus:border-sage-400" />
                <input type="time" value={form.due_time} onChange={e => setForm(f => ({ ...f, due_time: e.target.value }))}
                  className="flex-1 px-4 py-3 rounded-xl border border-cream-300 font-body text-sm focus:outline-none focus:border-sage-400" />
              </div>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                onClick={handleSave} disabled={loading || !form.title || !form.due_date}
                className="w-full py-3 rounded-xl bg-sage-600 text-white font-body text-sm font-medium disabled:opacity-50">
                {loading ? "Saving..." : "Add to calendar"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Events list */}
      <div className="flex flex-col gap-3">
        {events.length === 0 && !showForm && (
          <div className="text-center py-16">
            <p className="font-display text-xl text-stone-300 mb-2">Nothing scheduled</p>
            <p className="text-stone-400 text-sm font-body">Tap + to add an exam or assignment</p>
          </div>
        )}
        {events.map(e => (
          <motion.div key={e.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className={`bg-white border border-cream-200 rounded-xl p-4 flex items-start gap-3 group ${e.completed ? "opacity-50" : ""}`}>
            <button onClick={() => !e.completed && handleComplete(e.id)}
              className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${e.completed ? "bg-sage-500 border-sage-500" : "border-cream-300 hover:border-sage-400"}`}>
              {e.completed && <CheckIcon className="w-3.5 h-3.5 text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-body capitalize ${TYPE_STYLES[e.event_type]}`}>{e.event_type}</span>
                {e.subject && <span className="text-xs text-stone-400 font-body">{e.subject}</span>}
              </div>
              <p className={`font-body text-sm text-stone-700 ${e.completed ? "line-through" : ""}`}>{e.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-stone-400">{new Date(e.due_date).toLocaleDateString()}</span>
                {!e.completed && <span className="text-xs font-body text-sage-600">{daysUntil(e.due_date)}</span>}
              </div>
            </div>
            <button onClick={() => handleDelete(e.id)}
              className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-400 transition-all">
              <TrashIcon className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}