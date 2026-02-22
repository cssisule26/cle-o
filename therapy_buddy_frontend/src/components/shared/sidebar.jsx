import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import {
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  PresentationChartLineIcon,
  ClockIcon,
  Cog6ToothIcon,
  MusicalNoteIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

export default function Sidebar({ active, onChange }) {
  const { user } = useAuth();
  const { t } = useLang();
  const personaColor = user?.persona === "cleo" ? "#845a5a" : "#5a845f";

  const NAV = [
    { id: "chat",     label: t("chat"),     icon: ChatBubbleLeftRightIcon },
    { id: "logs",     label: t("checkin"),  icon: ClipboardDocumentListIcon },
    { id: "study",    label: t("study"),    icon: ClockIcon },
    { id: "music",    label: t("music"),    icon: MusicalNoteIcon },
    { id: "trends",   label: t("trends"),   icon: PresentationChartLineIcon },
    { id: "journal",  label: t("journal"),  icon: BookOpenIcon },
    { id: "calendar", label: t("calendar"), icon: CalendarDaysIcon },
    { id: "report",   label: t("report"),        icon: SparklesIcon },
  ];

  return (
    <aside className="w-20 lg:w-56 h-screen flex flex-col bg-white border-r border-cream-200 py-6 flex-shrink-0">
      {/* Logo / orb */}
      <div className="flex flex-col lg:flex-row items-center lg:items-center gap-0 lg:gap-3 px-0 lg:px-5 mb-8">
        <div className="w-9 h-9 rounded-full flex-shrink-0"
          style={{ background: `radial-gradient(circle at 35% 35%, ${personaColor}88, ${personaColor})`, boxShadow: `0 0 20px ${personaColor}40` }} />
        <span className="hidden lg:block font-display text-lg text-stone-700">
          {user?.persona === "cleo" ? "Cleo" : "Leo"}
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 flex-1 px-2 lg:px-3">
        {NAV.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <motion.button key={id} whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
              onClick={() => onChange(id)}
              className={`flex items-center gap-0 lg:gap-3 px-0 lg:px-3 py-3 rounded-xl justify-center lg:justify-start transition-all ${
                isActive ? "bg-sage-50 text-sage-700" : "text-stone-400 hover:text-stone-600 hover:bg-cream-100"}`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="hidden lg:block font-body text-sm">{label}</span>
              {isActive && (
                <motion.div layoutId="activeBar"
                  className="hidden lg:block ml-auto w-1 h-4 rounded-full bg-sage-500" />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="px-2 lg:px-3">
        <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
          onClick={() => onChange("settings")}
          className={`w-full flex items-center gap-0 lg:gap-3 px-0 lg:px-3 py-3 rounded-xl justify-center lg:justify-start transition-all ${
            active === "settings" ? "bg-sage-50 text-sage-700" : "text-stone-400 hover:text-stone-600 hover:bg-cream-100"}`}>
          <Cog6ToothIcon className="w-5 h-5 flex-shrink-0" />
          <span className="hidden lg:block font-body text-sm">{t("settings")}</span>
        </motion.button>
      </div>
    </aside>
  );
}