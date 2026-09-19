import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  UserCheck,
  ShieldCheck,
  TrendingUp,
  Award,
  BookOpen,
  Database,
  BotMessageSquare,
  FileText,
  ScanText,
  Sparkles,
  Search,
  Bell,
  MoreVertical,
  CheckCheck,
  ChevronRight,
  X,
  SlidersHorizontal,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import VidhyaPramanLogo from './VidhyaPramanLogo';
import ProfileModal from './ProfileModal';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard & Progress',
    desc: 'Overview, readiness & metrics',
    icon: LayoutDashboard,
    category: 'Core',
    gradient: 'from-blue-600 to-indigo-600',
    badge: 'Active',
  },
  {
    id: 'learning-plan',
    label: 'Learning Roadmap',
    desc: 'Milestones & weekly curriculum',
    icon: TrendingUp,
    category: 'Learning',
    gradient: 'from-sky-500 to-blue-600',
    badge: 'AI Plan',
  },
  {
    id: 'modules',
    label: 'Curriculum Library',
    desc: 'Interactive lessons & sandboxes',
    icon: BookOpen,
    category: 'Learning',
    gradient: 'from-indigo-500 to-purple-600',
    badge: 'Tracks',
  },
  {
    id: 'assessment',
    label: 'Proctored Exam Studio',
    desc: 'Live technical evaluations',
    icon: ShieldCheck,
    category: 'Evaluation',
    gradient: 'from-emerald-500 to-teal-600',
    badge: 'Proctor',
  },
  {
    id: 'onboarding',
    label: 'Skill Intake & Audit',
    desc: 'Initial resume & GitHub audit',
    icon: Sparkles,
    category: 'Evaluation',
    gradient: 'from-amber-500 to-orange-600',
    badge: 'Audit',
  },
  {
    id: 'tutoring',
    label: '1:1 AI Mentor & Notes',
    desc: 'Conversational 24/7 coaching',
    icon: BotMessageSquare,
    category: 'Learning',
    gradient: 'from-violet-500 to-purple-600',
    badge: 'AI 24/7',
  },
  {
    id: 'skill-confidence',
    label: 'Skill Analytics',
    desc: 'GitHub & commit verified score',
    icon: Award,
    category: 'Evaluation',
    gradient: 'from-orange-400 to-red-500',
    badge: 'Rating',
  },
  {
    id: 'rag',
    label: 'Knowledge Assistant',
    desc: 'Semantic doc search & Q&A',
    icon: Database,
    category: 'Learning',
    gradient: 'from-teal-500 to-emerald-600',
    badge: 'RAG',
  },
  {
    id: 'identity',
    label: 'Identity Check',
    desc: 'Facial & credentials verification',
    icon: UserCheck,
    category: 'Security',
    gradient: 'from-blue-500 to-cyan-500',
    badge: 'KYC',
  },
  {
    id: 'documents',
    label: 'Verified Resume & LOR',
    desc: 'Tamper-evident career exports',
    icon: FileText,
    category: 'Career',
    gradient: 'from-blue-600 to-violet-600',
    badge: 'PDF',
  },
  {
    id: 'certificate',
    label: 'Certificate Scanner',
    desc: 'OCR validated credentials',
    icon: ScanText,
    category: 'Career',
    gradient: 'from-rose-500 to-pink-600',
    badge: 'OCR',
  },
];

const CATEGORIES = ['All', 'Learning', 'Evaluation', 'Career'];

/**
 * Sidebar component designed using the @bagui/sidebar1 aesthetic:
 * - Elevated header with avatar, user info & action icons
 * - Pill search bar with real-time filtering
 * - Category filter pills with dynamic count badges
 * - Staggered motion item list with gradient avatars & verified status
 * - Bottom primary action button with hover & tap micro-animations
 */
