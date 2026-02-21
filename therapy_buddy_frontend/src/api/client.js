import axios from "axios";

// ── Demo mode for UI components (logs, study, calendar, journal, trends)
// Chat/voice uses real ElevenLabs agents regardless
const DEMO = true;

const mockData = {
  leoResponse: {
    summary: "You're doing really well this week! Your consistency has been impressive and your mood is trending upward.",
    physical_adjustment: "Try a 10-minute walk between study sessions today — it'll reset your focus.",
    mental_reframe: "Instead of focusing on what's left to do, take a moment to acknowledge what you've already accomplished.",
    behavioral_action: "Drink a glass of water right now and set a timer for your next break.",
    encouragement: "Every small step forward is still progress. I'm proud of you. 💙",
    risk_level: 0.0,
    trend_summary: null,
  },
  weekly: {
    period: "7 days",
    daily_breakdown: [
      { date: "2026-02-15", mood: 6, stress: 5, sleep: 7,   exercise: 20, water: 6 },
      { date: "2026-02-16", mood: 5, stress: 7, sleep: 6,   exercise: 0,  water: 4 },
      { date: "2026-02-17", mood: 7, stress: 4, sleep: 8,   exercise: 30, water: 7 },
      { date: "2026-02-18", mood: 6, stress: 6, sleep: 7,   exercise: 15, water: 5 },
      { date: "2026-02-19", mood: 8, stress: 3, sleep: 8,   exercise: 45, water: 8 },
      { date: "2026-02-20", mood: 7, stress: 5, sleep: 7,   exercise: 20, water: 6 },
      { date: "2026-02-21", mood: 7, stress: 4, sleep: 7.5, exercise: 25, water: 7 },
    ],
    averages: { mood: 6.6, stress: 4.9, sleep: 7.2, exercise: 22, water: 6.1 },
    trends: { mood: "improving", stress: "declining", sleep: "stable" },
    days_logged: 7,
  },
  stabilityScore: {
    score: 74, label: "Steady",
    breakdown: { mood: 66, sleep: 82, stress_management: 76, consistency: 100 },
  },
  streaks: {
    streaks: {
      log:   { current: 7, best: 7, label: "Daily Check-in" },
      sleep: { current: 5, best: 5, label: "Sleep Goal" },
      study: { current: 4, best: 4, label: "Study Session" },
    },
    message: "🔥 7 days strong — you're building real momentum!",
  },
  goals: {
    goals: [
      { type: "physical",   goal: "Aim for 7 hours of sleep tonight — you're close to your goal!" },
      { type: "mental",     goal: "Take 5 deep breaths before your next study session to reset focus." },
      { type: "behavioral", goal: "Drink 8 glasses of water today — you averaged 6 this week." },
    ],
  },
  studyStats: {
    total_sessions: 12, total_minutes: 480, total_hours: 8,
    avg_focus: 7.8, avg_duration: 40, favorite_subject: "Biology",
    most_used_duration: 60, completion_rate: 83,
  },
  studyToday: { sessions: [], total_minutes_today: 60, sessions_completed: 1 },
  calendar: [
    { id: "1", title: "Biology Midterm",      event_type: "exam",       subject: "Biology", due_date: "2026-02-25", due_time: "10:00", completed: false, created_at: new Date().toISOString() },
    { id: "2", title: "Essay Draft Due",       event_type: "assignment", subject: "English", due_date: "2026-02-23", due_time: null,    completed: false, created_at: new Date().toISOString() },
    { id: "3", title: "Calculus Problem Set",  event_type: "assignment", subject: "Math",    due_date: "2026-02-22", due_time: "23:59", completed: false, created_at: new Date().toISOString() },
  ],
  journal: [
    { id: "1", title: "First week back", content: "Feeling more settled this week. Classes are intense but I'm managing better than last semester.", mood_tag: "motivated", is_private: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ],
};

// ── Axios instance (used only when DEMO = false) ──────────
const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthRoute = err.config?.url?.includes("/auth/");
    if (err.response?.status === 401 && isAuthRoute) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth (always real) ────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login:    (data) => api.post("/auth/login", data),
  me:       ()     => api.get("/auth/me"),
};

// ── Logs ─────────────────────────────────────────────────
export const logsAPI = {
  create:   (data)      => DEMO
    ? Promise.resolve({ data: { id: "log-" + Date.now(), ...data, user_id: "demo", date: new Date().toISOString().split("T")[0], created_at: new Date().toISOString() } })
    : api.post("/logs", data),
  getAll:   (range = 7) => DEMO
    ? Promise.resolve({ data: mockData.weekly.daily_breakdown })
    : api.get("/logs?range=" + range),
  getToday: ()          => DEMO
    ? Promise.reject({ response: { status: 404 } })
    : api.get("/logs/today"),
  delete:   (id)        => DEMO ? Promise.resolve({}) : api.delete("/logs/" + id),
};

// ── Leo ───────────────────────────────────────────────────
export const leoAPI = {
  respond: (daily_log_id) => DEMO
    ? Promise.resolve({ data: mockData.leoResponse })
    : api.post("/leo/respond", { daily_log_id }),
};

// ── Study ─────────────────────────────────────────────────
let demoSessions = [];

