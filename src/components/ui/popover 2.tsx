"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const dataState = (props as any)["data-state"];
    if (dataState === "open") setOpen(true);
    else setOpen(false);
  }, [(props as any)["data-state"]]);
  const { children, ...rest } = props;
  const {
    onDrag,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDrop,
    ...safeRest
  } = rest;
  return (
    <AnimatePresence>
      {open && (
        <PopoverPrimitive.Portal forceMount>
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: "spring", duration: 0.32 }}
            className={cn(
              "z-50 w-72 rounded-xl border border-blue-400/40 bg-gradient-to-br from-[#23234d] to-[#181836] p-4 text-white shadow-2xl outline-none backdrop-blur-md",
              className,
            )}
            ref={ref as any}
            {...(safeRest as React.HTMLAttributes<HTMLDivElement>)}
          >
            {children}
          </motion.div>
        </PopoverPrimitive.Portal>
      )}
    </AnimatePresence>
  );
});
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
