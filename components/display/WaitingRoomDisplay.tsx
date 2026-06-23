'use client';
import React, { useState, useEffect, useRef } from 'react';
import type { Patient } from '@/lib/types';

// ── Mock data (replace with real data when backend is ready) ─────────────────
const MOCK_SERVING: Patient = {
  id: 'mock-serving',
  patient_name: 'John A.',
  token_number: 104,
  status: 'serving',
  created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  called_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  completed_at: null,
};

const MOCK_WAITING: Patient[] = [
  {
    id: 'mock-w1',
    patient_name: 'Sarah B.',
    token_number: 105,
    status: 'waiting',
    created_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    called_at: null,
    completed_at: null,
  },
  {
    id: 'mock-w2',
    patient_name: 'Carlos M.',
    token_number: 106,
    status: 'waiting',
    created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    called_at: null,
    completed_at: null,
  },
  {
    id: 'mock-w3',
    patient_name: 'Priya S.',
    token_number: 107,
    status: 'waiting',
    created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    called_at: null,
    completed_at: null,
  },
  {
    id: 'mock-w4',
    patient_name: 'Emily T.',
    token_number: 108,
    status: 'waiting',
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    called_at: null,
    completed_at: null,
  },
];

// The token number of the current viewer — in real usage this would come from
// the URL (e.g. /display?token=108) or localStorage after registration.
const VIEWER_TOKEN = 108;
const AVG_CONSULT_MINS = 7;
// ──────────────────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** Relative position suffix */
function positionLabel(pos: number): string {
  if (pos === 1) return 'Next Up';
  if (pos === 2) return '2nd in Line';
  if (pos === 3) return '3rd in Line';
  return `${pos}th in Line`;
}

