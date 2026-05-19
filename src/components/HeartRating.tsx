import React, { useState } from 'react';

const LABELS = ['', 'Da evitare', 'Così così', 'Nella media', 'Ottimo', 'Perfetto'];

interface HeartRatingProps {
  value: number;
  onChange: (v: number) => void;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const HeartRating: React.FC<HeartRatingProps> = ({ value, onChange, size = 'md', showLabel = false }) => {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  const px = size === 'sm' ? 16 : 20;

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            className="p-0.5 transition-transform hover:scale-125 active:scale-110"
            title={LABELS[n]}
          >
            <svg
              viewBox="0 0 24 24"
              width={px}
              height={px}
              fill={n <= active ? '#64748b' : 'none'}
              stroke={n <= active ? '#64748b' : '#cbd5e1'}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'fill 0.1s, stroke 0.1s' }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        ))}
      </div>
      {showLabel && (
        <span className="text-[10px] text-slate-400 font-medium min-w-[60px]">
          {LABELS[hovered || value]}
        </span>
      )}
    </div>
  );
};

export default HeartRating;
