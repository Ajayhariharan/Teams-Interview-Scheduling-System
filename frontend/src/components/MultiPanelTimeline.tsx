import React from 'react';
import type { PanelMember, TimeInterval, FormattedSlot } from '../types';
import { formatMinutesTo12Hour, timeToMinutes } from '../utils/availabilityEngine';
import { CheckCircle2, Clock, Info, Check, Zap } from './icons';
import { useTheme } from '../context/ThemeContext';
import { Avatar } from './Avatar';

interface MultiPanelTimelineProps {
  selectedMembers: PanelMember[];
  date: string;
  commonIntervals: TimeInterval[];
  selectedSlot: FormattedSlot | null;
  onSlotSelect?: (slot: FormattedSlot) => void;
  availableSlots: FormattedSlot[];
  provider?: string;
}

export const MultiPanelTimeline: React.FC<MultiPanelTimelineProps> = ({
  selectedMembers,
  date,
  commonIntervals,
  selectedSlot,
  availableSlots: _availableSlots,
  provider,
}) => {
  const { isNeo } = useTheme();

  // Timeline bounds (09:00 to 18:00 -> 540m to 1080m = 540 minutes total, 9 hourly intervals)
  const START_MINUTES = 540; // 09:00
  const END_MINUTES = 1080;  // 18:00
  const TOTAL_MINUTES = END_MINUTES - START_MINUTES;

  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

  const getLeftPercentage = (minutes: number) => {
    const clamped = Math.max(START_MINUTES, Math.min(END_MINUTES, minutes));
    return ((clamped - START_MINUTES) / TOTAL_MINUTES) * 100;
  };

  const getWidthPercentage = (startMinutes: number, endMinutes: number) => {
    const clampedStart = Math.max(START_MINUTES, Math.min(END_MINUTES, startMinutes));
    const clampedEnd = Math.max(START_MINUTES, Math.min(END_MINUTES, endMinutes));
    return Math.max(1.5, ((clampedEnd - clampedStart) / TOTAL_MINUTES) * 100);
  };

  const providerLabel = provider === 'microsoft' 
    ? 'Live Microsoft 365 / Outlook schedules' 
    : (provider === 'slack' ? 'Live Workspace schedules' : 'Live Google Calendar schedules');

  // -------------------------------------------------------------
  // OLD THEME (Modern / 21st.dev Style)
  // -------------------------------------------------------------
  if (!isNeo) {
    return (
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-21st transition-all">
        {/* Top Header & Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight">
                Multi-Calendar Availability Matrix
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {providerLabel} for <strong className="text-slate-800 dark:text-slate-200 font-semibold">{date}</strong>
            </p>
          </div>

          {/* Legend Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center space-x-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700/60 font-semibold">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              <span>Common Free</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 px-2.5 py-1 rounded-lg border border-rose-300 dark:border-rose-700/60 font-semibold">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span>Busy Meeting</span> 
            </div>
            <div className="flex items-center space-x-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700/60 font-semibold">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Lunch</span>
            </div>
          </div>
        </div>

        {selectedMembers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Please select at least 1 panel member to visualize calendar schedules.
          </div>
        ) : (
          <div className="mt-5 w-full">
            <div className="w-full pb-2">
              {/* Separate Exact Timestamps Header Bar (Spaced out to prevent overlap) */}
              <div className="flex items-end mb-2 pt-2">
                <div className="w-48 pr-4 shrink-0 text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Panelists
                </div>
                <div className="flex-1 relative h-7">
                  {hours.map((h, i) => {
                    const period = h >= 12 ? 'PM' : 'AM';
                    const displayH = h % 12 === 0 ? 12 : h % 12;
                    const leftPct = (i / (hours.length - 1)) * 100;

                    return (
                      <div
                        key={h}
                        className="absolute bottom-0 flex flex-col items-center select-none pointer-events-none"
                        style={{
                          left: `${leftPct}%`,
                          transform: 'translateX(-50%)',
                        }}
                      >
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 sm:px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 whitespace-nowrap shadow-2xs">
                          {displayH} {period}
                        </span>
                        <div className="w-0.5 h-1.5 bg-slate-400 dark:bg-slate-500 mt-0.5" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Matrix Body Container */}
              <div className="relative border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-2xl overflow-hidden shadow-sm">
                {/* Darker Full-Height Vertical Grid Lines Across All Rows */}
                <div className="absolute top-0 bottom-0 left-48 right-0 pointer-events-none z-0">
                  {hours.map((_, i) => (
                    <div
                      key={`grid-${i}`}
                      className="absolute top-0 bottom-0 w-0.5 bg-slate-300 dark:bg-slate-700"
                      style={{ left: `${(i / (hours.length - 1)) * 100}%` }}
                    />
                  ))}
                  {/* Subtle 30-min dashed midlines */}
                  {hours.slice(0, -1).map((_, i) => (
                    <div
                      key={`grid-mid-${i}`}
                      className="absolute top-0 bottom-0 w-px border-r border-dashed border-slate-200 dark:border-slate-800"
                      style={{ left: `${((i + 0.5) / (hours.length - 1)) * 100}%` }}
                    />
                  ))}
                </div>

                {/* Panelist Rows */}
                <div className="divide-y divide-slate-200 dark:divide-slate-800 relative z-10">
                  {selectedMembers.map((member) => {
                    const dayEvents = member.eventsByDate[date] || [];

                    return (
                      <div key={member.id} className="flex items-center min-h-[58px]">
                        {/* Member Card */}
                        <div className="w-48 pr-4 pl-3.5 flex items-center space-x-2.5 shrink-0 bg-slate-50 dark:bg-slate-900 h-full border-r border-slate-200 dark:border-slate-800 py-2.5">
                          <Avatar
                            name={member.name}
                            avatar={member.avatar}
                            email={member.email}
                            size="md"
                            className="ring-2 ring-emerald-500/20"
                          />
                          <div className="truncate">
                            <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">{member.name}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{member.department}</div>
                          </div>
                        </div>

                        {/* Track Lane with Light Red / Light Amber Event Bars */}
                        <div className="flex-1 relative h-10">
                          {dayEvents.map((evt) => {
                            const startM = timeToMinutes(evt.startTime);
                            const endM = timeToMinutes(evt.endTime);
                            const left = getLeftPercentage(startM);
                            const width = getWidthPercentage(startM, endM);

                            let bgClass = 'bg-rose-100 dark:bg-rose-950/70 text-rose-900 dark:text-rose-100 border-2 border-rose-300 dark:border-rose-700/80 shadow-2xs';
                            let badgeClass = 'bg-rose-200/80 dark:bg-rose-900/80 text-rose-900 dark:text-rose-100';

                            if (evt.type === 'lunch') {
                              bgClass = 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-100 border-2 border-amber-300 dark:border-amber-700/80 shadow-2xs';
                              badgeClass = 'bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100';
                            } else if (evt.type === 'ooo') {
                              bgClass = 'bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-100 border-2 border-purple-300 dark:border-purple-700/80 shadow-2xs';
                              badgeClass = 'bg-purple-200/80 dark:bg-purple-900/80 text-purple-900 dark:text-purple-100';
                            }

                            return (
                              <div
                                key={evt.id}
                                className={`absolute top-1 bottom-1 rounded-xl border-2 px-2 flex items-center justify-between text-xs font-bold truncate transition-all hover:scale-[1.02] hover:brightness-105 hover:z-20 cursor-pointer ${bgClass}`}
                                style={{
                                  left: `${left}%`,
                                  width: `${width}%`,
                                }}
                                title={`${evt.title} (${evt.startTime} – ${evt.endTime})`}
                              >
                                <span className="truncate font-extrabold mr-1">
                                  {width <= 14 ? evt.title.replace('Google Calendar Busy Block', 'Busy') : evt.title}
                                </span>
                                {width > 15 && (
                                  <span className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${badgeClass}`}>
                                    {evt.startTime} – {evt.endTime}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Common Free Intersection Row (Light Green Bar) */}
                <div className="border-t-2 border-emerald-400/80 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center min-h-[64px] relative z-10">
                  <div className="w-48 pr-4 pl-3.5 flex items-center space-x-2.5 shrink-0 bg-emerald-100/50 dark:bg-emerald-900/30 h-full border-r border-emerald-200 dark:border-emerald-800 py-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/30 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-tight">Common Free</div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">All {selectedMembers.length} Available</div>
                    </div>
                  </div>

                  <div className="flex-1 relative h-11">
                    {commonIntervals.map((interval, idx) => {
                      const left = getLeftPercentage(interval.startMinutes);
                      const width = getWidthPercentage(interval.startMinutes, interval.endMinutes);
                      const duration = interval.endMinutes - interval.startMinutes;
                      const formattedStart = formatMinutesTo12Hour(interval.startMinutes);
                      const formattedEnd = formatMinutesTo12Hour(interval.endMinutes);

                      const shortStart = formattedStart.replace(':00', '');
                      const shortEnd = formattedEnd.replace(':00', '');

                      return (
                        <div
                          key={idx}
                          className="absolute top-1 bottom-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-100 border-2 border-emerald-400 dark:border-emerald-600 flex items-center justify-center px-2 shadow-2xs transition-all hover:scale-[1.02] hover:brightness-105 cursor-pointer overflow-hidden"
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                          }}
                          title={`Common Free Window: ${formattedStart} – ${formattedEnd} (${duration} mins)`}
                        >
                          {width <= 15 ? (
                            <span className="font-mono font-black text-[11px] text-center w-full truncate whitespace-nowrap">
                              {shortStart} - {shortEnd}
                            </span>
                          ) : (
                            <div className="flex items-center justify-between w-full truncate px-1">
                              <span className="font-mono font-black text-xs whitespace-nowrap">
                                {formattedStart} – {formattedEnd}
                              </span>
                              <span className="text-[10px] font-bold bg-emerald-200 dark:bg-emerald-850/80 text-emerald-900 dark:text-emerald-100 px-1.5 py-0.5 rounded shrink-0 ml-1">
                                {duration}m
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {selectedSlot && (
                      <div
                        className="group absolute top-0 bottom-0 border-2 border-indigo-600 bg-indigo-600/25 z-20 flex items-center justify-center text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-all hover:bg-indigo-600/35"
                        style={{
                          left: `${getLeftPercentage(selectedSlot.startMinutes)}%`,
                          width: `${getWidthPercentage(selectedSlot.startMinutes, selectedSlot.endMinutes)}%`,
                        }}
                        title={`Selected Slot: ${selectedSlot.startTime} – ${selectedSlot.endTime}`}
                      >
                        <span className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded-md font-bold shadow-sm whitespace-nowrap transition-all select-none">
                          <span className="group-hover:hidden">Selected</span>
                          <span className="hidden group-hover:inline">{selectedSlot.startTime} – {selectedSlot.endTime}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Summary Footer */}
              <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pl-0 sm:pl-48 pr-2">
                <div className="flex items-center space-x-1.5">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {commonIntervals.length === 0
                      ? 'No intersecting free windows found on this date.'
                      : `Found ${commonIntervals.length} common free window(s) matching all ${selectedMembers.length} panelists.`}
                  </span>
                </div>
                <span className="font-mono text-[11px] font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
                  Daily Working Hours: 09:00 AM – 06:00 PM (IST)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // NEW THEME (Neo-Brutalism High-Contrast Matrix)
  // -------------------------------------------------------------
  return (
    <div className="bg-white dark:bg-[#111726] border-4 border-black dark:border-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] transition-all font-mono">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-4 border-black dark:border-white">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-black text-black dark:text-white text-base sm:text-lg uppercase tracking-wider">
              MULTI-CALENDAR AVAILABILITY MATRIX
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 uppercase">
            {providerLabel} FOR <strong className="text-black dark:text-white font-black bg-yellow-300 px-1">{date}</strong>
          </p>
        </div>

        {/* Legend Badges */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase">
          <div className="flex items-center space-x-1.5 bg-emerald-200 text-black px-2.5 py-1 border-2 border-black shadow-[2px_2px_0px_0px_#000]">
            <div className="w-3 h-3 bg-emerald-600" />
            <span>COMMON FREE</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-rose-200 text-black px-2.5 py-1 border-2 border-black shadow-[2px_2px_0px_0px_#000]">
            <div className="w-3 h-3 bg-rose-600" />
            <span>BUSY MEETING</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-amber-200 text-black px-2.5 py-1 border-2 border-black shadow-[2px_2px_0px_0px_#000]">
            <div className="w-3 h-3 bg-amber-600" />
            <span>LUNCH</span>
          </div>
        </div>
      </div>

      {selectedMembers.length === 0 ? (
        <div className="py-12 text-center text-black dark:text-white text-xs font-black uppercase">
          PLEASE SELECT AT LEAST 1 PANEL MEMBER TO VISUALIZE CALENDAR SCHEDULES.
        </div>
      ) : (
        <div className="mt-5 w-full">
          <div className="w-full pb-2">
            {/* Separate Exact Timestamps Header Bar (Spaced out to prevent overlap) */}
            <div className="flex items-end mb-2 pt-2">
              <div className="w-48 pr-4 shrink-0 text-xs font-black text-black dark:text-white uppercase tracking-wider">
                PANEL MEMBERS
              </div>
              <div className="flex-1 relative h-7">
                {hours.map((h, i) => {
                  const period = h >= 12 ? 'PM' : 'AM';
                  const displayH = h % 12 === 0 ? 12 : h % 12;
                  const leftPct = (i / (hours.length - 1)) * 100;

                  return (
                    <div
                      key={h}
                      className="absolute bottom-0 flex flex-col items-center select-none pointer-events-none"
                      style={{
                        left: `${leftPct}%`,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <span className="text-[10px] sm:text-[11px] font-black text-black bg-[#FACC15] px-1 sm:px-1.5 py-0.5 border-2 border-black shadow-[1px_1px_0px_0px_#000] whitespace-nowrap">
                        {displayH} {period}
                      </span>
                      <div className="w-0.5 h-1.5 bg-black dark:bg-white mt-0.5" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Matrix Body Container */}
            <div className="relative border-3 border-black dark:border-white bg-white dark:bg-zinc-900">
              {/* Darker Vertical Pillar Lines */}
              <div className="absolute top-0 bottom-0 left-48 right-0 pointer-events-none z-0">
                {hours.map((_, i) => (
                  <div
                    key={`grid-neo-${i}`}
                    className="absolute top-0 bottom-0 w-0.5 bg-black dark:bg-zinc-700"
                    style={{ left: `${(i / (hours.length - 1)) * 100}%` }}
                  />
                ))}
              </div>

              {/* Panelist Rows */}
              <div className="divide-y-2 divide-black dark:divide-zinc-700 relative z-10">
                {selectedMembers.map((member) => {
                  const dayEvents = member.eventsByDate[date] || [];

                  return (
                    <div key={member.id} className="flex items-center min-h-[58px]">
                      {/* Identity Card */}
                      <div className="w-48 pr-4 pl-3.5 flex items-center space-x-2.5 shrink-0 bg-zinc-100 dark:bg-zinc-800/80 h-full border-r-2 border-black dark:border-zinc-700 py-2.5">
                        <div className="w-8 h-8 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-black text-sm border-2 border-black">
                          {member.name.charAt(0)}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-black text-black dark:text-white truncate uppercase">{member.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{member.department}</div>
                        </div>
                      </div>

                      {/* Track with Light Red / Light Amber Events */}
                      <div className="flex-1 relative h-10">
                        {dayEvents.map((evt) => {
                          const startM = timeToMinutes(evt.startTime);
                          const endM = timeToMinutes(evt.endTime);
                          const left = getLeftPercentage(startM);
                          const width = getWidthPercentage(startM, endM);

                          let bgClass = 'bg-rose-200 dark:bg-rose-900/60 text-black dark:text-white border-2 border-black shadow-[2px_2px_0px_0px_#000]';
                          if (evt.type === 'lunch') {
                            bgClass = 'bg-amber-200 dark:bg-amber-900/60 text-black dark:text-white border-2 border-black shadow-[2px_2px_0px_0px_#000]';
                          }

                          return (
                            <div
                              key={evt.id}
                              className={`absolute top-1 bottom-1 px-2 flex items-center justify-between text-xs font-black truncate hover:scale-[1.02] cursor-pointer ${bgClass}`}
                              style={{
                                left: `${left}%`,
                                width: `${width}%`,
                              }}
                              title={`${evt.title} (${evt.startTime} – ${evt.endTime})`}
                            >
                              <span className="truncate uppercase mr-1">
                                {width <= 14 ? evt.title.replace('Google Calendar Busy Block', 'Busy') : evt.title}
                              </span>
                              {width > 14 && (
                                <span className="shrink-0 text-[10px] bg-black text-white px-1.5 py-0.5">
                                  {evt.startTime} – {evt.endTime}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Common Free Row (Light Green) */}
              <div className="border-t-3 border-black bg-emerald-100 dark:bg-emerald-950/60 flex items-center min-h-[64px] relative z-10">
                <div className="w-48 pr-4 pl-3.5 flex items-center space-x-2.5 shrink-0 bg-emerald-200 dark:bg-emerald-900 border-r-2 border-black h-full py-2.5">
                  <div className="w-8 h-8 bg-black text-emerald-400 flex items-center justify-center font-black border-2 border-black shrink-0">
                    <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-black dark:text-white uppercase">COMMON FREE</div>
                    <div className="text-[10px] text-slate-700 dark:text-slate-300 font-bold">ALL {selectedMembers.length} MEMBERS</div>
                  </div>
                </div>

                <div className="flex-1 relative h-11">
                  {commonIntervals.map((interval, idx) => {
                    const left = getLeftPercentage(interval.startMinutes);
                    const width = getWidthPercentage(interval.startMinutes, interval.endMinutes);
                    const duration = interval.endMinutes - interval.startMinutes;
                    const formattedStart = formatMinutesTo12Hour(interval.startMinutes);
                    const formattedEnd = formatMinutesTo12Hour(interval.endMinutes);
                    const shortStart = formattedStart.replace(':00', '');
                    const shortEnd = formattedEnd.replace(':00', '');

                    return (
                      <div
                        key={idx}
                        className="absolute top-1 bottom-1 bg-emerald-200 dark:bg-emerald-800/80 text-black dark:text-white border-2 border-black flex items-center justify-center px-2 text-xs font-black shadow-[2px_2px_0px_0px_#000] hover:scale-[1.02] cursor-pointer"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                        }}
                        title={`Common Free Window: ${formattedStart} – ${formattedEnd} (${duration} mins)`}
                      >
                        <span className="truncate uppercase font-black whitespace-nowrap">
                          {width <= 15 ? `${shortStart} - ${shortEnd}` : `${formattedStart} – ${formattedEnd} (${duration}m)`}
                        </span>
                      </div>
                    );
                  })}

                  {selectedSlot && (
                    <div
                      className="group absolute top-0 bottom-0 border-2 border-black bg-[#A78BFA] z-20 flex items-center justify-center text-xs font-black cursor-pointer shadow-[2px_2px_0px_0px_#000] transition-all hover:bg-purple-400"
                      style={{
                        left: `${getLeftPercentage(selectedSlot.startMinutes)}%`,
                        width: `${getWidthPercentage(selectedSlot.startMinutes, selectedSlot.endMinutes)}%`,
                      }}
                      title={`Selected Slot: ${selectedSlot.startTime} – ${selectedSlot.endTime}`}
                    >
                      <span className="text-[10px] bg-black text-white px-1.5 py-0.5 uppercase whitespace-nowrap select-none font-black">
                        <span className="group-hover:hidden">SELECTED</span>
                        <span className="hidden group-hover:inline">{selectedSlot.startTime} – {selectedSlot.endTime}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Bar */}
            <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-black dark:text-white pl-0 sm:pl-48 pr-2 font-bold">
              <div className="flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 shrink-0 stroke-[3]" />
                <span>{commonIntervals.length} COMMON FREE WINDOW(S) AVAILABLE</span>
              </div>
              <span className="bg-black text-white px-3 py-1 text-[11px] self-start sm:self-auto">
                WORKING HOURS: 09:00 AM – 06:00 PM (IST)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
