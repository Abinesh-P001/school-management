import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendPositive = true,
  subtitle,
  accentColor = "blue",
  onClick
}) {
  const colorStyles = {
    blue: {
      bg: 'bg-blue-50 text-blue-600 border-blue-100',
      bar: 'bg-blue-600'
    },
    indigo: {
      bg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      bar: 'bg-indigo-600'
    },
    emerald: {
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      bar: 'bg-emerald-600'
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600 border-amber-100',
      bar: 'bg-amber-500'
    },
    rose: {
      bg: 'bg-rose-50 text-rose-600 border-rose-100',
      bar: 'bg-rose-600'
    }
  };

  const style = colorStyles[accentColor] || colorStyles.blue;

  return (
    <div
      onClick={onClick}

      className={`group relative bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-blue-400' : ''
        }`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{title}</p>
          <h3 className="mt-1.5 text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-xl ${style.bg} border shrink-0 transition-transform group-hover:scale-105 duration-200`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-1 text-[11px]">
        {trend && (
          <div className="flex items-center space-x-1">
            {trendPositive ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span className={`font-bold ${trendPositive ? 'text-emerald-700' : 'text-rose-600'}`}>
              {trend}
            </span>
          </div>
        )}
        {subtitle && (
          <span className="text-slate-500 font-medium truncate">{subtitle}</span>
        )}
      </div>

      <div className="mt-3.5 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${style.bar} w-3/4 rounded-full transition-all duration-500 group-hover:w-full`} />
      </div>
    </div>
  );
}
