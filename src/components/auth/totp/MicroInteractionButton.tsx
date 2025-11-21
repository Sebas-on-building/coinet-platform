import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

// Use HTMLMotionButtonProps for correct type composition
export interface MicroInteractionButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const MicroInteractionButton: React.FC<MicroInteractionButtonProps> = ({
  children,
  className = '',
  loading = false,
  icon,
  ...props
}) => (
  <motion.button
    whileTap={{ scale: 0.96 }}
    whileHover={{ scale: 1.03, boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)' }}
    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    className={`relative px-4 py-2 rounded-xl font-semibold bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all flex items-center gap-2 ${className}`}
    aria-busy={loading}
    disabled={loading || props.disabled}
    {...props}
  >
    {icon && <span className="mr-2">{icon}</span>}
    {loading ? <span className="animate-pulse">...</span> : children}
    {/* TODO: Add ripple/haptic effect, analytics, extensibility hooks */}
  </motion.button>
);

export default MicroInteractionButton; 