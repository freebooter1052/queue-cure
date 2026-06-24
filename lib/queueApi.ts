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
export async function registerPatient(patientName: string, isEmergency: boolean = false): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .insert({ patient_name: patientName, status: 'waiting', is_emergency: isEmergency })
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
    .order('is_emergency', { ascending: false })
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

  // Find the next patient with the lowest token_number that is still waiting (emergencies first)
  const { data: nextPatients, error: fetchError } = await supabase
    .from('patients')
    .select('id')
    .eq('status', 'waiting')
    .order('is_emergency', { ascending: false })
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
 * Fetch the most recently completed patient.
 */
export async function fetchLastCompletedPatient(): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  return data && data.length > 0 ? (data[0] as Patient) : null;
}

/**
 * Recall the previous patient (moves the current patient back to waiting,
 * and sets the last completed patient back to serving).
 */
export async function callPreviousPatient(currentServingId?: string): Promise<void> {
  const now = new Date().toISOString();

  // 1. If there's a currently serving patient, move them back to 'waiting'
  if (currentServingId) {
    const { error: revertError } = await supabase
      .from('patients')
      .update({ status: 'waiting', called_at: null })
      .eq('id', currentServingId);

    if (revertError) throw new Error(revertError.message);
  }

  // 2. Find the most recently completed patient
  const { data: prevPatients, error: fetchError } = await supabase
    .from('patients')
    .select('*')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1);

  if (fetchError) throw new Error(fetchError.message);

  // 3. Move the previous patient from 'completed' back to 'serving'
  if (prevPatients && prevPatients.length > 0) {
    const { error: serveError } = await supabase
      .from('patients')
      .update({ status: 'serving', called_at: now, completed_at: null })
      .eq('id', prevPatients[0].id);

    if (serveError) throw new Error(serveError.message);
  }
}

/**
 * Remove a waiting patient from the queue (e.g. patient left).
 */
export async function removePatient(patientId: string): Promise<void> {
  const { error } = await supabase
    .from('patients')
    .delete()
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

/**
 * Update emergency status of a patient.
 */
export async function setPatientEmergency(patientId: string, isEmergency: boolean): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .update({ is_emergency: isEmergency })
    .eq('id', patientId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Patient;
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
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'settings', filter: 'key=eq.avg_consultation_time' },
      () => onChangeCallback()
    )
    .subscribe();

  return channel;
}
