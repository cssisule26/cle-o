import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../components/shared/Sidebar";
import ChatBox from "../components/chat/ChatBox";
import DailyLogs from "../components/logs/DailyLogs";
import StudyMode from "../components/study/StudyMode";
import Trends from "../components/shared/Trends";
import Journal from "../components/journal/Journal";
import Calendar from "../components/calendar/Calendar";
import Settings from "../components/shared/Settings";

const TABS = { chat: ChatBox, logs: DailyLogs, study: StudyMode, trends: Trends, journal: Journal, calendar: Calendar, settings: Settings };

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("chat");
  const ActiveComponent = TABS[activeTab];

  return (
    <div className="flex h-screen overflow-hidden bg-cream-50">
      <Sidebar active={activeTab} onChange={setActiveTab} />
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }} className="h-full">
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}