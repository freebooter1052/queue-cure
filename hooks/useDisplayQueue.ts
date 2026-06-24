// ============================================================
// useDisplayQueue — Custom hook for the patient waiting room
//
// Responsibilities:
//   Task 3.1 — Supabase Realtime WebSocket subscription
//   Task 3.2 — Derived display metrics (position, token grid)
//   Task 3.3 — Client-side wait time calculation engine
//
// Formula (US-04):
//   Est. Wait = (patientToken − activeToken − 1) × avgConsultMins
//   + remaining time of current session
// ============================================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Patient } from '@/lib/types';
import {
  fetchDisplaySnapshot,
  subscribeToDisplayQueue,
  type QueueChangePayload,
} from '@/lib/displayApi';

// ── Connection States ─────────────────────────────────────────────────────────
export type ConnectionStatus = 'connecting' | 'live' | 'error' | 'stale';

// ── Hook Return Shape ─────────────────────────────────────────────────────────
export interface DisplayQueueState {
  // Raw queue data
  serving: Patient | null;
  waiting: Patient[];
  avgConsultMins: number;

  // Task 3.2 — Metrics for the viewer's token
  viewerToken: number | null;       // token number parsed from URL ?token=
  viewerPosition: number;           // 1-indexed position in waiting list; 0 = not found
  isViewerServing: boolean;
  isViewerCompleted: boolean;       // token was served and is no longer in queue
  patientsAhead: number;            // viewerPosition - 1 (or 0)

  // Task 3.3 — Wait time math outputs
  estimatedWaitMins: number;        // computed via formula
  sessionElapsedMins: number;       // minutes the current patient has been with doctor
  sessionRemainingMins: number;     // estimated remaining time for current session
  progressPct: number;              // 0-100, viewer's progress through the queue

  // Meta
  connectionStatus: ConnectionStatus;
  lastUpdatedAt: number;            // unix timestamp of last Supabase event
  isLoading: boolean;
  error: string | null;

  // Utilities
  now: number;                      // ticking timestamp (re-renders every second)
  justCalled: boolean;              // true for 2.5s when serving token changes
}

// ── Wait-Time Formula ────────────────────────────────────────────────────────

/**
 * Task 3.3 — Calculates estimated wait from queue state.
 *
 * Formula:
 *   remainingCurrentSession = max(0, avgConsultMins − elapsedCurrentSession)
 *   patientsBeforeViewer    = viewerPosition − 1
 *   Est. Wait               = remainingCurrentSession
 *                             + patientsBeforeViewer × avgConsultMins
 *
 * This is equivalent to:
 *   (viewerToken − activeToken − 1) × avgConsultMins + remainingSession
 */
function computeWaitTime(
  viewerPosition: number,        // 1-indexed position in waiting list
  avgConsultMins: number,
  calledAt: string | null,
  nowMs: number,
): {
  estimatedWaitMins: number;
  sessionElapsedMins: number;
  sessionRemainingMins: number;
} {
  // If the clock hasn't started ticking yet (SSR or mount phase), return safe defaults
  if (nowMs === 0) {
    const estimatedWaitMins =
      viewerPosition > 0
        ? (viewerPosition - 1) * avgConsultMins
        : 0;
    return {
      estimatedWaitMins,
      sessionElapsedMins: 0,
      sessionRemainingMins: 0,
    };
  }

  // If no patient is serving, there is no active session elapsed or remaining time
  if (!calledAt) {
    const estimatedWaitMins =
      viewerPosition > 0
        ? Math.round((viewerPosition - 1) * avgConsultMins)
        : 0;
    return {
      estimatedWaitMins,
      sessionElapsedMins: 0,
      sessionRemainingMins: 0,
    };
  }

  const sessionElapsedMins = (nowMs - new Date(calledAt).getTime()) / 60_000;
  const elapsed = Math.max(0, sessionElapsedMins);
  const sessionRemainingMins = avgConsultMins - (elapsed % avgConsultMins);

  const estimatedWaitMins =
    viewerPosition > 0
      ? Math.round(sessionRemainingMins + (viewerPosition - 1) * avgConsultMins)
      : 0;

  return { estimatedWaitMins, sessionElapsedMins, sessionRemainingMins };
}

// ── Helper: apply a single realtime payload to the current patient list ───────

function sortWaitingPatients(list: Patient[]): Patient[] {
  return [...list].sort((a, b) => {
    if (a.is_emergency && !b.is_emergency) return -1;
    if (!a.is_emergency && b.is_emergency) return 1;
    return a.token_number - b.token_number;
  });
}

/**
 * Surgically merges a WebSocket event payload into the existing patients array
 * rather than triggering a full refetch for every row change.
 */
function applyPatientPayload(
  prev: Patient[],
  payload: QueueChangePayload,
): Patient[] {
  const { eventType, new: newRow, old: oldRow } = payload;

  switch (eventType) {
    case 'INSERT': {
      if (!newRow?.id) return prev;
      const patient = newRow as Patient;
      // Only waiting patients belong in the waiting array
      if (patient.status !== 'waiting') return prev;
      // Avoid duplicates
      if (prev.some(p => p.id === patient.id)) return prev;
      return sortWaitingPatients([...prev, patient]);
    }

    case 'UPDATE': {
      if (!newRow?.id) return prev;
      const updated = newRow as Patient;
      if (updated.status !== 'waiting') {
        // Patient is no longer waiting (serving or completed) — remove from waiting list
        return prev.filter(p => p.id !== updated.id);
      }
      // Update in place, re-sort
      return sortWaitingPatients(
        prev.map(p => (p.id === updated.id ? { ...p, ...updated } : p))
      );
    }

    case 'DELETE': {
      const id = oldRow?.id;
      if (!id) return prev;
      return prev.filter(p => p.id !== id);
    }

    default:
      return prev;
  }
}

