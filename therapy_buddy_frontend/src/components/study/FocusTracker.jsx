import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VideoCameraIcon, VideoCameraSlashIcon, EyeIcon } from "@heroicons/react/24/outline";

const MEDIAPIPE_FACE_MESH_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js";
const MEDIAPIPE_CAMERA_URL    = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js";
const MEDIAPIPE_DRAWING_URL   = "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1675466124/drawing_utils.js";

const LEFT_EYE_TOP = 159, LEFT_EYE_BOTTOM = 145, LEFT_EYE_LEFT = 33, LEFT_EYE_RIGHT = 133;
const RIGHT_EYE_TOP = 386, RIGHT_EYE_BOTTOM = 374, RIGHT_EYE_LEFT = 362, RIGHT_EYE_RIGHT = 263;
const NOSE_TIP = 1, LEFT_CHEEK = 234, RIGHT_CHEEK = 454, FOREHEAD = 10, CHIN = 152;

function eyeAspectRatio(lm, top, bottom, left, right) {
  const h = Math.abs(lm[top].y - lm[bottom].y);
  const w = Math.abs(lm[left].x - lm[right].x);
  return w > 0 ? h / w : 0;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.crossOrigin = "anonymous";
    s.onload = resolve; s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export default function FocusTracker({ active, onScoreUpdate, onSessionData }) {
  // MediaPipe Camera manages its OWN internal video element — we only need canvas for overlay
  const canvasRef    = useRef(null);
  const cameraRef    = useRef(null);
  const faceMeshRef  = useRef(null);
  const scoreHistory = useRef([]);
  const blinkRef     = useRef({ lastEAR: 1, blinkCount: 0, frameCount: 0 });
  const streamRef    = useRef(null);

  const [enabled, setEnabled]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [score, setScore]       = useState(null);
  const [status, setStatus]     = useState("idle");

  const processLandmarks = useCallback((landmarks) => {
    if (!landmarks || landmarks.length === 0) {
      scoreHistory.current.push(0);
      setStatus("no_face");
      return;
    }
    const lm = landmarks;

    const leftEAR  = eyeAspectRatio(lm, LEFT_EYE_TOP, LEFT_EYE_BOTTOM, LEFT_EYE_LEFT, LEFT_EYE_RIGHT);
    const rightEAR = eyeAspectRatio(lm, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM, RIGHT_EYE_LEFT, RIGHT_EYE_RIGHT);
    const avgEAR   = (leftEAR + rightEAR) / 2;

    const bh = blinkRef.current;
    bh.frameCount++;
    if (bh.lastEAR > 0.18 && avgEAR <= 0.18) bh.blinkCount++;
    bh.lastEAR = avgEAR;

    const blinkRate = bh.frameCount > 0 ? (bh.blinkCount / bh.frameCount) * 30 * 60 : 15;

    const noseX    = lm[NOSE_TIP].x;
    const leftX    = lm[LEFT_CHEEK].x;
    const rightX   = lm[RIGHT_CHEEK].x;
    const faceWidth = Math.abs(rightX - leftX);
    const centerX  = (leftX + rightX) / 2;
    const yaw      = faceWidth > 0 ? Math.abs(noseX - centerX) / faceWidth : 0;

    const noseY     = lm[NOSE_TIP].y;
    const faceHeight = Math.abs(lm[CHIN].y - lm[FOREHEAD].y);
    const midY      = (lm[FOREHEAD].y + lm[CHIN].y) / 2;
    const pitch     = faceHeight > 0 ? Math.abs(noseY - midY) / faceHeight : 0;

    let eyeScore   = avgEAR < 0.15 ? 20 : avgEAR < 0.20 ? 60 : avgEAR < 0.35 ? 100 : 80;
    let blinkScore = blinkRate < 5 ? 70 : blinkRate > 35 ? 60 : 100;
    const yawScore   = Math.max(0, 100 - yaw * 300);
    const pitchScore = Math.max(0, 100 - pitch * 200);

    const raw     = eyeScore * 0.35 + blinkScore * 0.15 + yawScore * 0.35 + pitchScore * 0.15;
    const clamped = Math.max(0, Math.min(100, Math.round(raw)));

    scoreHistory.current.push(clamped);
    if (scoreHistory.current.length > 30) scoreHistory.current.shift();

    const rolling = Math.round(scoreHistory.current.reduce((a, b) => a + b, 0) / scoreHistory.current.length);
    setScore(rolling);
    onScoreUpdate?.(rolling);

    if (avgEAR < 0.15)      setStatus("drowsy");
    else if (yaw > 0.25)    setStatus("looking_away");
    else if (rolling >= 75) setStatus("focused");
    else                    setStatus("distracted");
  }, [onScoreUpdate]);

  const startTracking = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // 1. Load scripts
      await loadScript(MEDIAPIPE_FACE_MESH_URL);
      await loadScript(MEDIAPIPE_CAMERA_URL);
      await loadScript(MEDIAPIPE_DRAWING_URL);
      await new Promise(r => setTimeout(r, 600));

      if (!window.FaceMesh || !window.Camera) {
        throw new Error("MediaPipe failed to load. Check your internet connection.");
      }

      // 2. Get raw stream ourselves so we can stop it on cleanup
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" }
      });
      streamRef.current = stream;

      // 3. Create a hidden video element MediaPipe's Camera will control
      const video = document.createElement("video");
      video.width = 320;
      video.height = 240;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();

      // 4. Init FaceMesh
      const faceMesh = new window.FaceMesh({
        locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${f}`
      });
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      faceMesh.onResults((results) => {
        const lm = results.multiFaceLandmarks?.[0] || null;
        processLandmarks(lm);

        // Draw on canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          if (lm && window.drawConnectors && window.FACEMESH_TESSELATION) {
            window.drawConnectors(ctx, lm, window.FACEMESH_TESSELATION,
              { color: "#5a845f55", lineWidth: 0.5 });
          }
        }
      });
      faceMeshRef.current = faceMesh;

      // 5. Camera loop — pass OUR video element, not a ref
      const camera = new window.Camera(video, {
        onFrame: async () => {
          if (faceMeshRef.current) {
            await faceMeshRef.current.send({ image: video });
          }
        },
        width: 320,
        height: 240,
      });
      await camera.start();
      cameraRef.current = camera;

      setEnabled(true);
    } catch (e) {
      if (e.name === "NotAllowedError") setError("Camera blocked — allow camera access and try again.");
      else setError(e.message || "Could not start focus tracking.");
      // Clean up stream if we got one
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    }
    setLoading(false);
  }, [processLandmarks]);

  const stopTracking = useCallback(() => {
    if (cameraRef.current) { try { cameraRef.current.stop(); } catch {} cameraRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (onSessionData && scoreHistory.current.length > 0) {
      const avg = Math.round(scoreHistory.current.reduce((a, b) => a + b, 0) / scoreHistory.current.length);
      onSessionData({ avgFocus: avg, blinkCount: blinkRef.current.blinkCount });
    }
    scoreHistory.current = [];
    blinkRef.current = { lastEAR: 1, blinkCount: 0, frameCount: 0 };
    setEnabled(false);
    setScore(null);
    setStatus("idle");
  }, [onSessionData]);

  useEffect(() => { if (!active && enabled) stopTracking(); }, [active, enabled, stopTracking]);
  useEffect(() => () => stopTracking(), []);

  const STATUS_CONFIG = {
    idle:         { label: "Not started",   color: "#a0a0a0", emoji: "📷" },
    no_face:      { label: "No face found", color: "#845a5a", emoji: "👀" },
    looking_away: { label: "Looking away",  color: "#84755a", emoji: "↩️" },
    focused:      { label: "Focused",       color: "#5a845f", emoji: "🎯" },
    distracted:   { label: "Distracted",    color: "#84755a", emoji: "😶" },
    drowsy:       { label: "Drowsy",        color: "#845a5a", emoji: "😴" },
  };
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  const scoreColor = score === null ? "#a0a0a0" : score >= 75 ? "#5a845f" : score >= 50 ? "#84755a" : "#845a5a";

  return (
    <div className="w-full">
      {!enabled ? (
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={startTracking} disabled={loading}
          className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-cream-300 bg-cream-50 flex items-center justify-center gap-2 text-stone-400 hover:border-sage-300 hover:text-sage-600 transition-all disabled:opacity-60">
          {loading
            ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-sage-400 border-t-transparent rounded-full" />
            : <VideoCameraIcon className="w-4 h-4" />}
          <span className="font-body text-sm">
            {loading ? "Loading camera..." : "Track focus with camera (optional)"}
          </span>
        </motion.button>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-6 right-6 z-50 rounded-2xl overflow-hidden shadow-xl border border-white/20"
          style={{ width: 130, height: 130 }}>
          <div className="relative w-full h-full bg-stone-900">
            <canvas ref={canvasRef} width={240} height={240}
              className="w-full h-full object-cover" />
            {/* Score */}
            <div className="absolute top-1.5 left-1.5 bg-black/60 rounded-lg px-2 py-0.5">
              <span className="font-display text-sm leading-none" style={{ color: scoreColor }}>
                {score !== null ? score : "—"}
              </span>
            </div>
            {/* Status emoji */}
            <div className="absolute top-1.5 right-1.5 bg-black/60 rounded-lg px-1.5 py-0.5 text-xs">
              {cfg.emoji}
            </div>
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
              <motion.div className="h-full"
                animate={{ width: `${score || 0}%`, backgroundColor: scoreColor }}
                transition={{ duration: 0.5 }} />
            </div>
            {/* Stop button */}
            <button onClick={stopTracking}
              className="absolute bottom-1.5 right-1.5 bg-black/60 rounded-md p-0.5 text-white/50 hover:text-red-400 transition-colors">
              <VideoCameraSlashIcon className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}

      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-red-500 text-xs font-body mt-2 text-center">{error}</motion.p>
      )}
    </div>
  );
}