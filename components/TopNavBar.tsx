'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { QueueNotification } from '@/lib/types';

interface TopNavBarProps {
  notifications: QueueNotification[];
  onMarkAllRead: () => void;
  onDismissNotification: (id: string) => void;
}

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diffMs / 1000);
  const mins = Math.floor(secs / 60);
  if (secs < 30) return 'just now';
  if (mins < 1) return `${secs}s ago`;
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

export default function TopNavBar({
  notifications,
  onMarkAllRead,
  onDismissNotification,
}: TopNavBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark all as read when dropdown opens
  useEffect(() => {
    if (isOpen) {
      onMarkAllRead();
    }
  }, [isOpen, onMarkAllRead]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="bg-[#faf8ff] border-b border-[#bcc9c6] sticky top-0 z-50">
      <div className="flex justify-between items-center w-full px-[24px] max-w-[1440px] mx-auto h-16">
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
            <p className="text-[11px] text-[#6d7a77] leading-tight">Reception Desk</p>
          </div>
        </div>

        <div className="flex items-center gap-[16px] relative" ref={dropdownRef}>
          {/* Patient Display link */}
          <a
            href="/display"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#00685f]/10 hover:bg-[#00685f]/20 text-[#00685f] rounded-full text-[12px] font-bold uppercase tracking-widest transition-colors border border-[#00685f]/20"
            title="Open patient waiting room display"
          >
            <span className="material-symbols-outlined text-[15px]">monitor</span>
            Patient Display
          </a>
          {/* Notification Bell Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-full hover:bg-[#e2e7ff] transition-colors relative cursor-pointer flex items-center justify-center"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-[#3d4947] text-2xl">
              notifications
            </span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] font-bold text-white items-center justify-center">
                  {unreadCount}
                </span>
              </span>
            )}
          </button>

          {/* Profile Avatar */}
          <div className="w-8 h-8 rounded-full bg-[#008378] flex items-center justify-center overflow-hidden ml-[8px] border border-[#bcc9c6]">
            <img
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjCkUsVHfz3_lbYPO_9-izJkZkTBZozjXGAtByx-dRV25w1car-LkpWsgNSgXbhj6s1mOTk8bUehyEz4jIqMdGic5af2Ms_OyCm-4MvwrePtFo8tk5m8ej8arfbrn6UYjHoTO8ekTaykHTuGA5pVCCX8rbMirRWU11Eblh7elH-gW1JAOzoFhYv31l2aIa8Oxs4lJRnvV2bVzurM9WKQFqW7ldU4OKtYkg8cxEzrUQtt4GbydBm9XFxzsayMELYl1WAzc-PVBcTQJu"
              alt="Avatar"
            />
          </div>

          {/* Notifications Dropdown Panel */}
          {isOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white border border-[#bcc9c6] rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col transition-all">
              {/* Dropdown Header */}
              <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-[#f2f3ff]/50">
                <span className="text-[15px] font-bold text-[#131b2e]">Notifications</span>
              </div>

              {/* Dropdown Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center gap-2 text-slate-400">
                    <span className="material-symbols-outlined text-3xl">
                      notifications_off
                    </span>
                    <span className="text-sm font-medium">No notifications</span>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    let iconName = 'info';
                    let iconClass = 'text-blue-600 bg-blue-50';
                    if (notif.type === 'warning') {
                      iconName = 'warning';
                      iconClass = 'text-amber-600 bg-amber-50';
                    } else if (notif.type === 'alert') {
                      iconName = 'error';
                      iconClass = 'text-red-600 bg-red-50';
                    }

                    return (
                      <div
                        key={notif.id}
                        className={`flex items-start gap-3 p-3.5 transition-all group relative border-l-2 ${
                          notif.read
                            ? 'border-transparent'
                            : 'bg-[#00685f]/5 border-[#00685f]'
                        }`}
                      >
                        {/* Icon */}
                        <div className={`p-1.5 rounded-full flex items-center justify-center shrink-0 ${iconClass}`}>
                          <span className="material-symbols-outlined text-[18px]">
                            {iconName}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-4">
                          <p className={`text-[13px] leading-[18px] break-words ${
                            notif.read ? 'text-[#3d4947]' : 'text-[#131b2e] font-semibold'
                          }`}>
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-slate-400 block mt-1.5 font-medium">
                            {formatRelativeTime(notif.timestamp)}
                          </span>
                        </div>

                        {/* Dismiss Button */}
                        <button
                          onClick={() => onDismissNotification(notif.id)}
                          className="opacity-0 group-hover:opacity-100 absolute right-2.5 top-3.5 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-opacity"
                          title="Dismiss"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            close
                          </span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
