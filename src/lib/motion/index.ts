'use client';

// Re-export specific components from framer-motion to avoid "export *" issue
// in Next.js client components boundaries
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
  useScroll,
  useInView,
  useAnimation,
  useDragControls,
  m,
  LazyMotion,
  domMax,
  domAnimation,
  MotionConfig,
  LayoutGroup,
  Reorder,
  useTime,
  usePresence,
  AnimateSharedLayout,
} from 'framer-motion';

// Types
import type {
  MotionProps,
  HTMLMotionProps,
  Transition,
  Variants,
  AnimationControls,
  PanInfo,
} from 'framer-motion';

// Export all named exports
export {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
  useScroll,
  useInView,
  useAnimation,
  useDragControls,
  m,
  LazyMotion,
  domMax,
  domAnimation,
  MotionConfig,
  LayoutGroup,
  Reorder,
  useTime,
  usePresence,
  AnimateSharedLayout,
};

// Export types
export type {
  MotionProps,
  HTMLMotionProps,
  Transition,
  Variants,
  AnimationControls,
  PanInfo,
}; 