'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import TopNavBar from '@/components/TopNavBar';
import PatientRegistration from '@/components/PatientRegistration';
import NowServing from '@/components/NowServing';
import QueueList from '@/components/QueueList';
import AvgConsultTime from '@/components/AvgConsultTime';
import {
  fetchActivePatients,
  registerPatient,
  callNextPatient,
  skipPatient,
  removePatient,
  getAvgConsultTime,
  setAvgConsultTime,
  subscribeToQueue,
} from '@/lib/queueApi';
import type { Patient, QueueNotification } from '@/lib/types';

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [avgConsultTime, setAvgConsultTimeState] = useState<number>(15);
  const [isCallingNext, setIsCallingNext] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<QueueNotification[]>([]);
  const alertedKeysRef = useRef<Set<string>>(new Set());

  const addNotification = useCallback((type: 'info' | 'warning' | 'alert', message: string, key?: string) => {
    if (key) {
      if (alertedKeysRef.current.has(key)) return;
      alertedKeysRef.current.add(key);
    }
    const newNotif: QueueNotification = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      message,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  }, []);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
    alertedKeysRef.current.clear();
  };

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // ── Data Fetching ───────────────────────────────────────────
  const loadPatients = useCallback(async () => {
    try {
      const data = await fetchActivePatients();
      setPatients(data);
    } catch (err) {
      setGlobalError((err as Error).message);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const mins = await getAvgConsultTime();
      setAvgConsultTimeState(mins);
    } catch {
      // Use default if settings not available
    }
  }, []);

  useEffect(() => {
    // Avoid synchronous setState by using an async IIFE or timeout
    const init = async () => {
      await Promise.all([loadPatients(), loadSettings()]);
    };
    init();

    // Subscribe to realtime queue changes
    const channel = subscribeToQueue(() => {
      loadPatients();
      loadSettings();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [loadPatients, loadSettings]);

  // Periodic wait time and session overrun warnings
  useEffect(() => {
    const checkQueueAlerts = () => {
      const now = Date.now();
      const current = patients.find(p => p.status === 'serving');
      const waiting = patients.filter(p => p.status === 'waiting');

      // 1. Check currently serving patient for session overrun
      if (current && current.called_at) {
        const elapsedMins = (now - new Date(current.called_at).getTime()) / 60000;
        if (elapsedMins > avgConsultTime) {
          const roundedMins = Math.round(elapsedMins);
          addNotification(
            'alert',
            `T-${current.token_number} (${current.patient_name})'s session is running long (${roundedMins} mins)`,
            `overrun-${current.id}-${Math.floor(elapsedMins / 5)}`
          );
        }
      }

      // 2. Check waiting patients for SLA wait time warning
      waiting.forEach((p) => {
        const waitMins = (now - new Date(p.created_at).getTime()) / 60000;
        const slaThreshold = avgConsultTime * 2;
        if (waitMins > slaThreshold) {
          const roundedMins = Math.round(waitMins);
          addNotification(
            'warning',
            `T-${p.token_number} (${p.patient_name}) has been waiting for ${roundedMins} minutes!`,
            `wait-sla-${p.id}`
          );
        }
      });
    };

    checkQueueAlerts();
    const interval = setInterval(checkQueueAlerts, 10000);

    return () => clearInterval(interval);
  }, [patients, avgConsultTime, addNotification]);

  // ── Handlers ────────────────────────────────────────────────

  const handleRegister = async (name: string): Promise<number | null> => {
    try {
      const patient = await registerPatient(name);
      return patient.token_number;
    } catch (err) {
      setGlobalError((err as Error).message);
      return null;
    }
  };

  const handleCallNext = async () => {
    setIsCallingNext(true);
    try {
      const current = patients.find(p => p.status === 'serving');
      await callNextPatient(current?.id);
    } catch (err) {
      setGlobalError((err as Error).message);
    } finally {
      setIsCallingNext(false);
    }
  };

  const handleSkip = async (patientId: string) => {
    try {
      await skipPatient(patientId);
    } catch (err) {
      setGlobalError((err as Error).message);
    }
  };

  const handleRemove = async (patientId: string) => {
    try {
      await removePatient(patientId);
    } catch (err) {
      setGlobalError((err as Error).message);
    }
  };

  const handleAvgConsultChange = async (newValue: number) => {
    const previousValue = avgConsultTime;
    setAvgConsultTimeState(newValue); // Optimistic update
    try {
      await setAvgConsultTime(newValue);
    } catch (err) {
      setAvgConsultTimeState(previousValue); // Rollback
      setGlobalError((err as Error).message);
    }
  };

  // ── Derived State ───────────────────────────────────────────
  const currentPatient = patients.find(p => p.status === 'serving') || null;
  const waitingPatients = patients.filter(p => p.status === 'waiting');

  return (
    <div className="bg-[#ffffff] min-h-screen font-sans text-[#131b2e]">
      <TopNavBar
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onClearAll={handleClearAll}
        onDismissNotification={handleDismissNotification}
      />

      <main className="max-w-[1440px] mx-auto px-[24px] py-[24px] space-y-[24px]">

        {/* Global Error Toast */}
        {globalError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{globalError}</span>
            <button
              onClick={() => setGlobalError(null)}
              className="ml-auto p-1 hover:bg-red-100 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        {/* Header Actions Area */}
        <div className="flex justify-end items-center">
          <AvgConsultTime
            value={avgConsultTime}
            onChange={handleAvgConsultChange}
            onCallNext={handleCallNext}
            currentPatientId={currentPatient?.id || null}
            currentPatientCalledAt={currentPatient?.called_at || null}
            hasWaitingPatients={waitingPatients.length > 0}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px]">
          {/* Left Column - Patient Intake */}
          <div className="lg:col-span-4 space-y-[24px]">
            <PatientRegistration onRegister={handleRegister} />
          </div>

          {/* Right Column - Queue Controls */}
          <div className="lg:col-span-8 space-y-[24px]">
            <NowServing
              currentPatient={currentPatient}
              onCallNext={handleCallNext}
              onSkip={handleSkip}
              isLoading={isCallingNext}
            />
            <QueueList
              patients={waitingPatients}
              onRemovePatient={handleRemove}
              avgConsultMins={avgConsultTime}
              servingCalledAt={currentPatient?.called_at ?? null}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