export default function WaitingRoomDisplay() {
  const [serving, setServing] = useState<Patient | null>(MOCK_SERVING);
  const [waiting, setWaiting] = useState<Patient[]>(MOCK_WAITING);
  const [now, setNow] = useState(Date.now());
  const [isLive, setIsLive] = useState(true);
  const [justCalled, setJustCalled] = useState(false);
  const prevServingRef = useRef<number | null>(MOCK_SERVING.token_number);

  // Tick every second for the live clock & elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Pulse "live" dot every 3s
  useEffect(() => {
    const interval = setInterval(() => setIsLive(v => !v), 3000);
    return () => clearInterval(interval);
  }, []);

  // Detect when the serving token changes → animate
  useEffect(() => {
    const curr = serving?.token_number ?? null;
    if (curr !== prevServingRef.current) {
      setJustCalled(true);
      const t = setTimeout(() => setJustCalled(false), 2000);
      prevServingRef.current = curr;
      return () => clearTimeout(t);
    }
  }, [serving]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const currentTime = formatTime(new Date(now));

  const viewerPosition =
    waiting.findIndex(p => p.token_number === VIEWER_TOKEN) + 1; // 0 → not found

  const isViewerServing = serving?.token_number === VIEWER_TOKEN;

  // Estimated wait: position × avg consult time (remaining time of current session)
  const sessionElapsedMins = serving?.called_at
    ? (now - new Date(serving.called_at).getTime()) / 60000
    : 0;
  const sessionRemainingMins = Math.max(0, AVG_CONSULT_MINS - sessionElapsedMins);

  const estimatedWaitMins =
    viewerPosition > 0
      ? Math.round(sessionRemainingMins + (viewerPosition - 1) * AVG_CONSULT_MINS)
      : 0;

  // Progress bar width for viewer's token
  const totalTokens =
    (serving ? 1 : 0) + waiting.length;
  const posInFull = viewerPosition > 0
    ? (serving ? 1 : 0) + viewerPosition
    : totalTokens + 1;
  const progressPct = totalTokens > 0
    ? Math.round(((posInFull - 1) / totalTokens) * 100)
    : 0;

  // Show first 3 waiting patients in the queue sequence panel
  const upcomingSlice = waiting.slice(0, 3);

  // Elapsed session time label
  const sessionElapsedLabel =
    sessionElapsedMins >= 1
      ? `${Math.floor(sessionElapsedMins)}m in session`
      : 'just started';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] font-sans text-[#131B2E]">
      {/* ── Top Bar ────────────────────────────────────────────────────── */}
      <header className="w-full flex items-center justify-between px-8 py-4 bg-white border-b border-[#f1f5f9]">
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

        {/* Live indicator + clock */}
        <div className="flex items-center gap-4">
          <span className="text-[14px] font-medium text-[#3d4947] tabular-nums">{currentTime}</span>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-[#e2e7ff] rounded-full border border-[#bcc9c6]/40">
            <span
              className="w-2 h-2 rounded-full bg-[#00685f] block transition-opacity duration-700"
              style={{ opacity: isLive ? 1 : 0.3 }}
            />
            <span className="text-[12px] font-bold uppercase tracking-widest text-[#00685f]">
              Live Synced
            </span>
          </div>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-[900px] mx-auto px-6 py-10 flex flex-col gap-8">

        {/* ── NOW SERVING hero ──────────────────────────────────────────── */}
        <section
          className={`bg-white border-2 rounded-3xl flex flex-col items-center justify-center text-center py-14 px-8 shadow-xl shadow-black/[0.04] transition-all duration-500 ${
            justCalled
              ? 'border-[#00685f] scale-[1.01] shadow-[#00685f]/20 shadow-2xl'
              : 'border-[#e2e8f0]'
          }`}
        >
          {/* Sub-label */}
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#6d7a77] mb-4">
            Now Serving
          </p>

          {/* Mega token number */}
          <div
            className={`text-[clamp(5rem,20vw,10rem)] font-extrabold leading-none tracking-tighter transition-all duration-500 ${
              justCalled ? 'text-[#008378] scale-105' : 'text-[#00685f]'
            }`}
          >
            {serving ? `T-${serving.token_number}` : '---'}
          </div>

          {/* Patient name + session elapsed */}
          {serving && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-[18px] font-semibold text-[#3d4947]">{serving.patient_name}</p>
              <span className="text-[13px] text-[#bcc9c6] italic">{sessionElapsedLabel}</span>
            </div>
          )}

          {/* Animated underline bar */}
          <div className="mt-8 h-1 w-24 rounded-full bg-[#e2e8f0] overflow-hidden">
            <div
              className="h-full bg-[#00685f] rounded-full animate-pulse"
              style={{ width: serving ? '100%' : '0%', transition: 'width 1s ease' }}
            />
          </div>
        </section>

        {/* ── Middle row: Your Token + Estimated Wait ────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* Your Token card */}
          <div className="bg-white border-2 border-[#e2e8f0] rounded-3xl p-8 flex flex-col items-center text-center shadow-lg shadow-black/[0.03]">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#6d7a77] mb-1">Your Token</p>

            {isViewerServing ? (
              /* Viewer is currently being called */
              <div className="flex flex-col items-center gap-3">
                <div className="text-[2.5rem] font-extrabold text-[#00685f] tracking-tighter leading-none">
                  T-{VIEWER_TOKEN}
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#00685f]/10 text-[#00685f] text-[13px] font-bold rounded-full border border-[#00685f]/20 animate-pulse">
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    campaign
                  </span>
                  It&apos;s your turn!
                </span>
              </div>
            ) : viewerPosition > 0 ? (
              <>
                <div className="text-[2.5rem] font-extrabold text-[#00685f] tracking-tighter leading-none mb-4">
                  T-{VIEWER_TOKEN}
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-[#e2e7ff] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-[#00685f] rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <p className="text-[15px] font-semibold text-[#131b2e]">
                  {viewerPosition === 1
                    ? 'You\'re next!'
                    : `${viewerPosition - 1} Patient${viewerPosition - 1 > 1 ? 's' : ''} Ahead`}
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="text-[2.5rem] font-extrabold text-[#bcc9c6] tracking-tighter leading-none">
                  T-{VIEWER_TOKEN}
                </div>
                <p className="text-[13px] text-[#bcc9c6]">Token not found in queue</p>
              </div>
            )}
          </div>

          {/* Estimated Wait card */}
          <div className="bg-[#0051d5] rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-xl shadow-[#0051d5]/25 text-white border-2 border-[#0051d5]">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] opacity-80 mb-2">Estimated Wait</p>

            {isViewerServing ? (
              <div className="flex flex-col items-center gap-1">
                <div className="text-[3.5rem] font-black leading-none tracking-tighter">Now</div>
                <p className="text-[14px] font-semibold opacity-90 mt-1">Please proceed to the doctor</p>
              </div>
            ) : viewerPosition > 0 ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-[4rem] font-black leading-none tracking-tighter">
                    {estimatedWaitMins}
                  </span>
                  <span className="text-[1.5rem] font-bold opacity-90">min</span>
                </div>
                <p className="text-[12px] opacity-70 italic mt-3">Updated real-time</p>
              </>
            ) : (
              <div className="text-[2rem] font-bold opacity-60">—</div>
            )}

            {/* Decorative bottom ring */}
            <div className="mt-6 w-12 h-1 bg-white/30 rounded-full" />
          </div>
        </div>

        {/* ── Queue Sequence ─────────────────────────────────────────────── */}
        <section className="bg-white border-2 border-dashed border-[#e2e8f0] rounded-3xl p-6 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-5 px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#6d7a77]">
              Queue Sequence
            </h2>
            <span className="text-[12px] font-semibold text-[#bcc9c6] uppercase tracking-widest">
              Upcoming
            </span>
          </div>

          {/* Queue items */}
          {waiting.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-[#bcc9c6]">
              <span className="material-symbols-outlined text-[40px]">check_circle</span>
              <p className="text-[14px] font-medium">No patients in queue</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingSlice.map((patient, idx) => {
                const isNext = idx === 0;
                const isViewer = patient.token_number === VIEWER_TOKEN;

                return (
                  <div
                    key={patient.id}
                    className={`flex items-center justify-between rounded-2xl px-6 py-4 transition-all duration-200 ${
                      isNext
                        ? 'bg-[#f2f3ff] border-2 border-[#e2e7ff]'
                        : isViewer
                        ? 'bg-[#dbe1ff]/40 border-2 border-[#b4c5ff]/60'
                        : 'bg-[#fafafa] border-2 border-[#f1f5f9]'
                    }`}
                  >
                    {/* Token */}
                    <div className="flex items-center gap-4">
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

                    {/* Position label */}
                    <span
                      className={`text-[12px] font-bold uppercase tracking-widest ${
                        isNext ? 'text-[#00685f]' : 'text-[#bcc9c6]'
                      }`}
                    >
                      {positionLabel(idx + 1)}
                    </span>
                  </div>
                );
              })}

              {/* Show remaining count if more than 3 */}
              {waiting.length > 3 && (
                <div className="text-center py-3">
                  <span className="text-[12px] font-medium text-[#bcc9c6]">
                    +{waiting.length - 3} more patients in queue
                  </span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Footer note ───────────────────────────────────────────────── */}
        <p className="text-center text-[12px] text-[#bcc9c6] pb-4">
          Please stay nearby. You will be called when it&apos;s your turn.
        </p>
      </main>
    </div>
  );
}