export default function Sidebar({ activeTab, setActiveTab }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Compute initials for the profile avatar
  const initials = useMemo(() => {
    if (user?.full_name) {
      const parts = user.full_name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.full_name.slice(0, 2).toUpperCase();
    }
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return 'VP';
  }, [user]);

  // Dynamic category counts
  const categoryCounts = useMemo(() => {
    const counts = { All: NAV_ITEMS.length };
    CATEGORIES.slice(1).forEach((cat) => {
      counts[cat] = NAV_ITEMS.filter((item) => item.category === cat).length;
    });
    return counts;
  }, []);

  // Filtered navigation items based on tab & search
  const filteredItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <>
      <motion.aside
        className="w-[280px] lg:w-[310px] h-screen flex flex-col bg-white dark:bg-zinc-950 border-r border-gray-200/80 dark:border-zinc-800/80 select-none flex-shrink-0 transition-colors"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* 1. Brand Header */}
        <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between border-b border-gray-100 dark:border-zinc-800/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <VidhyaPramanLogo size={28} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-brand font-black text-sm tracking-wide text-gray-900 dark:text-white">
                  VIDHYA <span className="text-orange-500">PRAMAN</span>
                </span>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium block truncate">
                Learner Ecosystem
              </span>
            </div>
          </div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 flex-shrink-0">
            AI v2.4
          </span>
        </div>

        {/* 2. User Profile Card (BagUI Sidebar1 Pattern) */}
        <div className="p-3.5 flex items-center justify-between border-b border-gray-100 dark:border-zinc-800/60 bg-gray-50/40 dark:bg-zinc-900/20">
          <div
            onClick={() => setShowProfileModal(true)}
            title="Click to view/edit profile"
            className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
          >
            <div className="relative flex-shrink-0">
              {user?.avatar_url || user?.github_avatar_url ? (
                <img
                  src={user.avatar_url || user.github_avatar_url}
                  alt={user.username || 'User'}
                  className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-zinc-800 shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {initials}
                </div>
              )}
              {/* Live active indicator */}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-950 rounded-full" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-gray-900 dark:text-white text-xs truncate group-hover:text-blue-600 transition-colors">
                  {user?.full_name || user?.username || 'Learner'}
                </span>
                <span className="w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <CheckCheck size={8} className="text-white" />
                </span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-zinc-400 truncate">
                {user?.target_role || 'Verified Learner'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={() => setActiveTab('assessment')}
              title="Proctored Assessments"
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200/60 dark:hover:bg-zinc-800 transition-colors text-gray-500 dark:text-zinc-400 cursor-pointer"
            >
              <Bell size={14} />
            </button>
            <button
              onClick={() => setShowProfileModal(true)}
              title="Account Settings"
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200/60 dark:hover:bg-zinc-800 transition-colors text-gray-500 dark:text-zinc-400 cursor-pointer"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

        {/* 3. Search Box (BagUI Sidebar1 Pattern) */}
        <div className="px-3.5 pt-3 pb-2">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search studios & tools..."
              className="w-full pl-8 pr-7 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={12} />
              </button>
            ) : (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-zinc-500 pointer-events-none">
                ⌘K
              </span>
            )}
          </div>
        </div>

        {/* 4. Category Filter Tabs (BagUI Sidebar1 Pattern) */}
        <div className="px-3.5 pb-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isCatActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer flex-shrink-0 ${
                  isCatActive
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
                }`}
              >
                {isCatActive && (
                  <span className="absolute inset-0 bg-gray-100 dark:bg-zinc-800 rounded-full -z-0" />
                )}
                <span className="relative z-10">{cat}</span>
                <span
                  className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    isCatActive
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-zinc-900'
                      : 'bg-gray-200/80 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                  }`}
                >
                  {categoryCounts[cat] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* 5. Studio Navigation List (BagUI Sidebar1 Card Pattern) */}
        <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-1">
          {filteredItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.015, duration: 0.2 }}
                onClick={() => setActiveTab(item.id)}
                className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 shadow-sm'
                    : 'hover:bg-gray-50 dark:hover:bg-zinc-900/80 border border-transparent'
                }`}
              >
                {/* Icon in Gradient Container */}
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-sm`}
                  >
                    <Icon size={15} />
                  </div>
                  {isActive && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-blue-600 border-2 border-white dark:border-zinc-950 rounded-full" />
                  )}
                </div>

                {/* Title & Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`font-semibold text-xs truncate ${
                        isActive
                          ? 'text-blue-950 dark:text-blue-200 font-bold'
                          : 'text-gray-900 dark:text-zinc-200'
                      }`}
                    >
                      {item.label}
                    </span>

                    {item.badge && (
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ml-1 ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400 truncate leading-tight">
                      {item.desc}
                    </p>
                    {isActive && (
                      <ChevronRight size={12} className="text-blue-600 dark:text-blue-400 flex-shrink-0 ml-1" />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-gray-400 dark:text-zinc-500 text-xs">
              No studios match "{searchQuery}"
            </div>
          )}
        </div>

        {/* 6. Bottom Action & System Status (BagUI Sidebar1 Pattern) */}
        <div className="p-3 border-t border-gray-100 dark:border-zinc-800/60 bg-gray-50/50 dark:bg-zinc-900/30">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('assessment')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-gray-900 rounded-xl font-medium text-xs transition-colors cursor-pointer shadow-sm"
          >
            <ShieldCheck size={14} />
            <span>Launch Proctored Exam</span>
          </motion.button>

          <div className="mt-2.5 flex items-center justify-between px-1 text-[10px] text-zinc-400 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>AI Engine Operational</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-500">100% Verified</span>
          </div>
        </div>
      </motion.aside>

      {/* Settings / Profile Modal */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </>
  );
}
