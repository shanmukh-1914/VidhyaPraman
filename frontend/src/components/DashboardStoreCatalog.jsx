import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutGrid,
  Filter,
  ArrowUpDown,
  SlidersHorizontal,
  Download,
  Plus,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Star,
  Trash2,
  X,
  Info,
  ExternalLink,
  ShieldCheck,
  Award,
  BookOpen,
  Sparkles,
  MoreHorizontal,
  CheckCircle2,
} from 'lucide-react';

// Animation variants matching BagUI
const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

// BagUI Status Pill styling
const STATUS_STYLES = {
  Completed: 'bg-zinc-100 text-zinc-950 font-semibold',
  Active: 'bg-zinc-100 text-zinc-950 font-semibold',
  Verified: 'bg-emerald-500 text-zinc-950 font-semibold',
  'In Progress':
    'bg-zinc-900 text-zinc-300 border border-zinc-700',
  'Pending Exam':
    'bg-amber-950/60 text-amber-300 border border-amber-800/60',
  Scheduled:
    'bg-zinc-900 text-zinc-400 border border-zinc-800',
};

// Initial learning catalog dataset grounded in Vidhya Praman
const INITIAL_TRACKS = [
  {
    id: 'trk-1',
    name: 'Machine Learning & Neural Architecture',
    category: 'AI & ML',
    studio: 'modules',
    status: 'Completed',
    rating: 5,
    score: '98% Proctor Score',
    updated: '2 days ago',
    instructor: 'AI Mentor & Lab',
  },
  {
    id: 'trk-2',
    name: 'Distributed Systems & Go Microservices',
    category: 'Backend',
    studio: 'modules',
    status: 'In Progress',
    rating: 4,
    score: 'Audit Verified',
    updated: 'Today',
    instructor: 'Open Source Repo',
  },
  {
    id: 'trk-3',
    name: 'System Design & High-Throughput APIs',
    category: 'Evaluation',
    studio: 'assessment',
    status: 'Completed',
    rating: 5,
    score: '94% Exam Passed',
    updated: '3 days ago',
    instructor: 'Proctored Studio',
  },
  {
    id: 'trk-4',
    name: 'Vector Search & Enterprise RAG Pipelines',
    category: 'AI & ML',
    studio: 'rag',
    status: 'In Progress',
    rating: 5,
    score: 'High Confidence',
    updated: 'Yesterday',
    instructor: 'Knowledge Assistant',
  },
  {
    id: 'trk-5',
    name: 'Algorithmic Problem Solving & Trees',
    category: 'Evaluation',
    studio: 'assessment',
    status: 'Completed',
    rating: 4,
    score: '91% Exam Passed',
    updated: '5 days ago',
    instructor: 'Live Code Sandbox',
  },
  {
    id: 'trk-6',
    name: 'Zero-Knowledge Proofs & Identity KYC',
    category: 'Security',
    studio: 'identity',
    status: 'Pending Exam',
    rating: 3,
    score: 'KYC Verified',
    updated: '1 week ago',
    instructor: 'Facial Auth Engine',
  },
  {
    id: 'trk-7',
    name: 'Tamper-Evident Career Resume & LOR',
    category: 'Career',
    studio: 'documents',
    status: 'Active',
    rating: 5,
    score: 'SHA-256 Stamp',
    updated: 'Yesterday',
    instructor: 'Cryptographic Engine',
  },
  {
    id: 'trk-8',
    name: 'AWS Solutions Architecture & Docker',
    category: 'Cloud',
    studio: 'certificate',
    status: 'Verified',
    rating: 5,
    score: 'OCR Authenticated',
    updated: '4 days ago',
    instructor: 'Doc Scanner OCR',
  },
];

