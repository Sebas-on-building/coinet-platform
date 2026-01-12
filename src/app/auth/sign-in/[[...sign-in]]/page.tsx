'use client';

import React from 'react';
import { SignIn } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-[#0a0a1a] dark:via-[#0f1029] dark:to-[#1a0a2e] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo and branding */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center mb-8"
        >
          <Link href="/" className="inline-block">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center gap-3 mb-4"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">C</span>
              </div>
              <span className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Coinet
              </span>
            </motion.div>
          </Link>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            AI-Powered Crypto Intelligence Platform
          </p>
        </motion.div>

        {/* Clerk SignIn component */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-2',
                headerTitle: 'text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight',
                headerSubtitle: 'text-gray-500 dark:text-gray-400 font-medium',
                socialButtonsBlockButton: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl py-3 font-medium transition-all duration-200 shadow-sm hover:shadow-md',
                socialButtonsBlockButtonText: 'font-medium text-gray-700 dark:text-gray-200',
                dividerLine: 'bg-slate-200 dark:bg-slate-700',
                dividerText: 'text-slate-400 dark:text-slate-500 text-sm font-medium',
                formFieldLabel: 'text-gray-700 dark:text-gray-300 font-medium text-sm',
                formFieldInput: 'rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:text-white py-3 transition-all duration-200',
                formButtonPrimary: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl py-3 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5',
                footerActionLink: 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors',
                footerActionText: 'text-gray-500 dark:text-gray-400',
              },
              layout: {
                socialButtonsPlacement: 'top',
              },
            }}
            routing="path"
            path="/auth/sign-in"
            signUpUrl="/auth/sign-up"
            forceRedirectUrl="/dashboard"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
