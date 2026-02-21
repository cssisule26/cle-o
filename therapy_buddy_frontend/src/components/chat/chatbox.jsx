import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MicrophoneIcon, StopIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useConversation } from "@elevenlabs/react";
import { useAuth } from "../../context/AuthContext";
import Orb from "./Orb";

const AGENT_IDS = {
  leo:  import.meta.env.VITE_LEO_AGENT_ID  || "YOUR_LEO_AGENT_ID",
  cleo: import.meta.env.VITE_CLEO_AGENT_ID || "YOUR_CLEO_AGENT_ID",
};

function Message({ msg }) {
  const isAgent = msg.role === "assistant";
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`flex ${isAgent ? "justify-start" : "justify-end"} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl font-body text-sm leading-relaxed ${
        isAgent
          ? "bg-white border border-cream-300 text-stone-700 rounded-tl-sm"
          : "bg-sage-600 text-white rounded-tr-sm"
      }`}>
        {msg.content}
      </div>
    </motion.div>
  );
}

export default function ChatBox() {
  const { user } = useAuth();
  const personaName = user?.persona === "cleo" ? "Cleo" : "Leo";
  const agentId = AGENT_IDS[user?.persona || "leo"];

  const [messages, setMessages] = useState([
    { role: "assistant", content: `Hi, I'm ${personaName}. How are you feeling today? Tap the mic to talk to me, or type below. 💙` }
  ]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("voice");
  const [micError, setMicError] = useState("");

  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to", personaName);
      setMicError("");
    },
    onDisconnect: () => console.log("Disconnected"),
    onMessage: ({ message, source }) => {
      if (!message) return;
      setMessages(m => [...m, {
        role: source === "ai" ? "assistant" : "user",
        content: message,
      }]);
    },
    onError: (err) => {
      console.error("ElevenLabs error:", err);
      setMicError("Connection error — check your Agent ID in .env");
    },
  });

  const { status, isSpeaking } = conversation;
  const isConnected = status === "connected";
  const orbState = !isConnected ? "idle" : isSpeaking ? "speaking" : "listening";

  // ── Request mic permission explicitly first ────────────
  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop immediately — we just needed permission granted
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setMicError("Microphone blocked. Go to browser settings and allow mic for localhost.");
      } else if (err.name === "NotFoundError") {
        setMicError("No microphone found. Please connect one and try again.");
      } else {
        setMicError("Could not access microphone: " + err.message);
      }
      return false;
    }
  };

  // ── Start voice session ────────────────────────────────
  const startVoiceSession = useCallback(async () => {
    setMicError("");
    const permitted = await requestMicPermission();
    if (!permitted) return;

    try {
      await conversation.startSession({
        agentId,
        connectionType: "webrtc",
      });
    } catch (err) {
      console.error("Failed to start session:", err);
      setMicError("Could not connect to agent. Check your VITE_LEO_AGENT_ID in .env");
    }
  }, [conversation, agentId]);

  // ── End voice session ──────────────────────────────────
  const endVoiceSession = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.error("End session error:", err);
    }
  }, [conversation]);

  // ── Send text message ──────────────────────────────────
  const sendTextMessage = useCallback(async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", content: text }]);

    // Start session first if not connected
    if (!isConnected) {
      const permitted = await requestMicPermission();
      if (!permitted) return;
      try {
        await conversation.startSession({
          agentId,
          connectionType: "webrtc",
        });
      } catch (err) {
        console.error("Session start failed:", err);
        setMicError("Could not connect to agent. Check your VITE_LEO_AGENT_ID in .env");
        return;
      }
    }

    conversation.sendUserMessage(text);
  }, [input, isConnected, conversation, agentId]);

  return (
    <div className="flex flex-col h-full">
      {/* Orb */}
      <div className="flex flex-col items-center pt-8 pb-4">
        <Orb state={orbState} persona={user?.persona} size={100} />
        <p className="font-display text-xl mt-6 text-stone-700">{personaName}</p>
        <p className="text-stone-400 text-xs font-mono mt-1">
          {!isConnected
            ? "tap mic to connect"
            : isSpeaking ? "speaking..." : "listening..."}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex justify-center mb-4">
        <div className="flex bg-cream-200 rounded-full p-1 gap-1">
          {["voice", "text"].map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-5 py-1.5 rounded-full text-xs font-body font-medium transition-all ${
                mode === m ? "bg-white shadow text-stone-700" : "text-stone-400 hover:text-stone-600"}`}>
              {m === "voice" ? "🎙 Voice" : "💬 Text"}
            </button>
          ))}
        </div>
      </div>

      {/* Mic error banner */}
      <AnimatePresence>
        {micError && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mx-4 mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-xs font-body">{micError}</p>
            {micError.includes("blocked") && (
              <p className="text-red-400 text-xs font-body mt-1">
                Chrome: click the 🔒 icon in the address bar → Microphone → Allow
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <AnimatePresence>
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        </AnimatePresence>
      </div>

      {/* Input controls */}
      <div className="p-4 border-t border-cream-200">
        {mode === "voice" ? (
          <div className="flex flex-col items-center gap-3">
            {!isConnected ? (
              <>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={startVoiceSession}
                  className="w-16 h-16 rounded-full bg-sage-600 flex items-center justify-center shadow-lg shadow-sage-200">
                  <MicrophoneIcon className="w-6 h-6 text-white" />
                </motion.button>
                <p className="text-xs text-stone-400 font-body">Tap to start talking to {personaName}</p>
              </>
            ) : (
              <>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={endVoiceSession}
                  className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-200">
                  <StopIcon className="w-6 h-6 text-white" />
                </motion.button>
                <p className="text-xs text-stone-400 font-body">
                  {isSpeaking ? `${personaName} is speaking...` : `${personaName} is listening — speak now`}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendTextMessage()}
              placeholder={`Message ${personaName}...`}
              className="flex-1 px-4 py-3 rounded-xl border border-cream-300 bg-white font-body text-sm focus:outline-none focus:border-sage-400 transition-colors" />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={sendTextMessage} disabled={!input.trim()}
              className="w-11 h-11 rounded-xl bg-sage-600 text-white flex items-center justify-center disabled:opacity-40">
              <PaperAirplaneIcon className="w-4 h-4" />
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}