'use client';

import React, { useState } from 'react';

interface SupabaseAlertProps {
  isFallback: boolean;
  errorMessage?: string | null;
}

export default function SupabaseAlert({ isFallback, errorMessage }: SupabaseAlertProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!isFallback || !isOpen) return null;

  return (
    <div className="bg-surface-container-low border border-primary/20 rounded-xl p-md flex flex-col md:flex-row items-start justify-between gap-sm transition-all animate-fadeIn">
      <div className="flex gap-sm">
        <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          info
        </span>
        <div className="space-y-xs">
          <h4 className="font-headline-sm text-primary font-bold">Database Setup Notice</h4>
          <p className="text-body-sm text-on-surface-variant max-w-3xl">
            The application is running in <strong className="text-primary">Local Storage Fallback Mode</strong>. 
            {errorMessage ? ` (Reason: ${errorMessage})` : ' To persist patient tokens and see updates in real-time across multiple tabs, please setup your Supabase database.'}
          </p>
          <div className="bg-white border border-slate-200 p-sm rounded-lg text-xs font-mono text-on-surface-variant max-h-32 overflow-y-auto mt-xs">
            {`-- Copy and run in your Supabase SQL Editor:
-- Create patients table
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'serving', 'completed')) DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  called_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);`}
          </div>
        </div>
      </div>
      <button 
        onClick={() => setIsOpen(false)}
        className="p-1 hover:bg-surface-container-high rounded-full transition-colors self-start"
      >
        <span className="material-symbols-outlined text-on-surface-variant">close</span>
      </button>
    </div>
  );
}
