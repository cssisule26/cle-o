import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "../../context/LanguageContext";

export default function LanguageSwitcher() {
  const { lang, switchLang, languages } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = languages[lang];

  return (
    <div ref={ref} className="relative z-50">
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-cream-200 shadow-sm hover:border-sage-300 transition-all"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="text-xs font-body text-stone-600 font-medium">{current.name}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-stone-400 text-xs leading-none"
        >
          ▾
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-44 bg-white border border-cream-200 rounded-2xl shadow-lg shadow-stone-100 overflow-hidden"
          >
            {Object.entries(languages).map(([code, l]) => (
              <motion.button
                key={code}
                whileHover={{ backgroundColor: "#f5f0e8" }}
                onClick={() => { switchLang(code); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  lang === code ? "bg-sage-50 text-sage-700" : "text-stone-600"
                }`}
              >
                <span className="text-lg leading-none">{l.flag}</span>
                <span className="font-body text-sm">{l.name}</span>
                {lang === code && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sage-500" />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}