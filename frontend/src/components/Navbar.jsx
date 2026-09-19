import React, { useState } from 'react';
import {
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Bell,
  Search,
  ExternalLink,
} from 'lucide-react';
import VidhyaPramanLogo from './VidhyaPramanLogo';
import { useAuth } from '../context/AuthContext';
import ProfileModal from './ProfileModal';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-3 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-850 select-none transition-colors">
        {/* Left Branding / Breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <VidhyaPramanLogo size={32} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-brand font-black text-sm tracking-wide text-white">
                  VIDHYA <span className="text-orange-500">PRAMAN</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/25">
                  Learner Hub
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Intelligent Learning Platform & Credential Verification
              </p>
            </div>
          </div>
        </div>

        {/* Right Navigation & User Controls */}
        <div className="flex items-center gap-3">
          {/* Status Chip */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI Verified</span>
          </div>

          {/* User Profile Chip (BagUI Pill Pattern) */}
          {user && (
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 transition-all cursor-pointer text-left"
              title="Click to view/edit profile and GitHub sync"
            >
              <img
                src={
                  user.avatar_url ||
                  user.github_avatar_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user.full_name || user.username
                  )}&background=3b82f6&color=fff`
                }
                alt={user.username}
                className="w-7 h-7 rounded-full object-cover border border-zinc-700"
              />
              <div className="hidden sm:block leading-tight">
                <span className="text-xs font-semibold text-zinc-100 block truncate max-w-[120px]">
                  {user.full_name || user.username}
                </span>
                <span className="text-[10px] text-zinc-400 block truncate max-w-[120px]">
                  {user.github_username ? `@${user.github_username}` : user.target_role || 'Learner'}
                </span>
              </div>
              <ChevronDown size={13} className="text-zinc-400 ml-0.5" />
            </button>
          )}

          {/* Logout Button */}
          {user && (
            <button
              onClick={logout}
              title="Sign Out"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 hover:border-red-800/60 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Profile Editor Modal */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </>
  );
}
