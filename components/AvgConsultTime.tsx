'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AvgConsultTimeProps {
  value: number;
  onChange: (newValue: number) => Promise<void>;
  onCallNext: () => Promise<void>;
  currentPatientId: string | null;
  currentPatientCalledAt: string | null;
  hasWaitingPatients: boolean;
}

export default function AvgConsultTime({
  value,
  onChange,
  onCallNext,
  currentPatientId,
  currentPatientCalledAt,
  hasWaitingPatients,
}: AvgConsultTimeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Sync input value during render to avoid useEffect set state issues
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setInputValue(value.toString());
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Keep timer running when started manually without a patient
  useEffect(() => {
    if (isTimerRunning && !currentPatientId && hasWaitingPatients) {
        const interval = setInterval(() => {
          setElapsedTime((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }
  }, [isTimerRunning, currentPatientId, hasWaitingPatients]);

  // Sync elapsed time based on actual called_at instead of starting from 0
  useEffect(() => {
    if (currentPatientId && currentPatientCalledAt) {
      let active = true;

      const updateElapsedTime = () => {
         if (!active) return;
         const currentDiffMs = Date.now() - new Date(currentPatientCalledAt).getTime();
         setElapsedTime(Math.floor(currentDiffMs / 1000));
         setIsTimerRunning(true);
      };

      updateElapsedTime();
      const interval = setInterval(updateElapsedTime, 1000);

      return () => {
         active = false;
         clearInterval(interval);
      };
    } else if (!currentPatientId) {
      // To avoid synchronous setState in effect causing cascading renders
      // we use setTimeout here to defer it out of current execution frame.
      const timer = setTimeout(() => {
          setElapsedTime(0);
          setIsTimerRunning(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [currentPatientId, currentPatientCalledAt]);

  const handleSave = async () => {
    const num = parseInt(inputValue, 10);
    if (!isNaN(num) && num > 0 && num <= 180) {
      await onChange(num);
      setIsEditing(false);
    } else {
      setInputValue(value.toString());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setInputValue(value.toString());
      setIsEditing(false);
    }
  };

  const handleIncrement = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = value + 1;
    if (newVal <= 180) {
      await onChange(newVal);
    }
  };

  const handleDecrement = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = value - 1;
    if (newVal > 0) {
      await onChange(newVal);
    }
  };

  const handleToggleTimer = async () => {
    if (isTimerRunning) {
      setIsTimerRunning(false);
    } else {
      if (!currentPatientId) {
        if (hasWaitingPatients) {
          setIsTimerRunning(true);
          await onCallNext();
        }
      } else {
        setIsTimerRunning(true);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isExceeded = elapsedTime > value * 60;

  return (
    <div className="flex items-center gap-xs bg-surface-container-low p-2 px-4 rounded-xl border border-slate-100 select-none">
      <span className="font-label-sm text-on-surface-variant">Avg. Consultation Time:</span>
      
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 group">
        <button 
          onClick={handleDecrement}
          className="text-on-surface-variant hover:text-primary hover:bg-slate-100 rounded p-0.5 transition-colors cursor-pointer"
          title="Decrease"
        >
          <span className="material-symbols-outlined text-sm font-bold">remove</span>
        </button>

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.replace(/\D/g, ''))}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-10 text-center font-headline-sm text-primary font-bold focus:outline-none focus:ring-0 p-0 m-0 border-0"
            maxLength={3}
          />
        ) : (
          <span 
            onClick={() => setIsEditing(true)}
            className="font-headline-sm text-primary font-bold px-1.5 cursor-pointer hover:bg-slate-50 rounded transition-colors flex items-center gap-0.5"
            title="Click to edit"
          >
            <span>{value}</span>
            <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-60 transition-opacity">edit</span>
          </span>
        )}

        <button 
          onClick={handleIncrement}
          className="text-on-surface-variant hover:text-primary hover:bg-slate-100 rounded p-0.5 transition-colors cursor-pointer"
          title="Increase"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
        </button>
      </div>

      <span className="font-label-sm text-on-surface-variant">minutes</span>

      {/* Divider */}
      <div className="h-5 w-px bg-slate-200 mx-2" />

      {/* Stopwatch Widget */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggleTimer}
          disabled={!currentPatientId && !hasWaitingPatients}
          className={`flex items-center justify-center p-1.5 rounded-full transition-all cursor-pointer ${
            isTimerRunning 
              ? isExceeded 
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
          title={isTimerRunning ? 'Pause Consultation Stopwatch' : 'Start Consultation Stopwatch'}
        >
          <span className="material-symbols-outlined text-base">
            {isTimerRunning ? 'pause' : 'play_arrow'}
          </span>
        </button>

        <div className="flex items-center gap-1.5 min-w-[50px]">
          {isTimerRunning && (
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isExceeded ? 'bg-red-400' : 'bg-emerald-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isExceeded ? 'bg-red-500' : 'bg-emerald-500'
              }`}></span>
            </span>
          )}
          <span className={`font-mono text-sm font-bold transition-colors ${
            isTimerRunning 
              ? isExceeded ? 'text-red-600 animate-pulse' : 'text-emerald-600' 
              : 'text-[#3d4947] opacity-80'
          }`}>
            {formatTime(elapsedTime)}
          </span>
        </div>
      </div>
    </div>
  );
}
