'use client';
// ============================================================
// WaitingRoomDisplay — Patient-facing waiting room screen
//
// Consumes useDisplayQueue which handles:
//   Task 3.1 — Supabase Realtime WebSocket subscription
//   Task 3.2 — Dynamic metrics (position, token grid)
//   Task 3.3 — Client-side wait time calculation engine
// ============================================================

import React from 'react';
import { useDisplayQueue, type ConnectionStatus } from '@/hooks/useDisplayQueue';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Compute estimated wait for the token at `idx` (0-indexed) in the waiting list.
 * Formula: sessionRemainingMins + idx × avgConsultMins
 */
function computeTokenWait(
  idx: number,
  sessionRemainingMins: number,
  avgConsultMins: number,
): number {
  return Math.round(sessionRemainingMins + idx * avgConsultMins);
}

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

// ── Connection badge ──────────────────────────────────────────────────────────

interface LiveBadgeProps {
  status: ConnectionStatus;
  pulseTick: boolean; // toggles every 3s for dot animation
}

function LiveBadge({ status, pulseTick }: LiveBadgeProps) {
  const map: Record<ConnectionStatus, { label: string; dotColor: string; bg: string; text: string }> = {
    connecting: { label: 'Connecting…', dotColor: '#6d7a77', bg: '#e2e8f0',  text: '#3d4947' },
    live:       { label: 'Live Synced', dotColor: '#00685f', bg: '#e2e7ff',  text: '#00685f' },
    stale:      { label: 'Reconnecting', dotColor: '#f59e0b', bg: '#fef3c7', text: '#b45309' },
    error:      { label: 'Offline',      dotColor: '#ba1a1a', bg: '#ffdad6', text: '#93000a' },
  };
  const cfg = map[status];

  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-black/5"
      style={{ background: cfg.bg }}
    >
      <span
        className="w-2 h-2 rounded-full block transition-opacity duration-700"
        style={{
          background: cfg.dotColor,
          opacity: status === 'live' ? (pulseTick ? 1 : 0.3) : 1,
        }}
      />
      <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: cfg.text }}>
        {cfg.label}
      </span>
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-[#e2e8f0] ${className}`} />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function WaitingRoomDisplay() {
  const {
    serving,
    waiting,
    avgConsultMins,
    viewerToken,
    viewerPosition,
    isViewerServing,
    isViewerCompleted,
    patientsAhead,
    estimatedWaitMins,
    sessionElapsedMins,
    sessionRemainingMins,
    progressPct,
    connectionStatus,
    isLoading,
    error,
    now,
    justCalled,
  } = useDisplayQueue();

  // Pulse tick for live indicator dot (toggles via now % 6000)
  const pulseTick = Math.floor(now / 3_000) % 2 === 0;

  // First 3 upcoming waiting patients for the Queue Sequence grid
  const upcomingSlice = waiting.slice(0, 3);

  // Session elapsed label — only render after client clock is live (now > 0)
  const sessionElapsedLabel =
    now === 0
      ? ''
      : sessionElapsedMins < 1
      ? 'just started'
      : `${Math.floor(sessionElapsedMins)}m in session`;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] font-sans text-[#131B2E]">

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <header className="w-full flex items-center justify-between px-8 py-4 bg-white border-b border-[#f1f5f9] sticky top-0 z-10">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00685f] flex items-center justify-center shadow-lg shadow-[#00685f]/20">
            <span
              className="material-symbols-outlined text-white text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_hospital
            </span>
          </div>
          <div>
            <p className="text-[15px] font-bold leading-tight text-[#131b2e] tracking-tight">CareQueue</p>
            <p className="text-[11px] text-[#6d7a77] leading-tight">Patient Waiting Room</p>
          </div>
        </div>

        {/* Right side: clock + connection badge */}
        <div className="flex items-center gap-4">
          <span className="text-[14px] font-medium text-[#3d4947] tabular-nums hidden sm:block">
            {now > 0 ? formatTime(now) : ''}
          </span>
          <LiveBadge status={connectionStatus} pulseTick={pulseTick} />
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-[900px] mx-auto px-6 py-10 flex flex-col gap-8">

        {/* ── Error banner ──────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 bg-[#ffdad6] border border-[#93000a]/20 text-[#93000a] px-5 py-3 rounded-2xl text-[13px] font-semibold">
            <span className="material-symbols-outlined text-base">error</span>
            <span>Unable to load queue data: {error}</span>
          </div>
        )}

        {/* ── NOW SERVING hero ──────────────────────────────────────────── */}
        <section
          id="now-serving-card"
          className={`bg-white border-2 rounded-3xl flex flex-col items-center justify-center text-center py-14 px-8 shadow-xl shadow-black/[0.04] transition-all duration-500 ${
            justCalled
              ? 'border-[#00685f] scale-[1.01] shadow-[#00685f]/20 shadow-2xl'
              : 'border-[#e2e8f0]'
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#6d7a77] mb-4">
            Now Serving
          </p>

          {isLoading ? (
            <>
              <Skeleton className="h-[clamp(5rem,20vw,10rem)] w-64 mb-4" />
              <Skeleton className="h-5 w-32" />
            </>
          ) : (
            <>
              {/* Token number — mega display */}
              <div
                id="current-serving-token"
                className={`text-[clamp(5rem,20vw,10rem)] font-extrabold leading-none tracking-tighter transition-all duration-500 ${
                  justCalled ? 'text-[#008378] scale-105' : 'text-[#00685f]'
                }`}
              >
                {serving ? `T-${serving.token_number}` : '—'}
              </div>

              {/* Patient meta (name + elapsed) — privacy-safe: first name + initial only */}
              {serving && (
                <div className="mt-4 flex flex-col items-center gap-1.5">
                  <p className="text-[16px] font-semibold text-[#3d4947]">
                    {serving.patient_name}
                  </p>
                  <span className="text-[13px] text-[#bcc9c6] italic">
                    {sessionElapsedLabel}
                  </span>
                </div>
              )}

              {!serving && !isLoading && (
                <p className="text-[15px] text-[#bcc9c6] mt-4 italic">
                  No patient currently in session
                </p>
              )}
            </>
          )}

          {/* Animated accent bar */}
          <div className="mt-8 h-1 w-24 rounded-full bg-[#e2e8f0] overflow-hidden">
            <div
              className="h-full bg-[#00685f] rounded-full transition-all duration-700"
              style={{ width: serving ? '100%' : '0%' }}
            />
          </div>
        </section>

        {/* ── Middle row: Next Token + Estimated Wait ────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* Next Token card */}
          <div
            id="next-token-card"
            className="bg-white border-2 border-[#e2e8f0] rounded-3xl p-8 flex flex-col items-center text-center shadow-lg shadow-black/[0.03]"
          >
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#6d7a77] mb-3">
              Next Token
            </p>

            {isLoading ? (
              <>
                <Skeleton className="h-14 w-36 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : upcomingSlice.length > 0 ? (
              <div className="flex flex-col items-center gap-3">
                <div className="text-[2.5rem] font-extrabold text-[#00685f] tracking-tighter leading-none mb-1">
                  T-{upcomingSlice[0].token_number}
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#00685f]/10 text-[#00685f] text-[13px] font-bold rounded-full border border-[#00685f]/20">
                  Next up for consultation
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-2">
                <span className="text-[2rem] font-extrabold text-[#bcc9c6] tracking-tighter leading-none">
                  —
                </span>
                <p className="text-[13px] text-[#bcc9c6]">No patients waiting</p>
              </div>
            )}
          </div>

          {/* Estimated Wait card */}
          <div
            id="estimated-wait-card"
            className="bg-[#0051d5] rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-xl shadow-[#0051d5]/25 text-white border-2 border-[#0051d5]"
          >
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] opacity-80 mb-2">
              Estimated Wait
            </p>

            {isLoading ? (
              <>
                <Skeleton className="h-20 w-32 mb-3 bg-white/20" />
                <Skeleton className="h-4 w-28 bg-white/20" />
              </>
            ) : upcomingSlice.length > 0 ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span
                    id="estimated-wait-value"
                    className="text-[4rem] font-black leading-none tracking-tighter tabular-nums"
                  >
                    {Math.round(sessionRemainingMins) <= 0 ? 'Now' : Math.round(sessionRemainingMins)}
                  </span>
                  {Math.round(sessionRemainingMins) > 0 && (
                    <span className="text-[1.5rem] font-bold opacity-90">min</span>
                  )}
                </div>
                <p className="text-[12px] opacity-70 italic mt-3">Updated real-time</p>
              </>
            ) : (
              <div className="text-[2rem] font-bold opacity-60">—</div>
            )}

            <div className="mt-6 w-12 h-1 bg-white/30 rounded-full" />
          </div>
        </div>

        {/* ── Queue Sequence grid — Task 3.2 ────────────────────────────── */}
        <section
          id="queue-sequence"
          className="bg-white border-2 border-dashed border-[#e2e8f0] rounded-3xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-5 px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#6d7a77]">
              Queue Sequence
            </h2>
            <span className="text-[12px] font-semibold text-[#bcc9c6] uppercase tracking-widest">
              {waiting.length} Waiting
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : waiting.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-[#bcc9c6]">
              <span className="material-symbols-outlined text-[40px]">check_circle</span>
              <p className="text-[14px] font-medium">No patients in queue</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingSlice.map((patient, idx) => {
                const isNext = idx === 0;
                const isViewer = patient.token_number === viewerToken;
                // Per-token wait: remaining session time + (idx slots) × avg consult
                const tokenWaitMins = now > 0
                  ? computeTokenWait(idx, sessionRemainingMins, avgConsultMins)
                  : null;

                return (
                  <div
                    key={patient.id}
                    id={`queue-row-${patient.token_number}`}
                    className={`flex items-center justify-between rounded-2xl px-6 py-4 transition-all duration-300 ${
                      isNext
                        ? 'bg-[#f2f3ff] border-2 border-[#e2e7ff]'
                        : isViewer
                        ? 'bg-[#dbe1ff]/40 border-2 border-[#b4c5ff]/60'
                        : 'bg-[#fafafa] border-2 border-[#f1f5f9]'
                    }`}
                  >
                    {/* Left: token number + "You" badge */}
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[1.4rem] font-bold tracking-tight ${
                          isNext
                            ? 'text-[#131b2e]'
                            : isViewer
                            ? 'text-[#0051d5]'
                            : 'text-[#3d4947]'
                        }`}
                      >
                        T-{patient.token_number}
                      </span>
                      {isViewer && (
                        <span className="text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 bg-[#0051d5]/10 text-[#0051d5] rounded-full border border-[#0051d5]/20">
                          You
                        </span>
                      )}
                    </div>

                    {/* Right: estimated wait pill */}
                    {tokenWaitMins !== null && (
                      <div className={`flex flex-col items-end gap-0.5`}>
                        <span
                          className={`text-[13px] font-black tabular-nums ${
                            isNext ? 'text-[#00685f]' : isViewer ? 'text-[#0051d5]' : 'text-[#3d4947]'
                          }`}
                        >
                          {tokenWaitMins <= 0 ? 'Now' : `~${tokenWaitMins}m`}
                        </span>
                        <span className="text-[10px] font-medium text-[#bcc9c6] uppercase tracking-widest">
                          est. wait
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {waiting.length > 3 && (
                <div className="text-center py-3">
                  <span className="text-[12px] font-medium text-[#bcc9c6]">
                    +{waiting.length - 3} more patient{waiting.length - 3 > 1 ? 's' : ''} in queue
                  </span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <p className="text-center text-[12px] text-[#bcc9c6] pb-4">
          Please stay nearby. You will be called when it&apos;s your turn.
        </p>
      </main>
    </div>
  );
}
