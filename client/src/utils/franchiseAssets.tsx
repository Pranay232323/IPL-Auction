import React, { useState } from 'react';
import { TeamCode } from '../types';

interface FranchiseAssetProps {
  teamCode: TeamCode | string | null | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

const SIZE_MAP = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
};

const VALID_TEAMS: TeamCode[] = [
  'CSK',
  'MI',
  'RCB',
  'KKR',
  'SRH',
  'RR',
  'DC',
  'PBKS',
  'GT',
  'LSG',
];

export const FranchiseLogo: React.FC<FranchiseAssetProps> = ({
  teamCode,
  size = 'md',
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const code = (teamCode || '').toUpperCase() as TeamCode;
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  // Render official transparent BCCI / IPL franchise PNG crest if available
  if (code && !imgFailed && VALID_TEAMS.includes(code)) {
    return (
      <img
        src={`/logos/${code}.png`}
        alt={`${code} official logo`}
        className={`${sizeClass} ${className} shrink-0 object-contain drop-shadow-md transition duration-200 hover:scale-105`}
        onError={() => setImgFailed(true)}
      />
    );
  }

  // Fallback vector shields if image fails or code is generic
  switch (code) {
    case 'CSK':
      return (
        <svg
          viewBox="0 0 100 100"
          className={`${sizeClass} ${className} shrink-0 drop-shadow-md`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="cskGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#EAB308" />
            </linearGradient>
            <linearGradient id="cskBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E40AF" />
              <stop offset="100%" stopColor="#172554" />
            </linearGradient>
          </defs>
          <path d="M50 4 L88 18 V56 C88 78 50 96 50 96 C50 96 12 78 12 56 V18 Z" fill="url(#cskGrad)" stroke="#1E40AF" strokeWidth="4" />
          <path d="M50 12 L80 23 V54 C80 72 50 86 50 86 C50 86 20 72 20 54 V23 Z" fill="url(#cskBlue)" />
          <path d="M42 30 C45 25 55 25 58 30 C62 34 68 35 66 42 C64 48 58 50 56 56 C54 62 58 68 50 72 C42 68 46 62 44 56 C42 50 36 48 34 42 C32 35 38 34 42 30 Z" fill="#FACC15" />
          <path d="M38 42 L48 44 L40 50 Z" fill="#FFFFFF" />
          <path d="M62 42 L52 44 L60 50 Z" fill="#FFFFFF" />
          <circle cx="50" cy="38" r="4" fill="#EAB308" />
          <text x="50" y="80" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" letterSpacing="1">CSK</text>
        </svg>
      );

    case 'MI':
      return (
        <svg
          viewBox="0 0 100 100"
          className={`${sizeClass} ${className} shrink-0 drop-shadow-md`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="miBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>
            <linearGradient id="miGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>
          <path d="M50 5 L90 25 V60 C90 80 50 95 50 95 C50 95 10 80 10 60 V25 Z" fill="url(#miBlue)" stroke="#F59E0B" strokeWidth="4" />
          <circle cx="50" cy="46" r="24" stroke="url(#miGold)" strokeWidth="4" strokeDasharray="6 3" />
          <circle cx="50" cy="46" r="14" fill="#0369A1" stroke="#F59E0B" strokeWidth="3" />
          <path d="M50 24 L54 36 L50 40 L46 36 Z" fill="#F59E0B" />
          <path d="M50 68 L54 56 L50 52 L46 56 Z" fill="#F59E0B" />
          <path d="M28 46 L40 50 L44 46 L40 42 Z" fill="#F59E0B" />
          <path d="M72 46 L60 50 L56 46 L60 42 Z" fill="#F59E0B" />
          <text x="50" y="83" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="900" letterSpacing="1">MI</text>
        </svg>
      );

    case 'RCB':
      return (
        <svg
          viewBox="0 0 100 100"
          className={`${sizeClass} ${className} shrink-0 drop-shadow-md`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="rcbRed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#DC2626" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
            <linearGradient id="rcbGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>
          <path d="M50 5 L88 20 V58 C88 78 50 95 50 95 C50 95 12 78 12 58 V20 Z" fill="url(#rcbRed)" stroke="#FBBF24" strokeWidth="4" />
          <path d="M42 22 C46 16 54 16 58 22 C62 26 66 32 64 38 C62 44 56 46 58 54 C60 62 54 66 50 68 C46 66 40 62 42 54 C44 46 38 44 36 38 C34 32 38 26 42 22 Z" fill="url(#rcbGold)" />
          <circle cx="50" cy="20" r="3" fill="#FFFFFF" />
          <path d="M44 32 L50 36 L56 32 L53 42 L47 42 Z" fill="#18181B" />
          <text x="50" y="84" textAnchor="middle" fill="#FBBF24" fontSize="12" fontWeight="900" letterSpacing="1.5">RCB</text>
        </svg>
      );

    case 'KKR':
      return (
        <svg
          viewBox="0 0 100 100"
          className={`${sizeClass} ${className} shrink-0 drop-shadow-md`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="kkrPurple" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9333EA" />
              <stop offset="100%" stopColor="#581C87" />
            </linearGradient>
          </defs>
          <path d="M50 5 L88 22 V58 C88 78 50 95 50 95 C50 95 12 78 12 58 V22 Z" fill="url(#kkrPurple)" stroke="#EAB308" strokeWidth="4" />
          <path d="M50 20 L62 32 V46 C62 58 50 64 50 64 C50 64 38 58 38 46 V32 Z" fill="#EAB308" />
          <path d="M44 38 H56 V48 H44 Z" fill="#3B0764" />
          <path d="M50 14 L53 26 H47 Z" fill="#F59E0B" />
          <text x="50" y="82" textAnchor="middle" fill="#EAB308" fontSize="12" fontWeight="900" letterSpacing="1">KKR</text>
        </svg>
      );

    case 'SRH':
      return (
        <svg
          viewBox="0 0 100 100"
          className={`${sizeClass} ${className} shrink-0 drop-shadow-md`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="srhOrange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#C2410C" />
            </linearGradient>
          </defs>
          <path d="M50 5 L88 20 V58 C88 78 50 95 50 95 C50 95 12 78 12 58 V20 Z" fill="url(#srhOrange)" stroke="#FBBF24" strokeWidth="4" />
          <path d="M50 24 L60 38 L72 32 L64 48 L76 50 L60 60 L50 48 L40 60 L24 50 L36 48 L28 32 L40 38 Z" fill="#FDE047" />
          <circle cx="50" cy="38" r="6" fill="#EA580C" />
          <text x="50" y="82" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="900" letterSpacing="1">SRH</text>
        </svg>
      );

    case 'RR':
      return (
        <svg
          viewBox="0 0 100 100"
          className={`${sizeClass} ${className} shrink-0 drop-shadow-md`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="rrPink" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EC4899" />
              <stop offset="100%" stopColor="#BE185D" />
            </linearGradient>
          </defs>
          <path d="M50 5 L88 20 V58 C88 78 50 95 50 95 C50 95 12 78 12 58 V20 Z" fill="url(#rrPink)" stroke="#2563EB" strokeWidth="4" />
          <path d="M34 32 L42 46 L50 34 L58 46 L66 32 L68 54 H32 Z" fill="#FDE047" stroke="#1D4ED8" strokeWidth="2" />
          <circle cx="50" cy="26" r="3" fill="#FFFFFF" />
          <text x="50" y="82" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" letterSpacing="1">RR</text>
        </svg>
      );

    case 'DC':
      return (
        <svg
          viewBox="0 0 100 100"
          className={`${sizeClass} ${className} shrink-0 drop-shadow-md`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="dcBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1E3A8A" />
            </linearGradient>
          </defs>
          <path d="M50 5 L88 20 V58 C88 78 50 95 50 95 C50 95 12 78 12 58 V20 Z" fill="url(#dcBlue)" stroke="#EF4444" strokeWidth="4" />
          <path d="M42 30 C38 34 36 44 42 50 C46 54 54 54 58 50 C64 44 62 34 58 30 C54 36 46 36 42 30 Z" fill="#EF4444" />
          <circle cx="45" cy="40" r="2.5" fill="#FFFFFF" />
          <circle cx="55" cy="40" r="2.5" fill="#FFFFFF" />
          <path d="M48 48 L52 48 L50 52 Z" fill="#FFFFFF" />
          <text x="50" y="82" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" letterSpacing="1">DC</text>
        </svg>
      );

    case 'PBKS':
      return (
        <svg
          viewBox="0 0 100 100"
          className={`${sizeClass} ${className} shrink-0 drop-shadow-md`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="pbksRed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E11D48" />
              <stop offset="100%" stopColor="#9F1239" />
            </linearGradient>
          </defs>
          <path d="M50 5 L88 20 V58 C88 78 50 95 50 95 C50 95 12 78 12 58 V20 Z" fill="url(#pbksRed)" stroke="#CBD5E1" strokeWidth="4" />
          <path d="M50 22 C58 22 64 30 62 42 C60 52 50 58 50 58 C50 58 40 52 38 42 C36 30 42 22 50 22 Z" fill="#F1F5F9" />
          <path d="M46 34 L54 34 L50 40 Z" fill="#9F1239" />
          <text x="50" y="82" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" letterSpacing="1">PBKS</text>
        </svg>
      );

    case 'GT':
      return (
        <svg
          viewBox="0 0 100 100"
          className={`${sizeClass} ${className} shrink-0 drop-shadow-md`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="gtNavy" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#1E293B" />
            </linearGradient>
          </defs>
          <path d="M50 5 L88 20 V58 C88 78 50 95 50 95 C50 95 12 78 12 58 V20 Z" fill="url(#gtNavy)" stroke="#38BDF8" strokeWidth="4" />
          <path d="M54 20 L38 46 H50 L44 68 L64 40 H50 Z" fill="#FACC15" stroke="#38BDF8" strokeWidth="1.5" />
          <text x="50" y="84" textAnchor="middle" fill="#38BDF8" fontSize="13" fontWeight="900" letterSpacing="1">GT</text>
        </svg>
      );

    case 'LSG':
      return (
        <svg
          viewBox="0 0 100 100"
          className={`${sizeClass} ${className} shrink-0 drop-shadow-md`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="lsgCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#0E7490" />
            </linearGradient>
          </defs>
          <path d="M50 5 L88 20 V58 C88 78 50 95 50 95 C50 95 12 78 12 58 V20 Z" fill="url(#lsgCyan)" stroke="#F97316" strokeWidth="4" />
          <path d="M50 24 L64 36 L76 34 L66 48 L74 54 L58 60 L50 48 L42 60 L26 54 L34 48 L24 34 L36 36 Z" fill="#F97316" />
          <circle cx="50" cy="40" r="5" fill="#FFFFFF" />
          <text x="50" y="82" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="900" letterSpacing="1">LSG</text>
        </svg>
      );

    default:
      return (
        <div
          className={`flex items-center justify-center rounded-xl font-black text-stadium-950 shadow ${sizeClass} ${className}`}
          style={{ backgroundColor: '#F59E0B' }}
        >
          {code || 'IPL'}
        </div>
      );
  }
};

/**
 * Authentic Official IPL Franchise Match Jersey Graphic
 * Displays signature team color palette, shoulder and side panels,
 * and the official franchise crest embedded on the chest.
 */
export const FranchiseJersey: React.FC<{
  teamCode: TeamCode | string | null | undefined;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ teamCode, size = 'md', className = '' }) => {
  const code = (teamCode || '').toUpperCase() as TeamCode;
  const sizeClass =
    size === 'sm'
      ? 'w-8 h-8'
      : size === 'lg'
      ? 'w-14 h-14'
      : size === 'xl'
      ? 'w-20 h-20'
      : 'w-10 h-10';

  // Authentic franchise kit styling specifications
  const jerseyTheme = {
    CSK: {
      primaryTop: '#FACC15',
      primaryBottom: '#EAB308',
      secondary: '#1E40AF',
      accent: '#DC2626',
      chestNumber: 'CSK',
      textColor: '#FFFFFF',
    },
    MI: {
      primaryTop: '#0284C7',
      primaryBottom: '#0369A1',
      secondary: '#F59E0B',
      accent: '#FFFFFF',
      chestNumber: 'MI',
      textColor: '#FFFFFF',
    },
    RCB: {
      primaryTop: '#18181B',
      primaryBottom: '#DC2626',
      secondary: '#FBBF24',
      accent: '#991B1B',
      chestNumber: 'RCB',
      textColor: '#FBBF24',
    },
    KKR: {
      primaryTop: '#7E22CE',
      primaryBottom: '#581C87',
      secondary: '#EAB308',
      accent: '#FFFFFF',
      chestNumber: 'KKR',
      textColor: '#EAB308',
    },
    SRH: {
      primaryTop: '#F97316',
      primaryBottom: '#C2410C',
      secondary: '#18181B',
      accent: '#FDE047',
      chestNumber: 'SRH',
      textColor: '#FFFFFF',
    },
    RR: {
      primaryTop: '#EC4899',
      primaryBottom: '#BE185D',
      secondary: '#1E40AF',
      accent: '#FFFFFF',
      chestNumber: 'RR',
      textColor: '#FFFFFF',
    },
    DC: {
      primaryTop: '#2563EB',
      primaryBottom: '#1D4ED8',
      secondary: '#EF4444',
      accent: '#FFFFFF',
      chestNumber: 'DC',
      textColor: '#FFFFFF',
    },
    PBKS: {
      primaryTop: '#E11D48',
      primaryBottom: '#9F1239',
      secondary: '#CBD5E1',
      accent: '#FFFFFF',
      chestNumber: 'PBKS',
      textColor: '#FFFFFF',
    },
    GT: {
      primaryTop: '#0F172A',
      primaryBottom: '#1E293B',
      secondary: '#38BDF8',
      accent: '#FACC15',
      chestNumber: 'GT',
      textColor: '#38BDF8',
    },
    LSG: {
      primaryTop: '#06B6D4',
      primaryBottom: '#0E7490',
      secondary: '#F97316',
      accent: '#10B981',
      chestNumber: 'LSG',
      textColor: '#FFFFFF',
    },
  }[code] || {
    primaryTop: '#F59E0B',
    primaryBottom: '#D97706',
    secondary: '#18181B',
    accent: '#FFFFFF',
    chestNumber: 'IPL',
    textColor: '#FFFFFF',
  };

  const gradId = `jerseyGrad_${code || 'GEN'}`;

  return (
    <svg
      viewBox="0 0 100 100"
      className={`${sizeClass} ${className} shrink-0 drop-shadow-md transition-transform duration-200 hover:scale-105`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${code || 'Team'} Match Jersey`}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={jerseyTheme.primaryTop} />
          <stop offset="100%" stopColor={jerseyTheme.primaryBottom} />
        </linearGradient>
        {/* Subtle Athletic Jersey Mesh Pattern */}
        <pattern id={`mesh_${code}`} width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.6" fill="#000000" fillOpacity="0.08" />
        </pattern>
      </defs>

      {/* Jersey Sleeves & Torso Outline */}
      <path
        d="M28 16 L6 32 L18 48 L28 42 V88 H72 V42 L82 48 L94 32 L72 16 C66 22 34 22 28 16 Z"
        fill={`url(#${gradId})`}
        stroke={jerseyTheme.secondary}
        strokeWidth="2.5"
      />

      {/* Jersey Mesh Overlay */}
      <path
        d="M28 16 L6 32 L18 48 L28 42 V88 H72 V42 L82 48 L94 32 L72 16 C66 22 34 22 28 16 Z"
        fill={`url(#mesh_${code})`}
      />

      {/* Shoulder Raglan Stripes */}
      <path d="M28 16 L12 28 L18 36 L30 24 Z" fill={jerseyTheme.secondary} />
      <path d="M72 16 L88 28 L82 36 L70 24 Z" fill={jerseyTheme.secondary} />

      {/* Athletic V-Neck Collar */}
      <path
        d="M36 16 C40 26 60 26 64 16 L58 16 C55 22 45 22 42 16 Z"
        fill={jerseyTheme.secondary}
      />
      <circle cx="50" cy="22" r="1.5" fill={jerseyTheme.accent} />

      {/* Side Ventilation Panels */}
      <path d="M28 46 L33 49 V88 H28 Z" fill={jerseyTheme.secondary} fillOpacity="0.85" />
      <path d="M72 46 L67 49 V88 H72 Z" fill={jerseyTheme.secondary} fillOpacity="0.85" />

      {/* Sleeve Trim Cuffs */}
      <path d="M6 32 L10 36 L18 48 L14 44 Z" fill={jerseyTheme.accent} />
      <path d="M94 32 L90 36 L82 48 L86 44 Z" fill={jerseyTheme.accent} />

      {/* Official Team Crest Badge on Chest */}
      {VALID_TEAMS.includes(code) ? (
        <image
          href={`/logos/${code}.png`}
          xlinkHref={`/logos/${code}.png`}
          x="33"
          y="32"
          width="16"
          height="16"
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <circle cx="41" cy="40" r="5" fill={jerseyTheme.secondary} />
      )}

      {/* Sponsor / Chest Typography */}
      <text
        x="50"
        y="68"
        textAnchor="middle"
        fill={jerseyTheme.textColor}
        fontSize="12"
        fontWeight="900"
        letterSpacing="1"
        fontFamily="sans-serif"
      >
        {jerseyTheme.chestNumber}
      </text>

      {/* Athletic Hem Accent */}
      <line
        x1="32"
        y1="85"
        x2="68"
        y2="85"
        stroke={jerseyTheme.secondary}
        strokeWidth="2"
        strokeDasharray="2 1"
      />
    </svg>
  );
};
