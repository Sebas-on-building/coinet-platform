import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheck, FiAlertCircle, FiLoader } from "react-icons/fi";
import { getTypographyClasses } from "../../styles/typography";

// Button animation variants
export const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
  disabled: { scale: 1, opacity: 0.6 },
};

// Loading spinner component
export const LoadingSpinner: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = "currentColor",
}) => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    style={{ width: size, height: size }}
  >
    <FiLoader className="w-full h-full" style={{ color }} />
  </motion.div>
);

// Success checkmark animation
export const SuccessCheckmark: React.FC<{ size?: number }> = ({
  size = 24,
}) => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: "spring", stiffness: 200, damping: 10 }}
    style={{ width: size, height: size }}
  >
    <FiCheck className="w-full h-full text-success-500" />
  </motion.div>
);

// Error shake animation
export const ErrorShake: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <motion.div
    initial={{ x: 0 }}
    animate={{ x: [0, -10, 10, -10, 10, 0] }}
    transition={{ duration: 0.5 }}
  >
    {children}
  </motion.div>
);

// Tooltip component
interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "top",
}) => {
  const [isVisible, setIsVisible] = React.useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </div>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 px-2 py-1 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 ${getTypographyClasses("body", "small")} whitespace-nowrap ${positionClasses[position]}`}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Progress bar with animation
interface ProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = "var(--color-primary-500)",
  height = 4,
  className = "",
}) => (
  <div
    className={`relative overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700 ${className}`}
    style={{ height }}
  >
    <motion.div
      className="absolute inset-y-0 left-0 rounded-full"
      style={{ backgroundColor: color }}
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    />
  </div>
);

// Confetti burst effect
export const ConfettiBurst: React.FC<{ trigger: boolean }> = ({ trigger }) => {
  const particles = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100 - 50,
    y: Math.random() * 100 - 50,
    rotation: Math.random() * 360,
    scale: Math.random() * 0.5 + 0.5,
    color: ["#FFD700", "#FF69B4", "#00BFFF", "#7CFC00"][
      Math.floor(Math.random() * 4)
    ],
  }));

  return (
    <AnimatePresence>
      {trigger && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
              style={{ backgroundColor: particle.color }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
              animate={{
                x: particle.x,
                y: particle.y,
                opacity: 0,
                scale: particle.scale,
                rotate: particle.rotation,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

// Transaction status indicator
interface TransactionStatusProps {
  status: "pending" | "success" | "error";
  message?: string;
}

export const TransactionStatus: React.FC<TransactionStatusProps> = ({
  status,
  message,
}) => {
  const statusConfig = {
    pending: {
      icon: <LoadingSpinner />,
      color: "text-warning-500",
      bgColor: "bg-warning-500/10",
    },
    success: {
      icon: <SuccessCheckmark />,
      color: "text-success-500",
      bgColor: "bg-success-500/10",
    },
    error: {
      icon: <FiAlertCircle className="w-6 h-6" />,
      color: "text-error-500",
      bgColor: "bg-error-500/10",
    },
  };

  const config = statusConfig[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center space-x-2 px-4 py-2 rounded-md ${config.bgColor}`}
    >
      <div className={config.color}>{config.icon}</div>
      {message && (
        <span
          className={`${getTypographyClasses("body", "regular")} ${config.color}`}
        >
          {message}
        </span>
      )}
    </motion.div>
  );
};
