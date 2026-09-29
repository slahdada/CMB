import React from 'react';
import { Phone, PhoneCall } from 'lucide-react';

interface FloatingCallButtonProps {
  onOpenCallModal: () => void;
  cabinetPhone?: string;
}

export const FloatingCallButton: React.FC<FloatingCallButtonProps> = ({
  onOpenCallModal,
  cabinetPhone = '+216 71 890 123',
}) => {
  return (
    <div className="fixed bottom-5 right-5 z-30 flex flex-col items-end gap-2 group">
      {/* Tooltip on desktop */}
      <span className="hidden sm:inline-block opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-lg pointer-events-none mb-0.5">
        Appel téléphonique direct
      </span>

      <button
        onClick={onOpenCallModal}
        aria-label="Passer un appel téléphonique"
        className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-emerald-400/40 border-2 border-white/60 relative"
      >
        <Phone className="w-6 h-6 animate-pulse" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full flex items-center justify-center">
          <span className="w-1.5 h-1.5 bg-slate-900 rounded-full animate-ping"></span>
        </span>
      </button>
    </div>
  );
};
