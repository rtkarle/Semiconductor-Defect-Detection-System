import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

const COLOR_MAP = {
  blue:   { bg: 'bg-brand-500/10',  text: 'text-brand-400',  icon: 'text-brand-400',  border: 'group-hover:border-brand-800/60'  },
  green:  { bg: 'bg-green-500/10',  text: 'text-green-400',  icon: 'text-green-400',  border: 'group-hover:border-green-800/60'  },
  red:    { bg: 'bg-red-500/10',    text: 'text-red-400',    icon: 'text-red-400',    border: 'group-hover:border-red-800/60'    },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: 'text-orange-400', border: 'group-hover:border-orange-800/60' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: 'text-purple-400', border: 'group-hover:border-purple-800/60' },
  cyan:   { bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   icon: 'text-cyan-400',   border: 'group-hover:border-cyan-800/60'   },
};

export default function StatCard({ label, value, icon: Icon, trend, trendLabel, color = 'blue', className = '' }) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  // Trigger count-up animation when card enters viewport
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={clsx(
        'stat-card group relative overflow-hidden',
        c.border,
        className
      )}
    >
      {/* Subtle background gradient */}
      <div className={clsx('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
        `bg-gradient-to-br from-${color === 'blue' ? 'brand' : color}-900/10 to-transparent`
      )} />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className={clsx(
            'text-3xl font-black mt-1.5 leading-none transition-all duration-300',
            c.text,
            visible ? 'animate-count-up' : 'opacity-0'
          )}>
            {value ?? '—'}
          </p>
        </div>

        {Icon && (
          <div className={clsx(
            'p-2.5 rounded-xl flex-shrink-0 transition-all duration-200',
            c.bg,
            'group-hover:scale-110 group-hover:rotate-3'
          )}>
            <Icon className={clsx('text-xl', c.icon)} />
          </div>
        )}
      </div>

      {trendLabel && (
        <p className={clsx(
          'relative text-xs mt-2.5 font-medium',
          (trend ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
        )}>
          {(trend ?? 0) >= 0 ? '▲' : '▼'} {trendLabel}
        </p>
      )}

      {/* Bottom accent line */}
      <div className={clsx(
        'absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full',
        'transition-all duration-500 rounded-full',
        `bg-${color === 'blue' ? 'brand' : color}-500/40`
      )} />
    </div>
  );
}
