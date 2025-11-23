interface SoundWaveIconProps {
  className?: string;
}

export const SoundWaveIcon = ({ className }: SoundWaveIconProps) => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
  >
    <rect x="6" y="8" width="3" height="8" rx="1.5" fill="currentColor" />
    <rect x="11" y="4" width="3" height="16" rx="1.5" fill="currentColor" />
    <rect x="16" y="7" width="3" height="10" rx="1.5" fill="currentColor" />
  </svg>
);
