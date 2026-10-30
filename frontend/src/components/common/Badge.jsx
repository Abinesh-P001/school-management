import React from 'react';

const colorMap = {
  blue: 'bg-blue-50 text-blue-800 border-blue-300',
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  green: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  amber: 'bg-amber-50 text-amber-900 border-amber-300',
  yellow: 'bg-amber-50 text-amber-900 border-amber-300',
  red: 'bg-rose-50 text-rose-800 border-rose-300',
  rose: 'bg-rose-50 text-rose-800 border-rose-300',
  purple: 'bg-purple-50 text-purple-800 border-purple-300',
  slate: 'bg-slate-100 text-slate-800 border-slate-300',
  Active: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  Suspended: 'bg-rose-50 text-rose-800 border-rose-300',
  Paid: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  Pending: 'bg-amber-50 text-amber-900 border-amber-300',
  Overdue: 'bg-rose-50 text-rose-800 border-rose-300',
  Present: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  Absent: 'bg-rose-50 text-rose-800 border-rose-300',
  Late: 'bg-amber-50 text-amber-900 border-amber-300',
  Excused: 'bg-blue-50 text-blue-800 border-blue-300',
  Upcoming: 'bg-blue-50 text-blue-800 border-blue-300',
  Completed: 'bg-slate-100 text-slate-800 border-slate-300',
  Passed: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  Failed: 'bg-rose-50 text-rose-800 border-rose-300',
};

export default function Badge({ text, variant, size = 'sm', className = '' }) {
  const resolvedVariant = variant || text;
  const classes = colorMap[resolvedVariant] || 'bg-slate-100 text-slate-800 border-slate-300';
  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-bold rounded-full border whitespace-nowrap shrink-0 ${classes} ${sizeClasses} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 mr-1.5"></span>
      {text}
    </span>
  );
}
