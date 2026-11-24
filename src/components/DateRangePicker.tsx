import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { useFilters } from '../lib/FilterContext';

const PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: 'last_7d' },
  { label: 'Last 14 days', value: 'last_14d' },
  { label: 'Last 28 days', value: 'last_28d' },
  { label: 'Last 30 days', value: 'last_30d' },
  { label: 'This week', value: 'this_week' },
  { label: 'Last week', value: 'last_week' },
  { label: 'This month', value: 'this_month' },
  { label: 'Last month', value: 'last_month' },
  { label: 'Maximum', value: 'maximum' },
];

export function DateRangePicker() {
  const { datePreset, setDatePreset } = useFilters();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLabel = PRESETS.find(p => p.value === datePreset)?.label || 'Select Date';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`h-9 flex items-center gap-2 bg-[#0B0F19] border border-white/10 px-3 rounded-xl text-xs font-bold text-gray-200 hover:bg-white/5 transition-colors whitespace-nowrap ${
          isOpen ? 'ring-2 ring-blue-500/50 border-blue-500/40' : ''
        }`}
      >
        <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span>{currentLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-52 bg-[#0B0F19] border border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-[100] py-2">
          <div className="px-4 py-1.5 text-[10px] font-black text-gray-500 uppercase tracking-wider border-b border-white/5">
            Date range presets
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar py-1">
            {PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.value}
                onClick={() => {
                  setDatePreset(preset.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-white/5 transition-colors ${
                  datePreset === preset.value
                    ? 'bg-blue-500/15 text-blue-400 font-bold border-l-2 border-blue-500'
                    : 'text-gray-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
