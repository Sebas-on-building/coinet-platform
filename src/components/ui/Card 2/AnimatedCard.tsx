import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import styles from './AnimatedCard.module.css';

type AnimatedCardProps = {
  children: ReactNode;
  className?: string;
  draggable?: boolean;
  onDragEnd?: (event: any, info: any) => void;
};

export function AnimatedCard({ children, className = '', draggable = false, onDragEnd }: AnimatedCardProps) {
  return (
    <motion.div
      className={`${styles.card} ${className}`}
      whileHover={{ scale: 1.03, boxShadow: '0 8px 32px rgb(99 102 241 / 12%)' }}
      whileTap={{ scale: 0.98 }}
      drag={draggable}
      dragElastic={0.18}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={onDragEnd}
      tabIndex={0}
      aria-label="Card"
    >
      {children}
    </motion.div>
  );
} 