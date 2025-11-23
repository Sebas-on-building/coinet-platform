import styles from './Button.module.css';
import { motion } from 'framer-motion';

export function Button({ children, ...props }) {
  return (
    <motion.button
      className={styles.button}
      whileHover={{ scale: 1.04, boxShadow: 'var(--shadow-md)' }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {children}
    </motion.button>
  );
} 