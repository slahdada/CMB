import React from 'react';

interface CabinetLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
}

export const CabinetLogo: React.FC<CabinetLogoProps> = ({
  size = 'md',
  className = '',
  showBadge = true,
}) => {
  const sizeMap = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-10 h-10 sm:w-11 sm:h-11 rounded-2xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-20 h-20 rounded-3xl',
  };

  return (
    <div className={`relative flex-shrink-0 ${sizeMap[size]} ${className} group/logo`}>
      <img
        src="/icon.svg"
        alt="Cabinet d'orthophonie Belgaied Maroua"
        className="w-full h-full object-cover rounded-inherit shadow-md ring-1 ring-slate-900/10 group-hover/logo:scale-105 transition-transform duration-200"
      />
      {showBadge && (
        <span
          className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-slate-900 shadow-2xs"
          title="Cabinet d'orthophonie agréé et conventionné"
        >
          ✓
        </span>
      )}
    </div>
  );
};
