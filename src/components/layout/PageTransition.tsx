import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import React from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={router.pathname}
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -40, scale: 0.98 }}
        transition={{ duration: 0.5, type: "spring" }}
        style={{ position: "relative" }}
      >
        {/* Animated circular gradient sweep overlay */}
        <AnimatePresence>
          <motion.div
            key={router.pathname + "-overlay"}
            initial={{ opacity: 0, scale: 0, x: "-50%", y: "-50%" }}
            animate={{ opacity: 0.7, scale: 2.5, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 2.5, x: "-50%", y: "-50%" }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              width: "80vw",
              height: "80vw",
              maxWidth: "1200px",
              maxHeight: "1200px",
              borderRadius: "50%",
              pointerEvents: "none",
              zIndex: 50,
              background:
                "radial-gradient(circle at 60% 40%, #00ffa3 0%, #0057ff 60%, #7c3aed 100%)",
              filter: "blur(48px)",
              mixBlendMode: "screen",
            }}
          />
        </AnimatePresence>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
