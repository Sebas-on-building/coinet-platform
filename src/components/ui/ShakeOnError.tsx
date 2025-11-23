import React from "react";
import { motion } from "framer-motion";

export const ShakeOnError: React.FC<{
  shake: boolean;
  children: React.ReactNode;
}> = ({ shake, children }) => {
  return (
    <motion.div
      animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 500 }}
      aria-live={shake ? "assertive" : undefined}
    >
      {children}
    </motion.div>
  );
};
