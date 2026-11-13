import React, { useEffect, useState } from 'react';
import { Bot, X, Users, Download } from 'lucide-react';
import { apiRequest } from '../api/http';
import { RoomLotItem, RoomSnapshot, TeamCode } from '../types';
import { formatLakhs, roleBadgeClasses } from '../utils/format';
import { FranchiseLogo } from '../utils/franchiseAssets';
import { PlayerHeadshot } from '../utils/playerPhotos';
import { SquadPosterModal } from './SquadPosterModal';

interface TeamsOverviewPanelProps {
  room: RoomSnapshot;
  currentUserId: string;
}

export const TeamsOverviewPanel: React.FC<TeamsOverviewPanelProps> = ({
  room,
  currentUserId,
}) => {
  const [inspectTeam, setInspectTeam] = useState<TeamCode | null>(null);
  const [teamSquad, setTeamSquad] = useState<RoomLotItem[]>([]);
  const [loadingSquad, setLoadingSquad] = useState(false);
  const [showPoster, setShowPoster] = useState(false);

  useEffect(() => {
    if (!inspectTeam) return;
    setLoadingSquad(true);
    apiRequest<{ lots: RoomLotItem[] }>(
      `/api/rooms/${room.code}/lots?status=SOLD&teamCode=${inspectTeam}`
    )
      .then((res) => setTeamSquad(res.lots))
      .finally(() => setLoadingSquad(false));
  }, [inspectTeam, room.code, room.counts.sold]);

  const leadingTeam = room.currentLot?.currentBidderTeam;
  const inspectedMeta = room.teams.find((t) => t.teamCode === inspectTeam);

  return (
    <div className="rounded-2xl border border-white/15 bg-stadium-900/95 p-3.5 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-amber-400" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
            10 Franchises Live Purse & Squads
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">Click team to inspect squad</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {room.teams.map((t) => {
          const isMine = t.userId === currentUserId;
          const isLeading = leadingTeam === t.teamCode;

          return (
            <button
              key={t.teamCode}
              type="button"
              onClick={() => setInspectTeam(t.teamCode)}
              className={`w-full rounded-2xl border p-3 text-left transition-all duration-150 ${
                isLeading
                  ? 'border-amber-400 bg-amber-500/15 shadow-lg shadow-amber-500/15 ring-1 ring-amber-400/40'
                  : isMine
                    ? 'border-sky-400/60 bg-stadium-950/90 shadow-md ring-1 ring-sky-400/30'
                    : 'border-white/10 bg-stadium-950/70 hover:border-white/25 hover:bg-stadium-950/90'
              }`}
            >
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stadium-950/90 border border-white/10 p-1 shadow-sm">
                    <FranchiseLogo teamCode={t.teamCode} size="sm" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-black text-xs text-white">
                        {t.teamCode}
                      </span>
                      <span className="truncate text-xs font-semibold text-slate-300">
                        {t.ownerName || 'Unclaimed'}
                      </span>
                      {t.isBot && <Bot className="h-3 w-3 shrink-0 text-purple-400" />}
                      {isMine && (
                        <span className="rounded bg-sky-500/20 px-1.5 py-0.2 text-[9px] font-black text-sky-300 border border-sky-500/30">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                      <span>WK:{t.roleBreakdown.WK}</span>
                      <span>BAT:{t.roleBreakdown.BAT}</span>
                      <span>AR:{t.roleBreakdown.AR}</span>
                      <span>BWL:{t.roleBreakdown.BOWL}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="tabular-nums font-display text-sm font-black text-amber-300">
                    {formatLakhs(t.purseRemainingLakhs)}
                  </div>
                  <div className="tabular-nums text-[10px] font-bold text-slate-400">
                    {t.squadCount}/25 • OS <span className="text-sky-300">{t.overseasCount}/8</span>
                  </div>
                  <div className="mt-0.5 text-[10px] font-bold text-sky-300">
                    🃏 {t.rtmCardsRemaining} RTM{t.rtmCardsRemaining === 1 ? '' : 's'}
                    {t.retentionsCount > 0 && (
                      <span className="ml-1 text-amber-300 font-semibold">• ⭐ {t.retentionsCount} Ret</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Squad Depth Chart Modal */}
      {inspectTeam && inspectedMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-stadium-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-stadium-950 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <FranchiseLogo teamCode={inspectedMeta.teamCode} size="md" />
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {inspectedMeta.teamName} Squad ({inspectedMeta.squadCount}/25)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Owner: <strong className="text-slate-200">{inspectedMeta.ownerName || 'None'}</strong> • Purse Left:{' '}
                    <strong className="text-amber-300">
                      {formatLakhs(inspectedMeta.purseRemainingLakhs)}
                    </strong>{' '}
                    • Overseas: <strong className="text-sky-300">{inspectedMeta.overseasCount}/8</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {teamSquad.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPoster(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-500/25"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Poster & Export</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setInspectTeam(null);
                    setShowPoster(false);
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {loadingSquad ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  Loading squad roster...
                </div>
              ) : teamSquad.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 py-12 text-center text-sm text-slate-400">
                  No players bought by {inspectedMeta.teamCode} yet.
                </div>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {teamSquad.map((item) => (
                    <div
                      key={item.lotId}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-stadium-950 p-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PlayerHeadshot
                          player={item.player}
                          teamCode={inspectedMeta.teamCode}
                          size="xs"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-xs font-bold text-white truncate">
                              {item.player.name}
                            </span>
                            {item.player.isOverseas && (
                              <span className="text-[10px] text-sky-300">✈️</span>
                            )}
                            {item.isRetention && (
                              <span className="rounded bg-amber-500/25 px-1.5 py-0.2 text-[9px] font-black text-amber-300">
                                ⭐ RETAINED
                              </span>
                            )}
                            {item.isRtmBuy && (
                              <span className="rounded bg-sky-500/25 px-1.5 py-0.2 text-[9px] font-black text-sky-300">
                                🏏 RTM
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span
                              className={`rounded border px-1.5 py-0.2 text-[9px] font-bold ${roleBadgeClasses(
                                item.player.role
                              )}`}
                            >
                              {item.player.role}
                            </span>
                            <span>{item.player.isCapped ? 'Capped' : 'Uncapped'}</span>
                            <span>• OVR {item.player.overallRating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="tabular-nums font-mono text-xs font-black text-emerald-400">
                        {formatLakhs(item.soldPriceLakhs)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPoster && inspectedMeta && (
        <SquadPosterModal
          open={showPoster}
          onClose={() => setShowPoster(false)}
          teamCode={inspectedMeta.teamCode}
          teamName={inspectedMeta.teamName}
          ownerName={inspectedMeta.ownerName || 'None'}
          purseRemainingLakhs={inspectedMeta.purseRemainingLakhs}
          totalPurseLakhs={room.initialPurseLakhs}
          squad={teamSquad.map((item) => ({
            ...item.player,
            soldPriceLakhs: item.soldPriceLakhs,
            soldToTeam: item.soldToTeam,
          }))}
        />
      )}
    </div>
  );
};
