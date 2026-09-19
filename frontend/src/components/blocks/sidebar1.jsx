import { useState } from "react";
import { motion } from "motion/react";
import {
  Bell,
  MoreVertical,
  Search,
  Edit3,
  CheckCheck,
} from "lucide-react";

/**
 * Sidebar1 Component from BagUI (@bagui/sidebar1)
 */
export default function Sidebar1() {
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <motion.aside
      className="w-[320px] lg:w-[340px] h-full flex flex-col bg-white dark:bg-zinc-950 border-r border-gray-100 dark:border-zinc-800 select-none"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 overflow-hidden shadow-sm">
          <div className="w-full h-full flex items-center justify-center text-white font-semibold text-sm">
            Me
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-gray-500 dark:text-zinc-400 cursor-pointer">
            <Bell size={18} />
          </button>

          <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-gray-500 dark:text-zinc-400 cursor-pointer">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            placeholder="Search..."
            className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-zinc-900 rounded-xl text-sm text-gray-700 dark:text-zinc-200 placeholder:text-gray-400 outline-none"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3 flex items-center gap-1">
        {["All", "Active", "Archived"].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat
                ? "text-gray-900 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200"
            }`}
          >
            {activeCategory === cat && (
              <span className="absolute inset-0 bg-gray-100 dark:bg-zinc-800 rounded-full" />
            )}
            <span className="relative">{cat}</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {[
          {
            name: "Alex Morgan",
            avatar: "AM",
            message: "See you tomorrow 👋",
            time: "2m",
            online: true,
            verified: true,
            unread: 2,
            color: "from-indigo-500 to-purple-600",
          },
          {
            name: "Isabella Green",
            avatar: "IG",
            message: "The designs look amazing!",
            time: "15m",
            online: false,
            verified: false,
            unread: 0,
            color: "from-orange-400 to-red-500",
          },
          {
            name: "Creative Board",
            avatar: "CB",
            message: "New project uploaded.",
            time: "1h",
            online: false,
            verified: true,
            unread: 5,
            color: "from-red-700 to-red-900",
          },
          {
            name: "Victoria Stone",
            avatar: "VS",
            message: "Thanks for your feedback.",
            time: "3h",
            online: true,
            verified: false,
            unread: 0,
            color: "from-sky-400 to-blue-600",
          },
        ].map((contact, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className={`w-12 h-12 rounded-full bg-gradient-to-br ${contact.color} flex items-center justify-center text-white font-semibold text-sm`}
              >
                {contact.avatar}
              </div>

              {contact.online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-950 rounded-full" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {contact.name}
                  </span>

                  {contact.verified && (
                    <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <CheckCheck size={9} className="text-white" />
                    </span>
                  )}
                </div>

                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                  {contact.time}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-zinc-400 truncate">
                  {contact.message}
                </p>

                {contact.unread > 0 && (
                  <span className="ml-2 min-w-5 h-5 px-1 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                    {contact.unread}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer Button */}
      <div className="p-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 rounded-2xl font-medium text-sm transition-colors cursor-pointer"
        >
          <Edit3 size={16} />
          Start a new task
        </motion.button>
      </div>
    </motion.aside>
  );
}
