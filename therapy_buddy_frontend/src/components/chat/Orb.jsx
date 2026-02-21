import { motion } from "framer-motion";

export default function Orb({ state = "idle", persona = "leo", size = 120 }) {
  // state: "idle" | "listening" | "speaking"
  const isLeo = persona === "leo";

  const colors = isLeo
    ? { from: "#a9c2ab", mid: "#5a845f", to: "#39543c", glow: "rgba(90,132,95," }
    : { from: "#c2a9a9", mid: "#845a5a", to: "#543939", glow: "rgba(132,90,90," };

  const glowSize = state === "idle" ? 0.2 : state === "speaking" ? 0.5 : 0.35;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size + 80, height: size + 80 }}>
      {/* Ripple rings */}
      {state !== "idle" && [0, 1, 2].map((i) => (
        <motion.div key={i} className="absolute rounded-full border"
          style={{ borderColor: colors.glow + "0.3)", width: size, height: size }}
          animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }} />
      ))}

      {/* Main orb */}
      <motion.div
        animate={state === "speaking"
          ? { scale: [1, 1.06, 1], boxShadow: [`0 0 40px ${colors.glow}0.3)`, `0 0 80px ${colors.glow}0.5)`, `0 0 40px ${colors.glow}0.3)`] }
          : state === "listening"
          ? { scale: [1, 1.04, 1] }
          : { scale: 1 }}
        transition={{ duration: state === "speaking" ? 0.8 : 1.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: size, height: size,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 35%, ${colors.from}, ${colors.mid} 50%, ${colors.to})`,
          boxShadow: `0 0 40px ${colors.glow}0.3), 0 0 80px ${colors.glow}0.1)`,
          cursor: "pointer",
        }} />

      {/* Wave bars when speaking */}
      {state === "speaking" && (
        <div className="absolute flex items-center gap-0.5" style={{ bottom: -24 }}>
          {[0.3, 0.7, 1, 0.6, 0.4, 0.8, 0.5].map((h, i) => (
            <motion.div key={i} className="wave-bar"
              style={{ height: 16, animationDelay: `${i * 0.1}s`, animationDuration: `${0.8 + h * 0.4}s` }} />
          ))}
        </div>
      )}

      {/* Mic indicator when listening */}
      {state === "listening" && (
        <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}
          className="absolute text-sage-600 text-xs font-mono" style={{ bottom: -24 }}>
          listening...
        </motion.div>
      )}
    </div>
  );
}