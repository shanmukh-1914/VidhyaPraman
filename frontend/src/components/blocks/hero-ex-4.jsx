import { useRef, useState, useEffect } from "react";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  AnimatePresence,
} from "motion/react";
import { ArrowRight, Calendar, Moon, Sun, Menu, X } from "lucide-react";

/**
 * Hero4 Component from BagUI (@bagui/hero4)
 * Pixel-perfect implementation matching the official BagUI Hero 4 block.
 */
export default function Hero4({
  onSignIn,
  onSignUp,
  onContact,
  onAbout,
  onPricing,
  onFeatures,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        document.documentElement.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    }
    return false;
  });
  const heroRef = useRef(null);
  const isVisible = true;

  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 120]);
  const y2 = useTransform(scrollY, [0, 500], [0, -100]);

  const bars = [40, 65, 45, 80, 75, 90];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const navLinks = [
    { label: "Features", onClick: onFeatures },
    { label: "Pricing", onClick: onPricing },
    { label: "About", onClick: onAbout },
    { label: "Contact", onClick: onContact },
  ];

  return (
    <div
      className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white overflow-hidden transition-colors duration-200"
      style={{
        fontFamily: "var(--font-geist-sans, 'Geist', 'Inter', system-ui, sans-serif)",
      }}
      ref={heroRef}
    >
      {/* Top Navbar */}
      <motion.header
        className={[
          "relative z-50 transition-all duration-300",
          scrolled
            ? "bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-[0_1px_0_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)]"
            : "bg-transparent",
        ].join(" ")}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div
              className="flex items-center gap-8"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
            >
              <div className="flex items-center gap-3 group cursor-pointer">
                <img
                  src="/bagui-logo.png"
                  onError={(e) => {
                    e.currentTarget.src = "https://bagui.vercel.app/logoR.png";
                  }}
                  alt="BagUi logo"
                  className="w-8 h-8 object-contain rounded-lg shadow-sm"
                />
                <span className="font-semibold text-[15px] text-zinc-950 dark:text-white tracking-[-0.01em]">
                  Bag\Ui
                </span>
              </div>

              <nav className="hidden md:flex items-center gap-0.5">
                {navLinks.map((l) => (
                  <button
                    key={l.label}
                    onClick={l.onClick}
                    className="px-3 py-1.5 rounded-md text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 transition-all duration-150 font-medium cursor-pointer"
                  >
                    {l.label}
                  </button>
                ))}
              </nav>
            </motion.div>

            <motion.div
              className="hidden md:flex items-center gap-2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
            >
              <button
                onClick={() => setDark(!dark)}
                className="p-2 rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                aria-label="Toggle theme"
              >
                {dark ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-zinc-600" />
                )}
              </button>

              <button
                onClick={onSignIn}
                className="px-3.5 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
              >
                Sign in
              </button>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <button
                  onClick={onSignUp}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors cursor-pointer shadow-sm"
                >
                  Sign up
                </button>
              </motion.div>
            </motion.div>

            <div className="flex items-center gap-1 md:hidden">
              <button
                onClick={() => setDark(!dark)}
                className="p-2 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {dark ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {menuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="md:hidden bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800/60"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="px-4 py-3 space-y-0.5">
                {navLinks.map((l) => (
                  <button
                    key={l.label}
                    className="w-full text-left block px-3 py-2.5 rounded-md text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    onClick={() => {
                      setMenuOpen(false);
                      if (l.onClick) l.onClick();
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800/60 space-y-2">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    if (onSignIn) onSignIn();
                  }}
                  className="w-full text-left block px-3 py-2.5 rounded-md text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Sign in
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    if (onSignUp) onSignUp();
                  }}
                  className="w-full block px-3 py-2.5 rounded-md text-sm font-medium bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-center cursor-pointer"
                >
                  Sign up
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-24 md:pt-16 md:pb-32 overflow-hidden">
        {/* Ambient background blur blobs */}
        <motion.div
          className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-zinc-100 dark:bg-zinc-900 blur-2xl"
          style={{ y: y1 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 1 }}
        />
        <motion.div
          className="pointer-events-none absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full bg-zinc-100 dark:bg-zinc-900 blur-2xl"
          style={{ y: y2 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 1, delay: 0.2 }}
        />

        {/* Subtle grid pattern matching screenshot */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
            {/* Left Hero Column */}
            <div className="lg:w-1/2 mb-14 lg:mb-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="inline-flex items-center gap-2 mb-8"
              >
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 text-xs font-medium tracking-tight">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  New — Beta v1.0 available
                </span>
              </motion.div>

              <motion.h1
                className="text-[2.6rem] sm:text-5xl lg:text-[3.4rem] font-semibold leading-[1.1] tracking-[-0.03em] text-zinc-950 dark:text-white mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.6,
                  delay: 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                Organize events
                <br />
                to{" "}
                <span className="relative">
                  <span className="relative z-10">maximum impact</span>
                  <motion.span
                    className="absolute bottom-1 left-0 right-0 h-[5px] bg-zinc-200 dark:bg-zinc-700 rounded-full -z-0"
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={isVisible ? { scaleX: 1 } : {}}
                    transition={{ duration: 0.6, delay: 0.75 }}
                  />
                </span>
              </motion.h1>

              <motion.p
                className="text-base md:text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed mb-9 max-w-md"
                initial={{ opacity: 0 }}
                animate={isVisible ? { opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                Bag\Ui simplifies event management for teams. Plan, organize,
                and track your seminars and conferences with ease.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-3"
                initial={{ opacity: 0, y: 12 }}
                animate={isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.55 }}
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <button
                    onClick={onSignIn}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    Sign in
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <button
                    onClick={onSignUp}
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                  >
                    Create account
                  </button>
                </motion.div>
              </motion.div>

              <motion.div
                className="flex items-center gap-3 mt-8"
                initial={{ opacity: 0 }}
                animate={isVisible ? { opacity: 1 } : {}}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <div className="flex -space-x-2">
                  {["#f97316", "#8b5cf6", "#06b6d4", "#10b981"].map(
                    (color, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-950 shadow-xs"
                        style={{ background: color }}
                      />
                    )
                  )}
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="font-medium text-zinc-900 dark:text-white">
                    +2 400
                  </span>{" "}
                  events organized this month
                </p>
              </motion.div>
            </div>

            {/* Right Dashboard Card Preview */}
            <motion.div
              className="lg:w-1/2 relative"
              initial={{ opacity: 0, y: 32, scale: 0.96 }}
              animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{
                duration: 0.75,
                delay: 0.35,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {/* Offset rotated background decorative card */}
              <motion.div
                className="absolute -right-4 -bottom-4 w-32 h-32 bg-zinc-100 dark:bg-zinc-900 rounded-2xl"
                initial={{ rotate: 0 }}
                animate={{ rotate: 8 }}
                transition={{ type: "spring", stiffness: 60, delay: 1 }}
              />

              {/* Elevated Window Card */}
              <div className="relative z-10 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6)] overflow-hidden">
                {/* Window header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tracking-tight">
                    Bag\Ui — Dashboard
                  </span>
                  <div className="w-12" />
                </div>

                <div className="p-5 space-y-5">
                  {/* Top Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Events", value: "24", delta: "+3" },
                      { label: "Participants", value: "1840", delta: "+12%" },
                      { label: "Satisfaction", value: "96%", delta: "↑" },
                    ].map((s, i) => (
                      <motion.div
                        key={i}
                        className="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-3 border border-zinc-100 dark:border-zinc-800"
                        initial={{ opacity: 0, y: 8 }}
                        animate={isVisible ? { opacity: 1, y: 0 } : {}}
                        transition={{ delay: 0.6 + i * 0.08, duration: 0.4 }}
                      >
                        <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 mb-1 tracking-wide uppercase">
                          {s.label}
                        </p>
                        <p className="text-xl font-semibold text-zinc-950 dark:text-white tracking-tight">
                          {s.value}
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                          {s.delta}
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Upcoming Events List */}
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white mb-3 tracking-tight">
                      Upcoming events
                    </p>
                    <div className="space-y-2">
                      {[
                        {
                          name: "Weka Launch",
                          date: "Dec 15, 2025",
                          count: "248",
                        },
                        {
                          name: "Web Seminar",
                          date: "Dec 20, 2025",
                          count: "124",
                        },
                      ].map((ev, i) => (
                        <motion.div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800"
                          initial={{ opacity: 0, x: -8 }}
                          animate={isVisible ? { opacity: 1, x: 0 } : {}}
                          transition={{ delay: 0.7 + i * 0.1, duration: 0.4 }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                              <Calendar className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                            </div>
                            <div>
                              <p className="text-[13px] font-medium text-zinc-900 dark:text-white leading-none">
                                {ev.name}
                              </p>
                              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                                {ev.date}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                            {ev.count} participants
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Monthly Stats Chart */}
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white mb-3 tracking-tight">
                      Monthly stats
                    </p>
                    <div className="flex items-end gap-2 h-20 px-1">
                      {bars.map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <motion.div
                            className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-t-md relative overflow-hidden"
                            style={{ height: `${h}%` }}
                            initial={{ scaleY: 0, originY: 1 }}
                            animate={isVisible ? { scaleY: 1 } : {}}
                            transition={{
                              delay: 0.8 + i * 0.06,
                              duration: 0.5,
                              ease: "easeOut",
                            }}
                          >
                            {h === 90 && (
                              <div className="w-full h-full bg-zinc-900 dark:bg-white rounded-t-md" />
                            )}
                          </motion.div>
                          <span className="text-[9px] text-zinc-400 dark:text-zinc-600">
                            {months[i]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Trusted By Section matching screenshot 1:1 */}
          <motion.div
            className="mt-20 md:mt-24"
            initial={{ opacity: 0, y: 16 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <p className="text-center text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-6">
              TRUSTED BY
            </p>
            <div className="flex flex-wrap items-center justify-center gap-10 md:gap-14">
              {/* Google */}
              <div className="h-7 flex items-center opacity-75 hover:opacity-100 transition-opacity">
                <svg className="h-6 w-auto" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>

              {/* Microsoft */}
              <div className="h-7 flex items-center opacity-75 hover:opacity-100 transition-opacity">
                <svg className="h-6 w-auto" viewBox="0 0 24 24">
                  <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                  <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
                  <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
                  <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
                </svg>
              </div>

              {/* Amazon */}
              <div className="h-7 flex items-center opacity-75 hover:opacity-100 transition-opacity">
                <svg className="h-7 w-auto" viewBox="0 0 48 48">
                  <path fill="#FF9900" d="M8 32c1.2 1.6 3.7 2.6 6.7 1.6 15.6-5.2 22.8 1.4 23.9 2.5 1.2 1.1 2.9.3 2.6-1.1-.9-3.9-9.1-8.5-22.3-6.5-6.7 1-9.9 2.2-10.9 3.5z" />
                  <path fill="#FF9900" d="M38.8 33.6c-.6-.7-4-.9-8-.5-.5.1-.6-.3-.1-.6 3.1-2.1 8.2-1.5 8.8-.7.6.7-.2 5.9-3.1 8.2-.5.4-.8.1-.5-.4 1.7-3.3 3.5-5.2 2.9-6z" />
                </svg>
              </div>

              {/* Apple */}
              <div className="h-7 flex items-center opacity-75 hover:opacity-100 transition-opacity">
                <svg className="h-6 w-auto fill-zinc-900 dark:fill-white" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-7.79-11.75-13.43-24.96-16.92-39.63-3.48-14.67-4.14-27.42-1.98-38.25 2.5-12.61 7.84-22.95 16.03-31.02 8.19-8.07 17.64-12.19 28.36-12.36 4.35 0 9.42 1.14 15.22 3.42 5.8 2.28 9.94 3.48 12.42 3.6 2.12-.25 6.3-1.46 12.54-3.6 6.24-2.15 11.45-3.08 15.63-2.8 11.64.63 21.05 4.96 28.23 12.98-10.22 6.19-15.23 14.86-15.02 26 0 10.04 4.12 18.49 12.36 25.35 8.24 6.86 17.76 10.66 28.56 11.4-2.45 7.61-5.38 15.24-8.8 22.89zM119.22 33.15c0-7.28 2.66-14.3 7.98-21.06 5.32-6.76 11.94-11.23 19.86-13.41.98 7.39-.77 14.44-5.25 21.15-4.48 6.71-10.82 11.15-19.02 13.32-.82-.72-1.89-1.07-3.21-1.07-.36.36-.73.47-1.09.47-.82 0-1.63-.16-2.45-.48.49-1.92.74-3.79.74-5.6z"/>
                </svg>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
