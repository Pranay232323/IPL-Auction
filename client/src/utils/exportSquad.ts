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
  link.setAttribute('download', `${teamCode}_IPL_2026_Squad.csv`);
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
  analysis?: TeamAnalysisRank
): Promise<boolean> {
  const meta = getFranchiseMeta(teamCode);
  const totalSpent = squad.reduce((sum, p) => sum + (p.soldPriceLakhs || 0), 0);
  const overseasCount = squad.filter((p) => p.isOverseas).length;

  let text = `🏏 *${teamName} (${teamCode}) — IPL Mega Auction 2026 Squad*\n`;
  text += `👤 *GM / Owner:* ${ownerName}\n`;
  text += `💰 *Purse Spent:* ${formatLakhs(totalSpent)} (${squad.length} Players, ${overseasCount} Overseas)\n`;
  if (analysis) {
    text += `🏆 *AI Tournament Prediction:* Rank #${analysis.rank} | Grade: ${analysis.grade} | Win Prob: ${analysis.winProbabilityPct}%\n`;
  }
  text += `\n⭐ *Playing XI Lineup:*\n`;

  const xi = analysis?.bestPlayingXI || squad.slice(0, 11);
  xi.forEach((p, idx) => {
    text += `${idx + 1}. ${p.name} [${p.role}]${p.isOverseas ? ' ✈️' : ''} — ${formatLakhs(p.soldPriceLakhs)}\n`;
  });

  if (analysis?.impactPlayer) {
    text += `⚡ *Impact Sub:* ${analysis.impactPlayer.name} [${analysis.impactPlayer.role}]\n`;
  }

  text += `\n#IPLAuction #CricketSimulation`;

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

export async function downloadSquadPosterPng(options: SquadPosterOptions): Promise<void> {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const franchise = getFranchiseMeta(options.teamCode);
  const primaryColor = franchise?.primaryColor || '#F59E0B';
  const secondaryColor = franchise?.secondaryColor || '#1E3A8A';

  // 1. Stadium Gradient Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0A0E17');
  bgGrad.addColorStop(0.5, '#0F172A');
  bgGrad.addColorStop(1, '#050811');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle team glow circles in top-right and bottom-left
  ctx.save();
  ctx.globalAlpha = 0.18;
  const glow1 = ctx.createRadialGradient(width * 0.85, height * 0.15, 20, width * 0.85, height * 0.15, 450);
  glow1.addColorStop(0, primaryColor);
  glow1.addColorStop(1, 'transparent');
  ctx.fillStyle = glow1;
  ctx.beginPath();
  ctx.arc(width * 0.85, height * 0.15, 450, 0, Math.PI * 2);
  ctx.fill();

  const glow2 = ctx.createRadialGradient(width * 0.15, height * 0.85, 20, width * 0.15, height * 0.85, 450);
  glow2.addColorStop(0, secondaryColor);
  glow2.addColorStop(1, 'transparent');
  ctx.fillStyle = glow2;
  ctx.beginPath();
  ctx.arc(width * 0.15, height * 0.85, 450, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Top Accent Banner Strip
  ctx.fillStyle = primaryColor;
  ctx.fillRect(0, 0, width, 14);

  // 2. Franchise Header Card
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  roundRect(ctx, 60, 50, width - 120, 150, 20);
  ctx.fill();
  ctx.stroke();

  // Team Logo / Code Badge
  ctx.fillStyle = primaryColor;
  roundRect(ctx, 85, 75, 100, 100, 16);
  ctx.fill();
  ctx.fillStyle = '#050811';
  ctx.font = '900 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(options.teamCode, 135, 140);

  // Team Name & Owner
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 40px sans-serif';
  ctx.fillText(options.teamName.toUpperCase(), 210, 118);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 22px sans-serif';
  ctx.fillText(`FRANCHISE GM: ${options.ownerName.toUpperCase()} • IPL 2026 OFFICIAL SQUAD`, 210, 155);

  // 3. Stats Strip
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
      val: options.analysis ? `#${options.analysis.rank} (${options.analysis.grade})` : 'READY',
    },
  ];

  statItems.forEach((stat, i) => {
    const x = 60 + i * (statBoxWidth + 15);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, statsY, statBoxWidth, 85, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stat.label, x + statBoxWidth / 2, statsY + 30);

    ctx.fillStyle = i === 3 ? primaryColor : '#F8FAFC';
    ctx.font = '900 24px sans-serif';
    ctx.fillText(stat.val, x + statBoxWidth / 2, statsY + 65);
  });

  // 4. Playing XI Section Title
  ctx.textAlign = 'left';
  ctx.fillStyle = primaryColor;
  ctx.font = '900 24px sans-serif';
  ctx.fillText('⚡ PREDICTED OPTIMAL PLAYING XI (MAX 4 OVERSEAS)', 60, 360);

  // Playing XI Rows (11 players in 2 columns)
  const xi = options.analysis?.bestPlayingXI || options.squad.slice(0, 11);
  const xiStartY = 385;
  const rowHeight = 62;
  const colWidth = (width - 120 - 20) / 2;

  xi.forEach((p, idx) => {
    const col = idx < 6 ? 0 : 1;
    const rowInCol = idx < 6 ? idx : idx - 6;
    const rx = 60 + col * (colWidth + 20);
    const ry = xiStartY + rowInCol * (rowHeight + 10);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.lineWidth = 1;
    roundRect(ctx, rx, ry, colWidth, rowHeight, 10);
    ctx.fill();
    ctx.stroke();

    // Index & Role Badge
    ctx.fillStyle = '#64748B';
    ctx.font = '800 18px sans-serif';
    ctx.fillText(`#${idx + 1}`, rx + 15, ry + 38);

    // Role box
    ctx.fillStyle = primaryColor + '25';
    roundRect(ctx, rx + 52, ry + 16, 52, 30, 6);
    ctx.fill();
    ctx.fillStyle = primaryColor;
    ctx.font = '800 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.role, rx + 78, ry + 36);

    // Player Name
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 19px sans-serif';
    const displayName = p.name.length > 17 ? p.name.substring(0, 16) + '..' : p.name;
    ctx.fillText(displayName, rx + 115, ry + 38);

    if (p.isOverseas) {
      ctx.fillStyle = '#38BDF8';
      ctx.font = '14px sans-serif';
      ctx.fillText('✈️', rx + 115 + ctx.measureText(displayName).width + 6, ry + 38);
    }

    // Price & Rating
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FBBF24';
    ctx.font = '800 18px sans-serif';
    ctx.fillText(formatLakhs(p.soldPriceLakhs), rx + colWidth - 15, ry + 38);
  });

  // Impact Player Slot (in column 2 row 5)
  if (options.analysis?.impactPlayer) {
    const ip = options.analysis.impactPlayer;
    const rx = 60 + (colWidth + 20);
    const ry = xiStartY + 5 * (rowHeight + 10);

    ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, rx, ry, colWidth, rowHeight, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#C084FC';
    ctx.font = '800 13px sans-serif';
    ctx.fillText('IMPACT SUB', rx + 15, ry + 26);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 18px sans-serif';
    ctx.fillText(`${ip.name} [${ip.role}]`, rx + 15, ry + 48);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#E9D5FF';
    ctx.font = '800 18px sans-serif';
    ctx.fillText(formatLakhs(ip.soldPriceLakhs), rx + colWidth - 15, ry + 38);
  }

  // 5. Full Bench Squad Section
  const benchY = 850;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '800 20px sans-serif';
  ctx.fillText('BENCH SQUAD RESERVES', 60, benchY);

  const bench = options.squad.filter((p) => !xi.some((x) => x.id === p.id));
  const benchBoxY = benchY + 15;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  roundRect(ctx, 60, benchBoxY, width - 120, 240, 16);
  ctx.fill();
  ctx.stroke();

  if (bench.length === 0) {
    ctx.fillStyle = '#64748B';
    ctx.font = '600 18px sans-serif';
    ctx.fillText('No bench players drafted.', 90, benchBoxY + 50);
  } else {
    // 3 columns of bench players
    const benchCols = 3;
    const bColWidth = (width - 160) / benchCols;
    bench.slice(0, 12).forEach((bp, idx) => {
      const bCol = idx % benchCols;
      const bRow = Math.floor(idx / benchCols);
      const bx = 85 + bCol * bColWidth;
      const by = benchBoxY + 40 + bRow * 48;

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '700 17px sans-serif';
      const bName = bp.name.length > 15 ? bp.name.substring(0, 14) + '..' : bp.name;
      ctx.fillText(`${bName} (${bp.role})`, bx, by);

      ctx.fillStyle = '#F59E0B';
      ctx.font = '600 15px sans-serif';
      ctx.fillText(formatLakhs(bp.soldPriceLakhs), bx, by + 18);
    });
  }

  // 6. Footer Signature
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = '600 17px sans-serif';
  ctx.fillText('OFFICIAL IPL MEGA AUCTION SIMULATION • REAL-TIME 10-PLAYER GAME', width / 2, 1280);

  // Trigger PNG download
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `IPL_2026_${options.teamCode}_Squad_Poster.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
