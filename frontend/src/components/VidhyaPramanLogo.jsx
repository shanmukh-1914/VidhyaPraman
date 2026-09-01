import React from 'react';

export default function VidhyaPramanLogo({ size = 36, showText = false, textClassName = '', className = '', style = {} }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', ...style }} className={className}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, filter: 'drop-shadow(0 2px 8px rgba(245, 158, 11, 0.25))' }}
      >
        <defs>
          <linearGradient id="vpLightGrad" x1="50" y1="10" x2="50" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="85%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>

          <linearGradient id="vpHandGrad" x1="0" y1="30" x2="100" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          <linearGradient id="vpGlow" x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(253, 224, 71, 0.4)" />
            <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
          </linearGradient>
        </defs>

        {/* Ambient Glow */}
        <circle cx="50" cy="45" r="35" fill="url(#vpGlow)" />

        {/* Radiant Light Rays rising upwards */}
        <path d="M50 8 L50 16" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
        <path d="M36 14 L40 21" stroke="#fde047" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <path d="M64 14 L60 21" stroke="#fde047" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <path d="M25 24 L31 29" stroke="#fcd34d" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
        <path d="M75 24 L69 29" stroke="#fcd34d" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />

        {/* Central Luminous Flame / Light Beacon rising between hands */}
        {/* Core Flame */}
        <path
          d="M50 15 C54 28 65 36 65 48 C65 58 58 66 50 68 C42 66 35 58 35 48 C35 36 46 28 50 15 Z"
          fill="url(#vpLightGrad)"
          opacity="0.95"
        />

        {/* Inner Bright Flame Core */}
        <path
          d="M50 25 C52.5 33 58 39 58 47 C58 53 54.5 58 50 60 C45.5 58 42 53 42 47 C42 39 47.5 33 50 25 Z"
          fill="#ffffff"
          opacity="0.8"
        />

        {/* Left Hand cupping and supporting the light */}
        <path
          d="M18 42 C18 36 21 34 23 37 C24.5 39 26 46 27 50 M24 35 C26 31 29 32 30 36 C31 40 33 48 34 52"
          stroke="url(#vpHandGrad)"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M17 48 C16 58 20 68 28 75 C35 81 44 83 48 83 C49 76 45 72 38 67 C30 61 25 55 24 47 C23 44 19 44 17 48 Z"
          fill="url(#vpHandGrad)"
          stroke="#b45309"
          strokeWidth="1"
        />
        <path
          d="M20 54 C26 62 36 71 48 76"
          stroke="#fef08a"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Right Hand cupping and supporting the light (Symmetric) */}
        <path
          d="M82 42 C82 36 79 34 77 37 C75.5 39 74 46 73 50 M76 35 C74 31 71 32 70 36 C69 40 67 48 66 52"
          stroke="url(#vpHandGrad)"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M83 48 C84 58 80 68 72 75 C65 81 56 83 52 83 C51 76 55 72 62 67 C70 61 75 55 76 47 C77 44 81 44 83 48 Z"
          fill="url(#vpHandGrad)"
          stroke="#b45309"
          strokeWidth="1"
        />
        <path
          d="M80 54 C74 62 64 71 52 76"
          stroke="#fef08a"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Center Base Joint */}
        <path
          d="M48 83 C49 84 51 84 52 83 L50 87 Z"
          fill="#d97706"
        />
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span
            style={{
              fontFamily: "'Cinzel', 'Philosopher', 'Plus Jakarta Sans', serif",
              fontWeight: 800,
              fontSize: '1.2rem',
              letterSpacing: '0.04em',
              color: '#ffffff',
            }}
            className={textClassName}
          >
            VIDHYA <span style={{ color: '#f59e0b' }}>PRAMAN</span>
          </span>
          <span style={{ fontSize: '0.66rem', color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
            Knowledge • Proof • Mastery
          </span>
        </div>
      )}
    </div>
  );
}