export const studyAPI = {
  start: (data) => {
    if (!DEMO) return api.post("/study/start", data);
    const session = { id: "session-" + Date.now(), ...data, duration_minutes: 0, completed: false, focus_rating: null, energy_rating: null, post_notes: null, created_at: new Date().toISOString() };
    demoSessions.push(session);
    return Promise.resolve({ data: session });
  },
  end: (data) => {
    if (!DEMO) return api.post("/study/end", data);
    return Promise.resolve({ data: { ...data, leo_prompt: `Great work! ${data.duration_minutes} minutes of focused studying. How do you feel?`, created_at: new Date().toISOString() } });
  },
  checkin: (id, data)   => DEMO ? Promise.resolve({ data: { message: "Saved" } }) : api.post("/study/" + id + "/checkin", data),
  history: (limit = 10) => DEMO ? Promise.resolve({ data: demoSessions }) : api.get("/study/history?limit=" + limit),
  stats:   ()           => DEMO ? Promise.resolve({ data: mockData.studyStats }) : api.get("/study/stats"),
  today:   ()           => DEMO ? Promise.resolve({ data: mockData.studyToday }) : api.get("/study/today"),
};

// ── Journal ───────────────────────────────────────────────
let demoJournal = [...mockData.journal];

export const journalAPI = {
  create: (data) => {
    if (!DEMO) return api.post("/journal", data);
    const entry = { id: "j-" + Date.now(), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    demoJournal.unshift(entry);
    return Promise.resolve({ data: entry });
  },
  getAll:    (includePrivate = false) => DEMO ? Promise.resolve({ data: demoJournal }) : api.get("/journal?include_private=" + includePrivate),
  get:       (id)                     => DEMO ? Promise.resolve({ data: demoJournal.find(e => e.id === id) || demoJournal[0] }) : api.get("/journal/" + id),
  update:    (id, data)               => DEMO ? Promise.resolve({ data }) : api.patch("/journal/" + id, data),
  delete:    (id)                     => { if (DEMO) { demoJournal = demoJournal.filter(e => e.id !== id); return Promise.resolve({}); } return api.delete("/journal/" + id); },
  setPin:    (pin)                    => DEMO ? Promise.resolve({ data: { message: "PIN set" } }) : api.post("/journal/pin/set", { pin }),
  verifyPin: (pin)                    => DEMO ? Promise.resolve({ data: { verified: true } }) : api.post("/journal/pin/verify", { pin }),
};

// ── Calendar ──────────────────────────────────────────────
let demoCalendar = [...mockData.calendar];

export const calendarAPI = {
  create: (data) => {
    if (!DEMO) return api.post("/calendar", data);
    const event = { id: "c-" + Date.now(), ...data, completed: false, created_at: new Date().toISOString() };
    demoCalendar.push(event);
    return Promise.resolve({ data: event });
  },
  getAll:      (upcomingOnly = true) => DEMO ? Promise.resolve({ data: demoCalendar }) : api.get("/calendar?upcoming_only=" + upcomingOnly),
  getUpcoming: (days = 7)            => DEMO ? Promise.resolve({ data: { days_ahead: days, events: {} } }) : api.get("/calendar/upcoming?days=" + days),
  complete:    (id)                  => {
    if (DEMO) { demoCalendar = demoCalendar.map(e => e.id === id ? { ...e, completed: true } : e); return Promise.resolve({ data: { id, completed: true } }); }
    return api.patch("/calendar/" + id + "/complete");
  },
  delete: (id) => {
    if (DEMO) { demoCalendar = demoCalendar.filter(e => e.id !== id); return Promise.resolve({}); }
    return api.delete("/calendar/" + id);
  },
};

// ── Insights ──────────────────────────────────────────────
export const insightsAPI = {
  weekly:         () => DEMO ? Promise.resolve({ data: mockData.weekly })         : api.get("/insights/weekly"),
  monthly:        () => DEMO ? Promise.resolve({ data: mockData.weekly })         : api.get("/insights/monthly"),
  goals:          () => DEMO ? Promise.resolve({ data: mockData.goals })          : api.get("/insights/goals"),
  stabilityScore: () => DEMO ? Promise.resolve({ data: mockData.stabilityScore }) : api.get("/insights/stability-score"),
};

// ── Streaks ───────────────────────────────────────────────
export const streaksAPI = {
  get: () => DEMO ? Promise.resolve({ data: mockData.streaks }) : api.get("/streaks"),
};

// ── Settings ──────────────────────────────────────────────
export const settingsAPI = {
  switchPersona: (persona) => DEMO ? Promise.resolve({ data: { persona } }) : api.patch("/settings/persona", { persona }),
  getMe:         ()        => DEMO ? Promise.resolve({ data: {} })           : api.get("/settings/me"),
  updateGoals:   (data)    => DEMO ? Promise.resolve({ data })               : api.patch("/settings/goals", data),
};

// ── Voice (always real - uses ElevenLabs agents directly) ─
export const voiceAPI = {
  textToSpeech: async (text) => {
    if (DEMO) return null;
    try {
      const res = await api.post("/voice/text-to-speech?text=" + encodeURIComponent(text), null, { responseType: "blob" });
      return URL.createObjectURL(res.data);
    } catch { return null; }
  },
  speak: async (audioBlob) => {
    if (DEMO) return { audioUrl: null, transcript: "Demo mode", riskLevel: 0 };
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      const res = await api.post("/voice/speak", formData, { headers: { "Content-Type": "multipart/form-data" }, responseType: "blob" });
      return { audioUrl: URL.createObjectURL(res.data), transcript: res.headers["x-transcript"] || "", riskLevel: parseFloat(res.headers["x-risk-level"] || "0") };
    } catch (err) { throw err; }
  },
};