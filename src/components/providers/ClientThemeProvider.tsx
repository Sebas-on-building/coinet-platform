"use client";

import React from "react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "react-hot-toast";
import { Navigation } from "@/components/ui/Navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function ClientThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      {children}
      <Toaster position="top-right" />
    </ThemeProvider>
  );
}

export function ClientHeader() {
  return (
    <div className="flex justify-between items-center w-full md:w-auto">
      <Navigation />
      <div className="hidden md:block">
        <ThemeToggle />
      </div>
      <div className="md:hidden">
        <ThemeToggle />
      </div>
    </div>
  );
}
