import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />,
  };

  const borders = {
    success: 'border-2 border-emerald-500 bg-white',
    error: 'border-2 border-rose-500 bg-white',
    info: 'border-2 border-blue-500 bg-white',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className={`flex items-center space-x-3 px-4 py-3 rounded-xl shadow-xl ${borders[toast.type] || borders.info}`}>
        {icons[toast.type] || icons.info}
        <p className="text-sm font-bold text-[#111827]">{toast.message}</p>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-800 ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
