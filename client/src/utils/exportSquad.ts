// Squad Poster Generator (HTML5 Canvas to PNG), CSV Export, and Text Share

import { formatLakhs, getFranchiseMeta } from './format';
import { PlayerDTO, SquadBoughtPlayer, TeamAnalysisRank, TeamCode } from '../types';

export type SquadPlayerItem = PlayerDTO & { soldPriceLakhs?: number | null };

export interface SquadPosterOptions {
  teamCode: TeamCode;
  teamName: string;
  ownerName: string;
  purseRemainingLakhs: number;
  totalPurseLakhs: number;
  analysis?: TeamAnalysisRank;
  squad: SquadPlayerItem[];
  captainId?: number;
  viceCaptainId?: number;
}

export function generateSquadCsv(
  teamCode: string,
  teamName: string,
  squad: SquadPlayerItem[]
): void {
  const headers = [
    'Player Name',
    'Role',
    'Country',
    'Overseas',
    'Capped',
    'Overall Rating',
    'Base Price (Lakhs)',
    'Sold Price (Lakhs)',
    'Sold Price (Formatted)',
    'Auction Set',
  ];

  const rows = squad.map((p) => [
    `"${p.name.replace(/"/g, '""')}"`,
    p.role,
    `"${p.country}"`,
    p.isOverseas ? 'Yes' : 'No',
    p.isCapped ? 'Capped' : 'Uncapped',
    p.overallRating,
    p.basePriceLakhs,
    p.soldPriceLakhs || 0,
    `"${formatLakhs(p.soldPriceLakhs)}"`,
    p.auctionSet,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${teamCode}_IPL_2026_Full_Squad.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function copySquadSummaryText(
  teamCode: TeamCode,
  teamName: string,
  ownerName: string,
  squad: SquadPlayerItem[],
  analysis?: TeamAnalysisRank,
  mode: 'full' | 'xi' = 'full'
): Promise<boolean> {
  const totalSpent = squad.reduce((sum, p) => sum + (p.soldPriceLakhs || 0), 0);
  const overseasCount = squad.filter((p) => p.isOverseas).length;

  let text = `🏏 *${teamName} (${teamCode}) — IPL Mega Auction 2026*\n`;
  text += `👤 *Franchise GM:* ${ownerName}\n`;
  text += `💰 *Total Spend:* ${formatLakhs(totalSpent)} (${squad.length} Players, ${overseasCount} Overseas)\n`;
  if (analysis) {
    text += `🏆 *AI Rating:* Rank #${analysis.rank} | Grade: ${analysis.grade} | Win Odds: ${analysis.winProbabilityPct}%\n`;
  }

  if (mode === 'xi') {
    text += `\n⭐ *MATCH-DAY PLAYING XI:*\n`;
    const xi = analysis?.bestPlayingXI || squad.slice(0, 11);
    const capId = analysis?.captain?.id || xi[0]?.id;
    const vcId = analysis?.viceCaptain?.id || xi[1]?.id;

    xi.forEach((p, idx) => {
      const capTag = p.id === capId ? ' (C) 👑' : p.id === vcId ? ' (VC) 🎖️' : '';
      text += `${idx + 1}. ${p.name}${capTag} [${p.role}]${p.isOverseas ? ' ✈️' : ''} — ${formatLakhs(p.soldPriceLakhs)}\n`;
    });

    if (analysis?.impactPlayer) {
      text += `⚡ *Impact Sub (#12):* ${analysis.impactPlayer.name} [${analysis.impactPlayer.role}] — ${formatLakhs(analysis.impactPlayer.soldPriceLakhs)}\n`;
    }
  } else {
    text += `\n📋 *FULL 25-MEMBER SQUAD BY ROLE:*\n`;
    const roles: ('WK' | 'BAT' | 'AR' | 'BOWL')[] = ['WK', 'BAT', 'AR', 'BOWL'];
    const roleLabels = {
      WK: '🧤 Wicketkeepers',
      BAT: '🏏 Batters',
      AR: '⚡ All-Rounders',
      BOWL: '🎯 Bowlers',
    };

    roles.forEach((r) => {
      const group = squad.filter((p) => p.role === r);
      if (group.length > 0) {
        text += `\n${roleLabels[r]} (${group.length}):\n`;
        group.forEach((p) => {
          text += `• ${p.name} (${p.overallRating} OVR)${p.isOverseas ? ' ✈️' : ''} — ${formatLakhs(p.soldPriceLakhs)}\n`;
        });
      }
    });
  }

  text += `\n#IPL2026 #IPLAuction #CricketSquad`;

  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  primaryColor: string,
  secondaryColor: string
) {
  // Deep carbon stadium radial gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#070A12');
  bgGrad.addColorStop(0.4, '#0D1322');
  bgGrad.addColorStop(1, '#05070D');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Atmospheric franchise glow
  ctx.save();
  ctx.globalAlpha = 0.22;
  const glow1 = ctx.createRadialGradient(width * 0.88, height * 0.12, 30, width * 0.88, height * 0.12, 550);
  glow1.addColorStop(0, primaryColor);
  glow1.addColorStop(1, 'transparent');
  ctx.fillStyle = glow1;
  ctx.beginPath();
  ctx.arc(width * 0.88, height * 0.12, 550, 0, Math.PI * 2);
  ctx.fill();

  const glow2 = ctx.createRadialGradient(width * 0.12, height * 0.88, 30, width * 0.12, height * 0.88, 550);
  glow2.addColorStop(0, secondaryColor);
  glow2.addColorStop(1, 'transparent');
  ctx.fillStyle = glow2;
  ctx.beginPath();
  ctx.arc(width * 0.12, height * 0.88, 550, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Top Accent Bar
  ctx.fillStyle = primaryColor;
  ctx.fillRect(0, 0, width, 16);
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  options: SquadPosterOptions,
  width: number,
  cardTitle: string,
  primaryColor: string
) {
  const cardX = 60;
  const cardY = 55;
  const cardW = width - 120;
  const cardH = 150;

  // Header Box
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.fill();
  ctx.stroke();

  // Team Code Badge
  ctx.fillStyle = primaryColor;
  roundRect(ctx, cardX + 25, cardY + 25, 100, 100, 16);
  ctx.fill();
  ctx.fillStyle = '#050811';
  ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(options.teamCode, cardX + 75, cardY + 90);

  // Franchise Name & Subtitle
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(options.teamName.toUpperCase(), cardX + 145, cardY + 68);

  ctx.fillStyle = '#F59E0B';
  ctx.font = '800 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(cardTitle.toUpperCase(), cardX + 145, cardY + 100);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`FRANCHISE GM: ${options.ownerName.toUpperCase()}`, cardX + 145, cardY + 128);

  // 4 Top Stats Cards
  const statsY = 230;
  const statBoxWidth = (width - 120 - 45) / 4;
  const totalSpent = options.squad.reduce((s, p) => s + (p.soldPriceLakhs || 0), 0);
  const overseasCount = options.squad.filter((p) => p.isOverseas).length;

  const statItems = [
    { label: 'PURSE SPENT', val: formatLakhs(totalSpent) },
    { label: 'SQUAD SIZE', val: `${options.squad.length} / 25` },
    { label: 'OVERSEAS', val: `${overseasCount} / 8` },
    {
      label: 'AI RANK & GRADE',
      val: options.analysis ? `#${options.analysis.rank} (${options.analysis.grade})` : 'CERTIFIED',
    },
  ];

  statItems.forEach((stat, i) => {
    const x = cardX + i * (statBoxWidth + 15);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, statsY, statBoxWidth, 80, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '800 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stat.label, x + statBoxWidth / 2, statsY + 28);

    ctx.fillStyle = i === 3 ? primaryColor : '#F8FAFC';
    ctx.font = '900 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(stat.val, x + statBoxWidth / 2, statsY + 60);
  });
}

/**
 * OPTION 1: Download Full 25-Member Squad Card (Categorized by Role: WK, BAT, AR, BOWL)
 */
export async function downloadFullSquadPosterPng(options: SquadPosterOptions): Promise<void> {
  const width = 1200;
  const height = 1650;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const franchise = getFranchiseMeta(options.teamCode);
  const primaryColor = franchise?.primaryColor || '#F59E0B';
  const secondaryColor = franchise?.secondaryColor || '#1E3A8A';

  drawBackground(ctx, width, height, primaryColor, secondaryColor);
  drawHeader(ctx, options, width, 'Official 25-Member Franchise Squad', primaryColor);

  const squad = options.squad;
  const roles: { role: 'WK' | 'BAT' | 'AR' | 'BOWL'; label: string; icon: string; color: string }[] = [
    { role: 'WK', label: 'WICKETKEEPERS', icon: '🧤', color: '#38BDF8' },
    { role: 'BAT', label: 'BATTERS', icon: '🏏', color: '#60A5FA' },
    { role: 'AR', label: 'ALL-ROUNDERS', icon: '⚡', color: '#FBBF24' },
    { role: 'BOWL', label: 'BOWLERS', icon: '🎯', color: '#34D399' },
  ];

  let currentY = 345;
  const cardX = 60;
  const cardW = width - 120;
  const colGap = 20;
  const colWidth = (cardW - colGap) / 2;

  roles.forEach((section) => {
    const list = squad.filter((p) => p.role === section.role);
    if (list.length === 0) return;

    // Section Header Bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = section.color + '66';
    ctx.lineWidth = 1;
    roundRect(ctx, cardX, currentY, cardW, 36, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = section.color;
    ctx.font = '900 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${section.icon} ${section.label} (${list.length})`, cardX + 15, currentY + 24);
    currentY += 46;

    // Player Rows (2 columns)
    const rowH = 48;
    const numRows = Math.ceil(list.length / 2);

    list.forEach((p, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const px = cardX + col * (colWidth + colGap);
      const py = currentY + row * (rowH + 8);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      roundRect(ctx, px, py, colWidth, rowH, 8);
      ctx.fill();
      ctx.stroke();

      // Rating Pill
      ctx.fillStyle = section.color + '22';
      roundRect(ctx, px + 10, py + 10, 48, 28, 6);
      ctx.fill();
      ctx.fillStyle = section.color;
      ctx.font = '900 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${p.overallRating}`, px + 34, py + 29);

      // Player Name
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const maxChars = colWidth > 500 ? 22 : 18;
      const displayName = p.name.length > maxChars ? p.name.substring(0, maxChars - 2) + '..' : p.name;
      ctx.fillText(displayName, px + 68, py + 30);

      // Overseas badge
      if (p.isOverseas) {
        const textWidth = ctx.measureText(displayName).width;
        ctx.fillStyle = '#38BDF8';
        ctx.font = '13px sans-serif';
        ctx.fillText('✈️', px + 72 + textWidth, py + 30);
      }

      // Sold Price
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FBBF24';
      ctx.font = '800 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(formatLakhs(p.soldPriceLakhs), px + colWidth - 14, py + 30);
    });

    currentY += numRows * (rowH + 8) + 16;
  });

  // Footer Signature
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    'OFFICIAL IPL MEGA AUCTION SQUAD • ROSTER CONFIRMED FOR IPL 2026',
    width / 2,
    height - 35
  );

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `IPL_2026_${options.teamCode}_Full_25_Squad_Poster.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * OPTION 2: Download Match-Day Playing XI + Impact Player Card (with Captain & Vice-Captain)
 */
export async function downloadPlayingXIPosterPng(options: SquadPosterOptions): Promise<void> {
  const width = 1200;
  const height = 1600;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const franchise = getFranchiseMeta(options.teamCode);
  const primaryColor = franchise?.primaryColor || '#F59E0B';
  const secondaryColor = franchise?.secondaryColor || '#1E3A8A';

  drawBackground(ctx, width, height, primaryColor, secondaryColor);
  drawHeader(ctx, options, width, 'Match-Day Playing XI & Impact Player Lineup', primaryColor);

  const xi = options.analysis?.bestPlayingXI || options.squad.slice(0, 11);
  const impactPlayer = options.analysis?.impactPlayer || null;

  const capId = options.captainId || options.analysis?.captain?.id || xi[0]?.id;
  const vcId = options.viceCaptainId || options.analysis?.viceCaptain?.id || xi[1]?.id;

  const cardX = 60;
  const cardW = width - 120;
  const colGap = 24;
  const colWidth = (cardW - colGap) / 2;

  // Title: OFFICIAL PLAYING XI
  ctx.textAlign = 'left';
  ctx.fillStyle = primaryColor;
  ctx.font = '900 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('⚡ MATCH-DAY PLAYING XI (MAX 4 OVERSEAS)', cardX, 355);

  const xiStartY = 380;
  const rowH = 68;
  const rowGap = 12;

  xi.forEach((p, idx) => {
    const col = idx < 6 ? 0 : 1;
    const rowInCol = idx < 6 ? idx : idx - 6;
    const rx = cardX + col * (colWidth + colGap);
    const ry = xiStartY + rowInCol * (rowH + rowGap);

    const isCap = p.id === capId;
    const isVc = p.id === vcId && !isCap;

    ctx.fillStyle = isCap
      ? 'rgba(245, 158, 11, 0.12)'
      : isVc
        ? 'rgba(56, 189, 248, 0.1)'
        : 'rgba(15, 23, 42, 0.7)';
    ctx.strokeStyle = isCap
      ? 'rgba(245, 158, 11, 0.5)'
      : isVc
        ? 'rgba(56, 189, 248, 0.4)'
        : 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = isCap ? 2 : 1;
    roundRect(ctx, rx, ry, colWidth, rowH, 12);
    ctx.fill();
    ctx.stroke();

    // Batting Position Number #1 to #11
    ctx.fillStyle = isCap ? '#F59E0B' : '#64748B';
    ctx.font = '900 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`#${idx + 1}`, rx + 24, ry + 42);

    // Role Tag
    ctx.fillStyle = primaryColor + '25';
    roundRect(ctx, rx + 48, ry + 18, 50, 32, 8);
    ctx.fill();
    ctx.fillStyle = primaryColor;
    ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(p.role, rx + 73, ry + 39);

    // Player Name
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const maxChars = colWidth > 500 ? 18 : 14;
    const displayName = p.name.length > maxChars ? p.name.substring(0, maxChars - 2) + '..' : p.name;
    ctx.fillText(displayName, rx + 110, ry + 40);

    let offset = rx + 110 + ctx.measureText(displayName).width + 8;

    // Captain / Vice-Captain Badge
    if (isCap) {
      ctx.fillStyle = '#F59E0B';
      ctx.font = '900 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('(C) 👑', offset, ry + 40);
      offset += 48;
    } else if (isVc) {
      ctx.fillStyle = '#38BDF8';
      ctx.font = '900 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('(VC) 🎖️', offset, ry + 40);
      offset += 55;
    }

    if (p.isOverseas) {
      ctx.fillStyle = '#38BDF8';
      ctx.font = '14px sans-serif';
      ctx.fillText('✈️', offset, ry + 40);
    }

    // Rating & Price
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FBBF24';
    ctx.font = '900 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(formatLakhs(p.soldPriceLakhs), rx + colWidth - 16, ry + 32);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${p.overallRating} OVR`, rx + colWidth - 16, ry + 52);
  });

  // Dedicated Impact Player Section (WELL SEPARATED at the bottom)
  const impactY = xiStartY + 6 * (rowH + rowGap) + 20;
  if (impactPlayer) {
    ctx.fillStyle = 'rgba(168, 85, 247, 0.18)';
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
    ctx.lineWidth = 2;
    roundRect(ctx, cardX, impactY, cardW, 85, 16);
    ctx.fill();
    ctx.stroke();

    // Badge
    ctx.fillStyle = '#A855F7';
    roundRect(ctx, cardX + 20, impactY + 22, 140, 40, 10);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ IMPACT SUB #12', cardX + 90, impactY + 47);

    // Name & Details
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(impactPlayer.name, cardX + 180, impactY + 48);

    ctx.fillStyle = '#D8B4FE';
    ctx.font = '700 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      `[${impactPlayer.role}] • ${impactPlayer.overallRating} OVR${impactPlayer.isOverseas ? ' ✈️ Overseas' : ''}`,
      cardX + 180 + ctx.measureText(impactPlayer.name).width + 16,
      impactY + 48
    );

    // Price
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FBBF24';
    ctx.font = '900 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(formatLakhs(impactPlayer.soldPriceLakhs), cardX + cardW - 25, impactY + 52);
  }

  // Bench Squad Section
  const benchY = impactY + 115;
  const xiIds = new Set(xi.map((p) => p.id));
  if (impactPlayer) xiIds.add(impactPlayer.id);
  const bench = options.squad.filter((p) => !xiIds.has(p.id));

  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '800 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`BENCH SQUAD RESERVES (${bench.length} PLAYERS)`, cardX, benchY);

  const benchBoxY = benchY + 12;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  roundRect(ctx, cardX, benchBoxY, cardW, 160, 14);
  ctx.fill();
  ctx.stroke();

  if (bench.length === 0) {
    ctx.fillStyle = '#64748B';
    ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('All drafted players selected in Playing XI & Impact Sub.', cardX + 30, benchBoxY + 50);
  } else {
    const benchCols = 3;
    const bColW = (cardW - 40) / benchCols;
    bench.slice(0, 12).forEach((bp, idx) => {
      const bCol = idx % benchCols;
      const bRow = Math.floor(idx / benchCols);
      const bx = cardX + 20 + bCol * bColW;
      const by = benchBoxY + 36 + bRow * 38;

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '700 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const bName = bp.name.length > 16 ? bp.name.substring(0, 15) + '..' : bp.name;
      ctx.fillText(`${bName} (${bp.role})`, bx, by);

      ctx.fillStyle = '#F59E0B';
      ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(formatLakhs(bp.soldPriceLakhs), bx + bColW - 25, by);
    });
  }

  // Footer Signature
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    'OFFICIAL IPL MATCH-DAY TEAM SHEET • STAR SPORTS BROADCAST GRAPHICS',
    width / 2,
    height - 35
  );

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `IPL_2026_${options.teamCode}_PlayingXI_Poster.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Backward-compatible alias
export async function downloadSquadPosterPng(options: SquadPosterOptions): Promise<void> {
  return downloadFullSquadPosterPng(options);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
