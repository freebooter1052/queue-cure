'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AvgConsultTimeProps {
  value: number;
  onChange: (newValue: number) => Promise<void>;
}

export default function AvgConsultTime({ value, onChange }: AvgConsultTimeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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
    </div>
  );
}
