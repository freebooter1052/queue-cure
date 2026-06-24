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
import { useDisplayQueue } from '@/hooks/useDisplayQueue';

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

/*
function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
*/



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
    previous,
    avgConsultMins,
    viewerToken,
    sessionElapsedMins,
    sessionRemainingMins,
    isLoading,
    error,
    now,
    justCalled,
  } = useDisplayQueue();

  // Next token is always the first waiting patient
  const nextPatient = waiting[0];

  // For queue sequence, show up to 6 patients on screen to fit a TV height nicely
  const queueLimit = 6;
  const queueSlice = waiting.slice(0, queueLimit);

  // Session elapsed label — only render after client clock is live (now > 0)
  const sessionElapsedLabel =
    now === 0
      ? ''
      : sessionElapsedMins < 1
      ? 'just started'
      : `${Math.floor(sessionElapsedMins)}m in session`;

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[#F8FAFC] font-sans text-[#131B2E] lg:overflow-hidden select-none">

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <header className="w-full flex items-center justify-between px-8 py-4 bg-white border-b border-[#f1f5f9] sticky top-0 z-10 shrink-0">
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

        {/* Right side: clock */}
        <div className="flex items-center gap-4">
          <span className="text-[14px] font-medium text-[#3d4947] tabular-nums hidden sm:block">
            {now > 0 ? formatTime(now) : ''}
          </span>
        </div>
      </header>

      {/* ── Error banner ──────────────────────────────────────────────── */}
      {error && (
        <div className="mx-8 mt-4 flex items-center gap-3 bg-[#ffdad6] border border-[#93000a]/20 text-[#93000a] px-5 py-3 rounded-2xl text-[13px] font-semibold shrink-0">
          <span className="material-symbols-outlined text-base">error</span>
          <span>Unable to load queue data: {error}</span>
        </div>
      )}

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6 lg:overflow-hidden lg:h-[calc(100vh-76px)]">

        {/* Left Column: Now Serving (Hero) + Next Token & Estimated Wait */}
        <div className="w-full lg:w-[58%] flex flex-col gap-6 lg:h-full lg:justify-between">
          
          {/* NOW SERVING hero */}
          <section
            id="now-serving-card"
            className={`flex-1 bg-white border-2 rounded-3xl flex flex-col items-center justify-center text-center py-10 lg:py-12 px-8 shadow-xl shadow-black/[0.04] transition-all duration-500 ${
              serving?.is_emergency
                ? 'border-red-500 shadow-red-200/50 shadow-2xl bg-red-50/20'
                : justCalled
                ? 'border-[#00685f] scale-[1.01] shadow-[#00685f]/20 shadow-2xl'
                : 'border-[#e2e8f0]'
            }`}
          >
            <p className={`text-[11px] lg:text-[13px] font-bold uppercase tracking-[0.3em] mb-2 lg:mb-4 flex items-center justify-center gap-1.5 ${
              serving?.is_emergency ? 'text-red-600 animate-pulse' : 'text-[#6d7a77]'
            }`}>
              {serving?.is_emergency && <span className="material-symbols-outlined text-[16px]">emergency</span>}
              {serving?.is_emergency ? 'Emergency Session' : 'Now Serving'}
            </p>

            {isLoading ? (
              <>
                <Skeleton className="h-[clamp(5rem,15vw,8rem)] w-64 mb-4" />
                <Skeleton className="h-5 w-32" />
              </>
            ) : (
              <>
                {/* Token number — mega display */}
                <div
                  id="current-serving-token"
                  className={`text-[clamp(5rem,15vw,8rem)] font-extrabold leading-none tracking-tighter transition-all duration-500 ${
                    serving?.is_emergency
                      ? 'text-red-600 scale-102 animate-pulse'
                      : justCalled ? 'text-[#008378] scale-105' : 'text-[#00685f]'
                  }`}
                >
                  {serving ? `T-${serving.token_number}` : '—'}
                </div>

                {/* Patient meta (name + elapsed) — privacy-safe */}
                {serving && (
                  <div className="mt-2 lg:mt-4 flex flex-col items-center gap-1.5">
                    <p className={`text-[16px] lg:text-[20px] font-semibold ${
                      serving.is_emergency ? 'text-red-900' : 'text-[#3d4947]'
                    }`}>
                      {serving.patient_name}
                    </p>
                    <span className={`text-[13px] lg:text-[15px] italic ${
                      serving.is_emergency ? 'text-red-500' : 'text-[#bcc9c6]'
                    }`}>
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
            <div className="mt-6 lg:mt-8 h-1 w-24 rounded-full bg-[#e2e8f0] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  serving?.is_emergency ? 'bg-red-600' : 'bg-[#00685f]'
                }`}
                style={{ width: serving ? '100%' : '0%' }}
              />
            </div>
          </section>

          {/* Sub-cards Row (Last Called + Next Token + Estimated Wait) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 shrink-0 lg:h-[180px] xl:h-[220px]">
            
            {/* Last Called Card */}
            <div
              id="last-called-card"
              className="bg-white border-2 border-[#e2e8f0] rounded-3xl p-6 lg:p-8 flex flex-col items-center justify-center text-center shadow-lg shadow-black/[0.03]"
            >
              <p className="text-[11px] lg:text-[12px] font-bold uppercase tracking-[0.2em] text-[#6d7a77] mb-2 lg:mb-3">
                Last Called
              </p>

              {isLoading ? (
                <>
                  <Skeleton className="h-10 w-28 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </>
              ) : previous ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="text-[2.2rem] lg:text-[2.8rem] font-extrabold tracking-tighter leading-none text-[#6d7a77]">
                    T-{previous.token_number}
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-[#6d7a77] text-[11px] lg:text-[12px] font-bold rounded-full border border-slate-200">
                    Session completed
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 py-1">
                  <span className="text-[1.8rem] lg:text-[2.2rem] font-extrabold text-[#bcc9c6] tracking-tighter leading-none">
                    —
                  </span>
                  <p className="text-[11px] lg:text-[12px] text-[#bcc9c6]">None today yet</p>
                </div>
              )}
            </div>
            
            {/* Next Token Card */}
            <div
              id="next-token-card"
              className="bg-white border-2 border-[#e2e8f0] rounded-3xl p-6 lg:p-8 flex flex-col items-center justify-center text-center shadow-lg shadow-black/[0.03]"
            >
              <p className="text-[11px] lg:text-[12px] font-bold uppercase tracking-[0.2em] text-[#6d7a77] mb-2 lg:mb-3">
                Next Token
              </p>

              {isLoading ? (
                <>
                  <Skeleton className="h-10 w-28 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </>
              ) : nextPatient ? (
                <div className="flex flex-col items-center gap-2">
                  <div className={`text-[2.2rem] lg:text-[2.8rem] font-extrabold tracking-tighter leading-none ${
                    nextPatient.is_emergency ? 'text-red-600' : 'text-[#00685f]'
                  }`}>
                    T-{nextPatient.token_number}
                  </div>
                  {nextPatient.is_emergency ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-[11px] lg:text-[12px] font-extrabold rounded-full border border-red-200 animate-pulse">
                      <span className="material-symbols-outlined text-[12px] fill-current">emergency</span>
                      EMERGENCY PRIORITY
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#00685f]/10 text-[#00685f] text-[11px] lg:text-[12px] font-bold rounded-full border border-[#00685f]/20">
                      Next up for consultation
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 py-1">
                  <span className="text-[1.8rem] lg:text-[2.2rem] font-extrabold text-[#bcc9c6] tracking-tighter leading-none">
                    —
                  </span>
                  <p className="text-[11px] lg:text-[12px] text-[#bcc9c6]">No patients waiting</p>
                </div>
              )}
            </div>

            {/* Estimated Wait Card */}
            <div
              id="estimated-wait-card"
              className="bg-[#0051d5] rounded-3xl p-6 lg:p-8 flex flex-col items-center justify-center text-center shadow-xl shadow-[#0051d5]/25 text-white border-2 border-[#0051d5]"
            >
              <p className="text-[11px] lg:text-[12px] font-bold uppercase tracking-[0.2em] opacity-80 mb-2">
                Estimated Wait
              </p>

              {isLoading ? (
                <>
                  <Skeleton className="h-14 w-24 mb-2 bg-white/20" />
                  <Skeleton className="h-3 w-20 bg-white/20" />
                </>
              ) : nextPatient ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span
                      id="estimated-wait-value"
                      className="text-[3rem] lg:text-[4rem] font-black leading-none tracking-tighter tabular-nums"
                    >
                      {Math.round(sessionRemainingMins) <= 0 ? 'Now' : Math.round(sessionRemainingMins)}
                    </span>
                    {Math.round(sessionRemainingMins) > 0 && (
                      <span className="text-[1.2rem] lg:text-[1.5rem] font-bold opacity-90">min</span>
                    )}
                  </div>
                  <p className="text-[11px] opacity-70 italic mt-2">Updated real-time</p>
                </>
              ) : (
                <div className="text-[1.8rem] lg:text-[2.2rem] font-bold opacity-60">—</div>
              )}

              <div className="mt-4 w-12 h-1 bg-white/30 rounded-full" />
            </div>
          </div>

          {/* Small Footer Text */}
          <p className="text-center text-[11px] lg:text-[12px] text-[#bcc9c6] mt-2 lg:mt-4 shrink-0">
            Please stay nearby. You will be called when it&apos;s your turn.
          </p>
        </div>

        {/* Right Column: Queue Sequence */}
        <section
          id="queue-sequence"
          className="w-full lg:w-[42%] bg-white border-2 border-dashed border-[#e2e8f0] rounded-3xl p-6 shadow-sm flex flex-col lg:h-full lg:overflow-hidden"
        >
          <div className="flex items-center justify-between mb-5 px-1 shrink-0">
            <h2 className="text-[11px] lg:text-[13px] font-bold uppercase tracking-[0.25em] text-[#6d7a77]">
              Queue Sequence
            </h2>
            <span className="text-[12px] lg:text-[13px] font-semibold text-[#bcc9c6] uppercase tracking-widest">
              {waiting.length} Waiting
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-3 flex-1 justify-center">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : waiting.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-[#bcc9c6] flex-1">
              <span className="material-symbols-outlined text-[40px]">check_circle</span>
              <p className="text-[14px] font-medium">No patients in queue</p>
            </div>
          ) : (
            <>
              {/* Scrollable Rows Container */}
              <div className="flex flex-col gap-3 lg:overflow-y-auto lg:flex-1 pr-1 custom-scrollbar">
                {queueSlice.map((patient, idx) => {
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
                      className={`flex items-center justify-between rounded-2xl px-6 py-4 transition-all duration-300 shrink-0 ${
                        patient.is_emergency
                          ? 'bg-red-50 border-2 border-red-200 animate-pulse'
                          : isNext
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
                            patient.is_emergency
                              ? 'text-red-600'
                              : isNext
                              ? 'text-[#131b2e]'
                              : isViewer
                              ? 'text-[#0051d5]'
                              : 'text-[#3d4947]'
                          }`}
                        >
                          T-{patient.token_number}
                        </span>
                        {patient.is_emergency && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-red-600 text-white rounded-full">
                            <span className="material-symbols-outlined text-[10px] fill-current">emergency</span>
                            Emergency
                          </span>
                        )}
                        {isViewer && (
                          <span className="text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 bg-[#0051d5]/10 text-[#0051d5] rounded-full border border-[#0051d5]/20">
                            You
                          </span>
                        )}
                      </div>

                      {/* Right: estimated wait pill */}
                      {tokenWaitMins !== null && (
                        <div className="flex flex-col items-end gap-0.5">
                          <span
                            className={`text-[13px] font-black tabular-nums ${
                              patient.is_emergency
                                ? 'text-red-600'
                                : isNext 
                                ? 'text-[#00685f]' 
                                : isViewer 
                                ? 'text-[#0051d5]' 
                                : 'text-[#3d4947]'
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
              </div>

              {waiting.length > queueLimit && (
                <div className="text-center pt-4 border-t border-[#f1f5f9] mt-3 shrink-0">
                  <span className="text-[12px] lg:text-[13px] font-semibold text-[#6d7a77]">
                    +{waiting.length - queueLimit} more patient{waiting.length - queueLimit > 1 ? 's' : ''} in queue
                  </span>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

