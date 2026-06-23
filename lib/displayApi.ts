// ============================================================
// Queue-Cure: Patient Display API Layer (read-only)
// Used exclusively by the /display waiting room screen.
// Components must NOT call supabase directly.
// ============================================================

import { supabase } from './supabase';
import type { Patient } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Parsed, typed payload that arrives from a Supabase Realtime postgres_changes event */
export interface QueueChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Partial<Patient> | null;
  old: Partial<Patient> | null;
}

/** Everything the display screen needs about the current queue state */
export interface DisplayQueueSnapshot {
  serving: Patient | null;    // patient currently with the doctor
  waiting: Patient[];         // patients still in the waiting room, ordered by token
  avgConsultMins: number;     // average consultation time in minutes
}

// ── Data Fetching ─────────────────────────────────────────────────────────────

/**
 * Fetches the full current queue snapshot for the display screen in a single
 * parallel request pair. Returns serving patient, ordered waiting list, and the
 * configured average consultation duration.
 */
export async function fetchDisplaySnapshot(): Promise<DisplayQueueSnapshot> {
  const [patientsResult, settingsResult] = await Promise.all([
    supabase
      .from('patients')
      .select('*')
      .in('status', ['serving', 'waiting'])
      .order('token_number', { ascending: true }),
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'avg_consultation_time')
      .single(),
  ]);

  if (patientsResult.error) throw new Error(patientsResult.error.message);

  const all = (patientsResult.data ?? []) as Patient[];
  const serving = all.find(p => p.status === 'serving') ?? null;
  const waiting = all.filter(p => p.status === 'waiting');

  const avgConsultMins =
    settingsResult.error || !settingsResult.data
      ? 15                                         // safe default
      : parseInt(settingsResult.data.value, 10) || 15;

  return { serving, waiting, avgConsultMins };
}

// ── Realtime Subscription ────────────────────────────────────────────────────

/**
 * Task 3.1 — Opens a dedicated Supabase Realtime WebSocket channel for the
 * patient display screen. The callback receives a typed payload describing
 * exactly what changed so the UI can apply surgical state updates without
 * a full refetch when possible.
 *
 * Listens to:
 *  - patients table  → INSERT / UPDATE / DELETE
 *  - settings table  → UPDATE  (avg_consultation_time may change mid-day)
 *
 * Returns the channel so the caller can unsubscribe on cleanup.
 */
export function subscribeToDisplayQueue(
  onPatientChange: (payload: QueueChangePayload) => void,
  onSettingsChange: () => void,
): RealtimeChannel {
  const channel = supabase
    .channel('display-queue-realtime')                      // unique channel name
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'patients' },  // all INSERT/UPDATE/DELETE
      (raw) => {
        const payload: QueueChangePayload = {
          eventType: raw.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: (raw.new as Partial<Patient>) ?? null,
          old: (raw.old as Partial<Patient>) ?? null,
        };
        onPatientChange(payload);
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'settings' },
      () => onSettingsChange(),
    )
    .subscribe();

  return channel;
}