export default function DashboardStoreCatalog({ user, activities, setActiveTab }) {
  const [tracks, setTracks] = useState(INITIAL_TRACKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortOption, setSortOption] = useState('Default');
  const [showStats, setShowStats] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [focusedStat, setFocusedStat] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [toasts, setToasts] = useState([]);

  // Toast notification trigger
  const addToast = (msg, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  // Dynamic Statistics
  const stats = useMemo(() => {
    const totalRepos = user?.github_public_repos || 14;
    const passedExams =
      activities?.filter((a) => a.activity_type === 'assessment').length || 4;

    return [
      {
        label: 'Career Readiness Index',
        value: '84%',
        delta: '+ 4%',
        subtitle: 'vs last month',
        isPositive: true,
      },
      {
        label: 'Verified Code Repos',
        value: String(totalRepos),
        delta: '+ 2',
        subtitle: 'new commits audited',
        isPositive: true,
      },
      {
        label: 'Passed Proctored Exams',
        value: String(passedExams),
        delta: '100%',
        subtitle: 'integrity pass rate',
        isPositive: true,
      },
      {
        label: 'Active Study Tracks',
        value: '6',
        delta: '+ 1',
        subtitle: 'milestone on schedule',
        isPositive: true,
      },
    ];
  }, [user, activities]);

  // Filtering & Sorting
  const filteredTracks = useMemo(() => {
    let result = tracks.filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.score.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'All' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (sortOption === 'Name (A-Z)') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'Rating') {
      result = [...result].sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [tracks, searchQuery, statusFilter, sortOption]);

  // Paginated Rows
  const paginatedTracks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTracks.slice(start, start + pageSize);
  }, [filteredTracks, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredTracks.length / pageSize));

  // Selection handlers
  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === paginatedTracks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedTracks.map((r) => r.id)));
    }
  };

  // Export CSV Action
  const handleExportCSV = () => {
    const headers = ['Track Name', 'Category', 'Status', 'Rating', 'Score', 'Studio'];
    const rows = filteredTracks.map((t) => [
      `"${t.name}"`,
      `"${t.category}"`,
      `"${t.status}"`,
      t.rating,
      `"${t.score}"`,
      `"${t.studio}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'VidhyaPraman_Progress_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Progress report exported as CSV', 'success');
  };

  const handleBulkClear = () => {
    setSelectedIds(new Set());
    addToast('Selection cleared');
  };

  return (
    <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm transition-colors">
      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="pointer-events-auto flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl dark:bg-neutral-100 dark:text-neutral-900"
            >
              <CheckCircle2 size={14} className="text-emerald-400 dark:text-emerald-600" />
              <span>{t.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-white">
              Curriculum Tracks & Verification Hub
            </h2>
            <span className="rounded-full bg-blue-950/60 px-2 py-0.5 text-[11px] font-semibold text-blue-400 border border-blue-800/60">
              Interactive Catalog
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Search, filter, and audit verified milestones, assessments, and tamper-evident credentials.
          </p>
        </div>

        {/* Global Toolbar Controls (BagUI Toolbar Pattern) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search tracks, scores..."
              className="h-8 rounded-lg border border-zinc-800 bg-zinc-900 pl-8 pr-3 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none transition-all focus:border-blue-500 focus:bg-zinc-900"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 text-xs font-medium text-zinc-200 outline-none hover:border-zinc-700"
            >
              <option className="bg-zinc-900 text-zinc-100" value="All">All Statuses</option>
              <option className="bg-zinc-900 text-zinc-100" value="Completed">Completed</option>
              <option className="bg-zinc-900 text-zinc-100" value="In Progress">In Progress</option>
              <option className="bg-zinc-900 text-zinc-100" value="Pending Exam">Pending Exam</option>
              <option className="bg-zinc-900 text-zinc-100" value="Active">Active</option>
              <option className="bg-zinc-900 text-zinc-100" value="Verified">Verified</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="h-8 cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 text-xs font-medium text-zinc-200 outline-none hover:border-zinc-700"
            >
              <option className="bg-zinc-900 text-zinc-100" value="Default">Sort: Default</option>
              <option className="bg-zinc-900 text-zinc-100" value="Name (A-Z)">Name (A-Z)</option>
              <option className="bg-zinc-900 text-zinc-100" value="Rating">Highest Rated</option>
            </select>
          </div>

          {/* Show Stats Toggle */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors cursor-pointer ${
              showStats
                ? 'border-zinc-700 bg-zinc-800 text-white'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <SlidersHorizontal size={12} />
            <span>Stats</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            title="Export to CSV"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer transition-colors"
          >
            <Download size={12} />
            <span>Export</span>
          </button>

          {/* Quick Launch */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('assessment')}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold px-3 text-xs cursor-pointer shadow-sm"
          >
            <Plus size={13} />
            <span>New Exam</span>
          </motion.button>
        </div>
      </div>

      {/* BagUI StatsRow Cards */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((s) => {
                const isFocused = focusedStat === s.label;
                return (
                  <button
                    key={s.label}
                    onClick={() => setFocusedStat(isFocused ? null : s.label)}
                    className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                      isFocused
                        ? 'border-zinc-500 bg-zinc-900 shadow-md'
                        : 'border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400">
                      <span>{s.label}</span>
                      <Info size={11} className="text-zinc-500" />
                    </div>
                    <div className="mt-1.5 text-2xl font-bold tracking-tight text-white">
                      {s.value}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <span>{s.subtitle}</span>
                      <span className="inline-flex items-center rounded-full border border-emerald-900/40 bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                        {s.delta}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BagUI Interactive ProductTable */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/70">
              <th className="w-10 py-2.5 pl-3">
                <input
                  type="checkbox"
                  checked={
                    paginatedTracks.length > 0 &&
                    selectedIds.size === paginatedTracks.length
                  }
                  onChange={toggleAll}
                  className="rounded border-zinc-700 accent-blue-600 cursor-pointer"
                />
              </th>
              <th className="py-2.5 pr-4 text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                Track & Curriculum
              </th>
              <th className="py-2.5 pr-4 text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                Category
              </th>
              <th className="py-2.5 pr-4 text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                Status
              </th>
              <th className="py-2.5 pr-4 text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                Competency Rating
              </th>
              <th className="py-2.5 pr-4 text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                Evidence / Score
              </th>
              <th className="py-2.5 pr-4 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedTracks.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-10 text-center text-xs text-zinc-400"
                >
                  No tracks match your query "{searchQuery}"
                </td>
              </tr>
            ) : (
              paginatedTracks.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`border-b border-zinc-850/80 text-xs transition-colors ${
                      isSelected
                        ? 'border-l-4 border-l-blue-500 bg-zinc-900/60'
                        : 'hover:bg-zinc-900/40'
                    }`}
                  >
                    <td className="py-3 pl-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(item.id)}
                        className="rounded border-zinc-700 accent-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-zinc-100">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {item.instructor} • Updated {item.updated}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          STATUS_STYLES[item.status] ||
                          'bg-zinc-900 text-zinc-300 border border-zinc-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={
                              i < item.rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-zinc-700'
                            }
                          />
                        ))}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-medium text-zinc-200">
                        {item.score}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <button
                        onClick={() => {
                          setActiveTab(item.studio);
                          addToast(`Navigating to ${item.name}`);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white cursor-pointer transition-all"
                      >
                        <span>Open</span>
                        <ExternalLink size={11} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* BagUI Pagination Bar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span>
            Showing{' '}
            <strong className="text-zinc-100 font-bold">
              {filteredTracks.length === 0
                ? 0
                : (page - 1) * pageSize + 1}
              -
              {Math.min(page * pageSize, filteredTracks.length)}
            </strong>{' '}
            of{' '}
            <strong className="text-zinc-100 font-bold">
              {filteredTracks.length}
            </strong>{' '}
            records
          </span>
          <span className="text-zinc-700">|</span>
          <span>Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-xs font-medium text-zinc-200 cursor-pointer"
          >
            <option className="bg-zinc-900 text-zinc-200" value={5}>5</option>
            <option className="bg-zinc-900 text-zinc-200" value={10}>10</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-medium text-zinc-300 disabled:opacity-40 hover:bg-zinc-800 hover:text-white cursor-pointer disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <span className="px-2 font-medium text-zinc-300">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-medium text-zinc-300 disabled:opacity-40 hover:bg-zinc-800 hover:text-white cursor-pointer disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {/* BagUI Floating BulkActionBar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full border border-zinc-700 bg-zinc-900 px-5 py-2.5 shadow-2xl"
          >
            <span className="text-xs font-semibold text-white">
              {selectedIds.size} Selected
            </span>
            <span className="h-3.5 w-px bg-zinc-700" />
            <button
              onClick={() => {
                handleExportCSV();
                handleBulkClear();
              }}
              className="text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
            >
              Export Selected
            </button>
            <button
              onClick={() => {
                addToast(`Marked ${selectedIds.size} tracks as Priority`);
                handleBulkClear();
              }}
              className="text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
            >
              Mark Priority
            </button>
            <button
              onClick={handleBulkClear}
              className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
            >
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
