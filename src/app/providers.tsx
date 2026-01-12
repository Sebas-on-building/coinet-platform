"use client";

import React, { type ReactNode } from "react";
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
            {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
