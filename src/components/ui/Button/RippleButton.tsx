import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './RippleButton.module.css';

export function RippleButton({ children, onClick, className = '', ...props }) {
  const rippleRef = useRef<HTMLSpanElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - button.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${e.clientY - button.getBoundingClientRect().top - radius}px`;
    circle.classList.add(styles.ripple);
    const ripple = button.getElementsByClassName(styles.ripple)[0];
    if (ripple) {
      ripple.remove();
    }
    button.appendChild(circle);
    if (onClick) onClick(e);
  };

  return (
    <motion.button
      className={`${styles.button} ${className}`}
      whileHover={{ scale: 1.04, boxShadow: 'var(--shadow-md)' }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      aria-pressed="false"
      {...props}
    >
      {children}
    </motion.button>
  );
} 