// ── Main Hook ─────────────────────────────────────────────────────────────────

export function useDisplayQueue(): DisplayQueueState {
  // ── Queue state
  const [serving, setServing] = useState<Patient | null>(null);
  const [waiting, setWaiting] = useState<Patient[]>([]);
  const [avgConsultMins, setAvgConsultMins] = useState(15);

  // ── UI meta state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => Date.now());
  const [justCalled, setJustCalled] = useState(false);

  // ── Ticking clock (1s cadence drives wait-time re-renders)
  // Start at 0 so server and client render the same initial HTML (avoids
  // React hydration mismatch caused by Date.now() drifting between SSR & CSR).
  const [now, setNow] = useState(0);

  // Refs
  const prevServingTokenRef = useRef<number | null>(null);
  const justCalledTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Parse viewer token from URL query param (?token=NNN)
  const [viewerToken, setViewerToken] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) {
      const parsed = parseInt(t, 10);
      if (!isNaN(parsed)) {
        setTimeout(() => setViewerToken(parsed), 0);
      }
    }
  }, []);

  // ── 1-second clock (client-only — also sets initial value)
  useEffect(() => {
    const timeout = setTimeout(() => setNow(Date.now()), 0);
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  // ── Mark connection as "stale" if no realtime event arrives within 60s
  const resetStaleTimer = useCallback(() => {
    if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    staleTimerRef.current = setTimeout(() => {
      setConnectionStatus('stale');
    }, 60_000);
  }, []);

  // ── Initial data load ─────────────────────────────────────────────────────

  const loadSnapshot = useCallback(async () => {
    try {
      const snapshot = await fetchDisplaySnapshot();
      setServing(snapshot.serving);
      setWaiting(snapshot.waiting);
      setAvgConsultMins(snapshot.avgConsultMins);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Task 3.1 — Supabase Realtime WebSocket subscription ─────────────────

  useEffect(() => {
    // Initial fetch (deferred to avoid synchronous setState inside effect body)
    const loadTimeout = setTimeout(() => {
      loadSnapshot();
      setConnectionStatus('live');
      resetStaleTimer();
    }, 0);

    // Open dedicated display channel
    const channel = subscribeToDisplayQueue(
      // ── Patient change handler
      (payload: QueueChangePayload) => {
        setLastUpdatedAt(Date.now());
        setConnectionStatus('live');
        resetStaleTimer();

        setServing(prev => {
          const newRow = payload.new as Patient | null;
          const oldRow = payload.old as Partial<Patient> | null;

          if (payload.eventType === 'DELETE') {
            // If the deleted patient was being served
            if (prev && oldRow?.id === prev.id) return null;
            return prev;
          }

          if (!newRow) return prev;

          if (newRow.status === 'serving') {
            // A new patient just started being served
            return newRow;
          }

          if (newRow.status === 'completed' && prev?.id === newRow.id) {
            // The currently serving patient was completed
            return null;
          }

          return prev;
        });

        setWaiting(prev => applyPatientPayload(prev, payload));
      },

      // ── Settings change handler (avg_consultation_time updated by staff)
      async () => {
        setLastUpdatedAt(Date.now());
        setConnectionStatus('live');
        resetStaleTimer();
        // Re-fetch settings only (lightweight)
        try {
          const snapshot = await fetchDisplaySnapshot();
          setAvgConsultMins(snapshot.avgConsultMins);
        } catch {
          // Non-critical — keep previous value
        }
      },
    );

    // Mark as live once subscribed (Supabase fires the subscribe callback)
    channel.on('system', {}, (status) => {
      if (status.extension === 'postgres_changes') {
        setConnectionStatus('live');
        resetStaleTimer();
      }
    });

    return () => {
      channel.unsubscribe();
      clearTimeout(loadTimeout);
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    };
  }, [loadSnapshot, resetStaleTimer]);

  // ── Flash animation when "Now Serving" token changes ─────────────────────

  useEffect(() => {
    const curr = serving?.token_number ?? null;
    if (curr !== null && curr !== prevServingTokenRef.current) {
      setJustCalled(true);
      if (justCalledTimerRef.current) clearTimeout(justCalledTimerRef.current);
      justCalledTimerRef.current = setTimeout(() => setJustCalled(false), 2_500);
      prevServingTokenRef.current = curr;
    } else if (curr === null) {
      prevServingTokenRef.current = null;
    }
  }, [serving]);

  // ── Task 3.2 — Derive display metrics ─────────────────────────────────────

  const viewerPosition = viewerToken
    ? waiting.findIndex(p => p.token_number === viewerToken) + 1  // 0 → not found
    : 0;

  const isViewerServing = !!viewerToken && serving?.token_number === viewerToken;

  // Was the viewer's token already completed? (no longer in active queue, not serving)
  const isViewerCompleted =
    !!viewerToken && !isViewerServing && viewerPosition === 0;

  const patientsAhead = Math.max(0, viewerPosition - 1);

  // ── Task 3.3 — Wait time math engine ─────────────────────────────────────

  const { estimatedWaitMins, sessionElapsedMins, sessionRemainingMins } =
    computeWaitTime(viewerPosition, avgConsultMins, serving?.called_at ?? null, now);

  // Progress percentage for the viewer's position in queue
  const totalActive = (serving ? 1 : 0) + waiting.length;
  const viewerAbsolutePos = viewerPosition > 0
    ? (serving ? 1 : 0) + viewerPosition
    : totalActive + 1;
  const progressPct = totalActive > 0
    ? Math.max(5, Math.round(((viewerAbsolutePos - 1) / totalActive) * 100))
    : 0;

  return {
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
    lastUpdatedAt,
    isLoading,
    error,
    now,
    justCalled,
  };
}
