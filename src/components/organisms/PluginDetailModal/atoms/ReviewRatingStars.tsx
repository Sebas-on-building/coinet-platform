import React, { useState } from 'react';
import styles from './ReviewRatingStars.module.css';

interface ReviewRatingStarsProps {
  value: number;
  onChange: (v: number) => void;
}

const STAR_COUNT = 5;
const STAR_STEP = 0.5;
const STAR_LABELS = ['Terrible', 'Bad', 'Okay', 'Good', 'Excellent'];

export const ReviewRatingStars: React.FC<ReviewRatingStarsProps> = ({ value, onChange }) => {
  const [hover, setHover] = useState<number | null>(null);
  const [focus, setFocus] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      onChange(Math.min(value + STAR_STEP, STAR_COUNT));
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      onChange(Math.max(value - STAR_STEP, 0));
      e.preventDefault();
    } else if (e.key === 'Home') {
      onChange(0);
      e.preventDefault();
    } else if (e.key === 'End') {
      onChange(STAR_COUNT);
      e.preventDefault();
    }
  };

  return (
    <div
      className={styles.stars}
      tabIndex={0}
      role="slider"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={STAR_COUNT}
      aria-label="Rating"
      onKeyDown={handleKeyDown}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
    >
      {[...Array(STAR_COUNT * 2)].map((_, i) => {
        const starValue = (i + 1) * 0.5;
        const filled = hover !== null ? starValue <= hover : starValue <= value;
        return (
          <button
            key={i}
            type="button"
            className={styles.starBtn}
            aria-label={`${starValue} stars`}
            aria-checked={value === starValue}
            tabIndex={-1}
            onMouseEnter={() => setHover(starValue)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(starValue)}
            onBlur={() => setHover(null)}
            onClick={() => onChange(starValue)}
            style={{ color: filled ? '#fbbf24' : '#e5e7eb', transition: 'color 0.2s' }}
          >
            {starValue % 1 === 0 ? '★' : '☆'}
            <span className={styles.tooltip}>{STAR_LABELS[Math.floor(starValue) - 1] || ''}</span>
          </button>
        );
      })}
      {focus && <span className={styles.focusRing} />}
    </div>
  );
}; 