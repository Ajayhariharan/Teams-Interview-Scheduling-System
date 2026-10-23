import React from 'react';
import type { FormattedSlot, PanelMember } from '../types';
import { Check, Clock, Sparkles, AlertCircle } from './icons';
import { useTheme } from '../context/ThemeContext';

interface SlotPickerProps {
  slots: FormattedSlot[];
  selectedSlot: FormattedSlot | null;
  onSelectSlot: (slot: FormattedSlot) => void;
  panelMembers: PanelMember[];
  durationMinutes: number;
  onAdjustDuration?: (duration: number) => void;
}

export const SlotPicker: React.FC<SlotPickerProps> = ({
  slots,
  selectedSlot,
  onSelectSlot,
  panelMembers,
  durationMinutes,
  onAdjustDuration,
}) => {
  const { isNeo } = useTheme();

  // -------------------------------------------------------------
  // OLD THEME (Modern / 21st.dev Style)
  // -------------------------------------------------------------
  if (!isNeo) {
    return (
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-21st transition-all">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight">
                Available Offline Interview Slots
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Deterministic slots calculated for {durationMinutes}-minute in-person interview
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shadow-xs">
            {slots.length} {slots.length === 1 ? 'Slot' : 'Slots'} Available
          </span>
        </div>

        {slots.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400 mb-3 shadow-sm">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200">No Slots Found</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
              The selected {panelMembers.length} panel members do not share a contiguous {durationMinutes}-minute free window on this date.
            </p>
            <div className="flex items-center justify-center space-x-2">
              {durationMinutes > 30 && onAdjustDuration && (
                <button
                  onClick={() => onAdjustDuration(30)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                >
                  Try 30-min Duration
                </button>
              )}
              {durationMinutes > 45 && onAdjustDuration && (
                <button
                  onClick={() => onAdjustDuration(45)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
                >
                  Try 45-min
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {slots.map((slot) => {
              const isSelected = selectedSlot?.id === slot.id;

              return (
                <div
                  key={slot.id}
                  onClick={() => onSelectSlot(slot)}
                  className={`relative rounded-xl p-4 border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md shadow-emerald-500/10'
                      : 'bg-white dark:bg-slate-950/70 hover:bg-slate-50 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Header: Time and optimal badge */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight font-mono">
                        {slot.startTime} – {slot.endTime}
                      </span>
                    </div>
                    {slot.isOptimal && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Optimal</span>
                      </span>
                    )}
                  </div>

                  {/* Select button action */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {slot.durationMinutes} mins
                    </span>
                    <button
                      type="button"
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition shadow-xs ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Select Slot'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // NEW THEME (Neo-Brutalism High-Contrast Style)
  // -------------------------------------------------------------
  return (
    <div className="bg-white dark:bg-[#111726] border-2 border-black dark:border-slate-700 p-5 shadow-[4px_4px_0px_0px_#000] transition-all">
      <div className="flex items-center justify-between pb-4 border-b-2 border-black dark:border-slate-700">
        <div>
          <h3 className="font-black text-black dark:text-white text-sm sm:text-base uppercase tracking-wider">
            AVAILABLE OFFLINE INTERVIEW SLOTS
          </h3>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-0.5">
            Deterministic slots calculated for {durationMinutes}-minute in-person interview
          </p>
        </div>
        <span className="px-2.5 py-1 text-xs font-black uppercase font-mono bg-[#FACC15] text-black border-2 border-black shadow-[1px_1px_0px_0px_#000]">
          {slots.length} {slots.length === 1 ? 'SLOT' : 'SLOTS'} AVAILABLE
        </span>
      </div>

      {slots.length === 0 ? (
        <div className="py-8 px-4 text-center">
          <div className="w-10 h-10 bg-[#FEF08A] border-2 border-black flex items-center justify-center mx-auto text-black mb-3 shadow-[2px_2px_0px_0px_#000]">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-black uppercase text-black dark:text-white">NO SLOTS FOUND</h4>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
            The selected {panelMembers.length} panel members do not share a contiguous {durationMinutes}-minute free window on this date.
          </p>
          <div className="flex items-center justify-center space-x-2">
            {durationMinutes > 30 && onAdjustDuration && (
              <button
                onClick={() => onAdjustDuration(30)}
                className="px-3.5 py-1.5 text-xs font-black uppercase bg-[#FACC15] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition"
              >
                Try 30-min Duration
              </button>
            )}
            {durationMinutes > 45 && onAdjustDuration && (
              <button
                onClick={() => onAdjustDuration(45)}
                className="px-3.5 py-1.5 text-xs font-black uppercase bg-white dark:bg-slate-900 text-black dark:text-white border-2 border-black dark:border-slate-700 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition"
              >
                Try 45-min
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
          {slots.map((slot) => {
            const isSelected = selectedSlot?.id === slot.id;

            return (
              <div
                key={slot.id}
                onClick={() => onSelectSlot(slot)}
                className={`p-4 border-2 border-black dark:border-slate-700 transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-[#FEF9C3] dark:bg-yellow-950/50 shadow-[4px_4px_0px_0px_#000] ring-2 ring-black'
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-50 shadow-[2px_2px_0px_0px_#000]'
                }`}
              >
                {/* Header: Time and optimal badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-black text-black dark:text-white tracking-tight font-mono">
                      {slot.startTime} – {slot.endTime}
                    </span>
                  </div>
                  {slot.isOptimal && (
                    <span className="px-1.5 py-0.5 text-[10px] font-black uppercase font-mono bg-[#FACC15] text-black border border-black">
                      OPTIMAL
                    </span>
                  )}
                </div>

                {/* Select button action */}
                <div className="mt-3 pt-2.5 border-t-2 border-black dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                    {slot.durationMinutes} MINS
                  </span>
                  <button
                    type="button"
                    className={`px-3 py-1 text-xs font-black uppercase font-mono border-2 border-black transition shadow-[1px_1px_0px_0px_#000] flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#FACC15] text-black'
                        : 'bg-white dark:bg-slate-800 text-black dark:text-white hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <span>SELECTED</span>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </>
                    ) : (
                      'SELECT SLOT'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
