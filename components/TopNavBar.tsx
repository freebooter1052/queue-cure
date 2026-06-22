'use client';
import React from 'react';

export default function TopNavBar() {
  return (
    <header className="bg-[#faf8ff] border-b border-[#bcc9c6] sticky top-0 z-50">
      <div className="flex justify-between items-center w-full px-[24px] max-w-[1440px] mx-auto h-16">
        <div className="flex items-center gap-[16px]">
          <div className="text-[24px] font-bold leading-[32px] tracking-[-0.01em] text-[#00685f]">Reception Desk</div>
        </div>
        <div className="flex items-center gap-[16px]">
          <button className="p-2 rounded-full hover:bg-[#e2e7ff] transition-colors">
            <span className="material-symbols-outlined text-[#3d4947]">notifications</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-[#008378] flex items-center justify-center overflow-hidden ml-[8px] border border-[#bcc9c6]">
            <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjCkUsVHfz3_lbYPO_9-izJkZkTBZozjXGAtByx-dRV25w1car-LkpWsgNSgXbhj6s1mOTk8bUehyEz4jIqMdGic5af2Ms_OyCm-4MvwrePtFo8tk5m8ej8arfbrn6UYjHoTO8ekTaykHTuGA5pVCCX8rbMirRWU11Eblh7elH-gW1JAOzoFhYv31l2aIa8Oxs4lJRnvV2bVzurM9WKQFqW7ldU4OKtYkg8cxEzrUQtt4GbydBm9XFxzsayMELYl1WAzc-PVBcTQJu" alt="Avatar"/>
          </div>
        </div>
      </div>
    </header>
  );
}
