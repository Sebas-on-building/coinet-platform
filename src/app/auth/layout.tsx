'use client';

import React, { useEffect } from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Apply dark background to body for auth pages
  useEffect(() => {
    const originalBg = document.body.style.background;
    const originalColor = document.body.style.color;
    document.body.style.background = 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)';
    document.body.style.color = '#f8fafc';
    document.body.classList.add('auth-page');
    
    return () => {
      document.body.style.background = originalBg;
      document.body.style.color = originalColor;
      document.body.classList.remove('auth-page');
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Animated orbs - decorative */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ 
          position: 'absolute', 
          top: '25%', 
          left: '-128px', 
          width: '384px', 
          height: '384px', 
          background: 'rgba(59, 130, 246, 0.1)', 
          borderRadius: '50%', 
          filter: 'blur(48px)',
          animation: 'pulse 4s ease-in-out infinite'
        }} />
        <div style={{ 
          position: 'absolute', 
          bottom: '25%', 
          right: '-128px', 
          width: '384px', 
          height: '384px', 
          background: 'rgba(139, 92, 246, 0.1)', 
          borderRadius: '50%', 
          filter: 'blur(48px)',
          animation: 'pulse 4s ease-in-out infinite',
          animationDelay: '1s'
        }} />
      </div>
      
      {/* Left panel - Branding (hidden on mobile) */}
      <div style={{ 
        display: 'none',
        width: '50%',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
        position: 'relative',
        zIndex: 10
      }} className="lg:!flex">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
            borderRadius: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.3)'
          }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>C</span>
          </div>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>Coinet</span>
        </div>
        
        {/* Hero content */}
        <div style={{ maxWidth: '512px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: 'white', lineHeight: 1.1, marginBottom: '16px' }}>
              AI-Powered
              <br />
              <span style={{ 
                background: 'linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)', 
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Crypto Intelligence
              </span>
            </h1>
            <p style={{ fontSize: '20px', color: '#94a3b8' }}>
              Professional-grade analytics, real-time insights, and intelligent trading recommendations powered by advanced AI.
            </p>
          </div>
          
          {/* Features list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { icon: '🎯', text: 'Real-time market analysis' },
              { icon: '🤖', text: 'AI-powered insights' },
              { icon: '📊', text: 'Advanced portfolio tracking' },
              { icon: '🔒', text: 'Enterprise-grade security' },
            ].map((feature, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#cbd5e1' }}>
                <span style={{ fontSize: '20px' }}>{feature.icon}</span>
                <span style={{ fontWeight: 500 }}>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Testimonial */}
        <div style={{ maxWidth: '448px' }}>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
            {[...Array(5)].map((_, i) => (
              <svg key={i} style={{ width: '20px', height: '20px', color: '#facc15' }} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <blockquote style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '18px', marginBottom: '12px' }}>
            "Coinet transformed how I analyze crypto markets. The AI insights are incredibly accurate."
          </blockquote>
          <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
            — Alex Chen, Crypto Analyst
          </div>
        </div>
      </div>
      
      {/* Right panel - Auth form */}
      <div style={{ 
        width: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '24px',
        position: 'relative',
        zIndex: 10
      }} className="lg:!w-1/2 lg:!p-12">
        {children}
      </div>
      
      <style jsx global>{`
        @media (min-width: 1024px) {
          .lg\\:!flex { display: flex !important; }
          .lg\\:!w-1\\/2 { width: 50% !important; }
          .lg\\:!p-12 { padding: 48px !important; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
