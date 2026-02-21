import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MusicalNoteIcon, StopIcon, PlayIcon } from "@heroicons/react/24/outline";
import { useLang } from "../../context/LanguageContext";

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const STREAM_ENDPOINT  = "https://api.elevenlabs.io/v1/music/stream";
const COMPOSE_ENDPOINT = "https://api.elevenlabs.io/v1/music";

const MOOD_PROMPTS = {
  calm_focused: "Soft ambient piano with gentle pads, slow breathing rhythm, perfect for studying. Minimal, soothing, 60 bpm.",
  stressed:     "Gentle lo-fi acoustic guitar with warm vinyl texture, slow calming tempo, grounding like a quiet afternoon.",
  motivated:    "Uplifting indie pop instrumental, bright acoustic guitar, forward momentum, positive energy, 100 bpm.",
  anxious:      "Slow ambient music with soft nature sounds, gentle water, warm drones to reduce anxiety and bring calm.",
  happy:        "Bright cheerful acoustic folk, light percussion, warm guitar fingerpicking, uplifting sunny day vibes.",
  tired:        "Dreamy slow ambient, soft synth pads, gentle sleep-inducing tones, very quiet and warm, 50 bpm.",
};
const MOOD_EMOJIS = { calm_focused: "🧘", stressed: "😮‍💨", motivated: "💪", anxious: "😟", happy: "😊", tired: "😴" };

export default function MusicGen() {
  const { t } = useLang();
  const [prompt, setPrompt]       = useState("");
  const [loading, setLoading]     = useState(false);
  const [playing, setPlaying]     = useState(false);
  const [audioUrl, setAudioUrl]   = useState(null);
  const [error, setError]         = useState("");
  const [generated, setGenerated] = useState(false);
  const audioRef = useRef(null);

  const stopCurrent = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(false);
  };

  const generate = async (customPrompt) => {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim()) { setError(t("music_placeholder")); return; }
    if (!ELEVENLABS_API_KEY) { setError("Add VITE_ELEVENLABS_API_KEY to .env and restart."); return; }

    setLoading(true); setError(""); setGenerated(false);
    stopCurrent();
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }

    const body = JSON.stringify({ prompt: finalPrompt, music_length_ms: 30000 });
    const headers = { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" };

    for (const endpoint of [STREAM_ENDPOINT, COMPOSE_ENDPOINT]) {
      try {
        const res = await fetch(endpoint, { method: "POST", headers, body });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          let msg = `Error ${res.status}`;
          try { const j = JSON.parse(text); msg = j?.detail?.message || j?.detail || msg; } catch {}
          if (res.status === 401) { setError("Invalid API key."); setLoading(false); return; }
          if (res.status === 403) { setError("Music API requires a paid ElevenLabs plan."); setLoading(false); return; }
          if (res.status === 404) continue;
          setError(msg); setLoading(false); return;
        }
        const blob = await res.blob();
        if (blob.size < 1000) continue;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url); setGenerated(true);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onplay  = () => setPlaying(true);
        audio.onpause = () => setPlaying(false);
        audio.onended = () => { setPlaying(false); audioRef.current = null; };
        audio.play().catch(() => {});
        setLoading(false); return;
      } catch (e) {
        if (e.message?.includes("Failed to fetch")) { setError("Network error."); setLoading(false); return; }
        continue;
      }
    }
    setError("Music generation unavailable. Check your ElevenLabs plan.");
    setLoading(false);
  };

  const togglePlay = () => {
    if (!audioRef.current && audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onplay  = () => setPlaying(true);
      audio.onpause = () => setPlaying(false);
      audio.onended = () => { setPlaying(false); audioRef.current = null; };
      audio.play();
    } else if (audioRef.current) {
      playing ? audioRef.current.pause() : audioRef.current.play();
    }
  };

  const MOOD_PRESETS = Object.keys(MOOD_PROMPTS).map(key => ({
    key, emoji: MOOD_EMOJIS[key], label: t(key), prompt: MOOD_PROMPTS[key],
  }));

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-8">
      <h2 className="font-display text-2xl mb-1">{t("music_mood")}</h2>
      <p className="text-stone-400 text-sm font-body mb-8">{t("music_desc")}</p>

      {!ELEVENLABS_API_KEY && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
          <p className="text-amber-700 text-sm font-body font-medium">Setup required</p>
          <p className="text-amber-600 text-xs font-body mt-1">Add <code className="bg-amber-100 px-1 rounded">VITE_ELEVENLABS_API_KEY=your_key</code> to <code className="bg-amber-100 px-1 rounded">.env</code> and restart.</p>
        </div>
      )}

      <div className="mb-6">
        <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-3">{t("quick_moods")}</p>
        <div className="grid grid-cols-3 gap-2">
          {MOOD_PRESETS.map(p => (
            <motion.button key={p.key} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => { setPrompt(p.prompt); generate(p.prompt); }}
              disabled={loading}
              className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border border-cream-200 bg-white hover:border-sage-300 hover:bg-sage-50 transition-all disabled:opacity-40">
              <span className="text-xl">{p.emoji}</span>
              <span className="text-xs font-body text-stone-500 text-center leading-tight">{p.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-3">{t("describe_yourself")}</p>
        <textarea value={prompt} onChange={e => { setPrompt(e.target.value); setError(""); }}
          placeholder={t("music_placeholder")} rows={3}
          className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-white font-body text-sm focus:outline-none focus:border-sage-400 transition-colors resize-none mb-3" />
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          onClick={() => generate()} disabled={loading || !prompt.trim()}
          className="w-full py-4 rounded-xl bg-sage-600 text-white font-body font-medium flex items-center justify-center gap-2 disabled:opacity-40">
          <MusicalNoteIcon className="w-5 h-5" />
          {loading ? t("composing") : t("generate_music")}
        </motion.button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-600 text-sm font-body">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center py-12 gap-4">
            <div className="flex gap-1 items-end h-10">
              {[0,1,2,3,4,5,6].map(i => (
                <motion.div key={i} className="w-1.5 rounded-full bg-sage-400"
                  animate={{ height: ["12px","36px","12px"] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }} />
              ))}
            </div>
            <p className="text-stone-400 font-body text-sm">{t("composing_music")}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {generated && audioUrl && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-cream-200 rounded-2xl p-6 flex flex-col items-center gap-5">
            <div className="flex gap-1 items-end h-14">
              {Array.from({ length: 14 }).map((_, i) => (
                <motion.div key={i} className="w-2 rounded-full bg-sage-400"
                  animate={playing ? { height: [`${8+(i%3)*8}px`,`${24+(i%5)*8}px`,`${8+(i%3)*8}px`] } : { height: "8px" }}
                  transition={{ duration: 0.5+(i%3)*0.15, repeat: Infinity, delay: i*0.06 }} />
              ))}
            </div>
            <p className="font-body text-stone-500 text-sm text-center px-4 line-clamp-2">{prompt}</p>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-sage-600 flex items-center justify-center shadow-lg shadow-sage-200">
              {playing ? <StopIcon className="w-6 h-6 text-white" /> : <PlayIcon className="w-6 h-6 text-white" />}
            </motion.button>
            <p className="text-xs text-stone-300 font-mono">{playing ? t("now_playing") : t("paused")}</p>
            <button onClick={() => generate()} className="text-xs text-sage-500 font-body underline underline-offset-2">{t("generate_another")}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}