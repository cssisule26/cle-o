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
import MusicGen from "../components/music/MusicGen";
import LanguageSwitcher from "../components/shared/LanguageSwitcher";

const TABS = {
  chat: ChatBox,
  logs: DailyLogs,
  study: StudyMode,
  music: MusicGen,
  trends: Trends,
  journal: Journal,
  calendar: Calendar,
  settings: Settings,
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("chat");
  const ActiveComponent = TABS[activeTab] || TABS["chat"];

  return (
    <div className="flex h-screen overflow-hidden bg-cream-50">
      <Sidebar active={activeTab} onChange={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar with language switcher */}
        <div className="flex justify-end items-center px-6 py-3 border-b border-cream-200 bg-cream-50 flex-shrink-0">
          <LanguageSwitcher />
        </div>
        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="h-full"
            >
              <ActiveComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}