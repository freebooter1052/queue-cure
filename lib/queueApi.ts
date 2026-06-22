// ============================================================
// Queue-Cure: Supabase API Layer
// All database operations are centralized here.
// Components should never call supabase directly.
// ============================================================

import { supabase } from './supabase';
import type { Patient } from './types';

// ── PATIENT REGISTRATION ─────────────────────────────────────

/**
 * Register a new patient. Token number is assigned automatically
 * by the PostgreSQL trigger (trg_assign_token).
 */
export async function registerPatient(patientName: string): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .insert({ patient_name: patientName, status: 'waiting' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Patient;
}

// ── QUEUE OPERATIONS ─────────────────────────────────────────

/**
 * Fetch all non-completed patients ordered by token number ascending.
 */
export async function fetchActivePatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .in('status', ['waiting', 'serving'])
    .order('token_number', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Patient[];
}

/**
 * Fetch ALL patients including completed (for "View Full Queue").
 */
export async function fetchAllPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('token_number', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Patient[];
}

/**
 * Advance the queue:
 *  1. Mark the currently serving patient as 'completed'.
 *  2. Mark the next waiting patient as 'serving' (sets called_at).
 */
export async function callNextPatient(currentServingId?: string): Promise<void> {
  const now = new Date().toISOString();

  if (currentServingId) {
    const { error: completeError } = await supabase
      .from('patients')
      .update({ status: 'completed', completed_at: now })
      .eq('id', currentServingId);

    if (completeError) throw new Error(completeError.message);
  }

  // Find the next patient with the lowest token_number that is still waiting
  const { data: nextPatients, error: fetchError } = await supabase
    .from('patients')
    .select('id')
    .eq('status', 'waiting')
    .order('token_number', { ascending: true })
    .limit(1);

  if (fetchError) throw new Error(fetchError.message);

  if (nextPatients && nextPatients.length > 0) {
    const { error: serveError } = await supabase
      .from('patients')
      .update({ status: 'serving', called_at: now })
      .eq('id', nextPatients[0].id);

    if (serveError) throw new Error(serveError.message);
  }
}

/**
 * Skip the currently serving patient:
 * Marks them as 'completed' immediately and calls the next one.
 */
export async function skipPatient(patientId: string): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('patients')
    .update({ status: 'completed', completed_at: now })
    .eq('id', patientId);

  if (error) throw new Error(error.message);

  // Serve the next waiting patient
  const { data: nextPatients, error: fetchError } = await supabase
    .from('patients')
    .select('id')
    .eq('status', 'waiting')
    .order('token_number', { ascending: true })
    .limit(1);

  if (fetchError) throw new Error(fetchError.message);

  if (nextPatients && nextPatients.length > 0) {
    const { error: serveError } = await supabase
      .from('patients')
      .update({ status: 'serving', called_at: now })
      .eq('id', nextPatients[0].id);

    if (serveError) throw new Error(serveError.message);
  }
}

/**
 * Remove a waiting patient from the queue (e.g. patient left).
 */
export async function removePatient(patientId: string): Promise<void> {
  const { error } = await supabase
    .from('patients')
    .update({ status: 'completed' })
    .eq('id', patientId);

  if (error) throw new Error(error.message);
}

/**
 * Clear all completed patients (end-of-day reset).
 */
export async function clearCompletedPatients(): Promise<void> {
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('status', 'completed');

  if (error) throw new Error(error.message);
}

// ── SETTINGS ─────────────────────────────────────────────────

/**
 * Get the average consultation time in minutes.
 */
export async function getAvgConsultTime(): Promise<number> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'avg_consultation_time')
    .single();

  if (error) throw new Error(error.message);
  return parseInt(data.value, 10) || 15;
}

/**
 * Persist a new average consultation time.
 */
export async function setAvgConsultTime(minutes: number): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'avg_consultation_time', value: minutes.toString() });

  if (error) throw new Error(error.message);
}

// ── REALTIME ─────────────────────────────────────────────────

/**
 * Subscribe to all changes on the patients table.
 * Returns the channel so the caller can unsubscribe on cleanup.
 */
export function subscribeToQueue(onChangeCallback: () => void) {
  const channel = supabase
    .channel('realtime-queue')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'patients' },
      () => onChangeCallback()
    )
    .subscribe();

  return channel;
}
