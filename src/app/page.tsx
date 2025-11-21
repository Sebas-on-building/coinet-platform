"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

const features = [
  {
    icon: "🔒",
    title: "Privacy & Consent",
    desc: "Enterprise-grade privacy controls, granular consent, and audit history.",
  },
  {
    icon: "📊",
    title: "Analytics",
    desc: "Real-time analytics, AI insights, and actionable dashboards.",
  },
  {
    icon: "💼",
    title: "Portfolio",
    desc: "Track your assets, DeFi, and on-chain activity in one place.",
  },
  {
    icon: "🤖",
    title: "AI Assistant",
    desc: "AI-driven privacy, trading, and market recommendations.",
  },
  {
    icon: "🔔",
    title: "Notifications",
    desc: "Customizable alerts for market, privacy, and portfolio events.",
  },
];

const testimonials = [
  {
    quote:
      "Coinet is the most beautiful and secure crypto dashboard I have ever used. It feels like Apple and TradingView had a baby.",
    name: "Jane Doe",
    title: "Crypto Analyst",
  },
  {
    quote:
      "The privacy and consent features are years ahead of the competition. I trust Coinet with my data.",
    name: "John Smith",
    title: "DeFi Power User",
  },
];

const stats = [
  { label: "Total Users", value: "12,345", icon: "👥" },
  { label: "Assets Tracked", value: "$1.2B", icon: "💰" },
  { label: "Consents Managed", value: "98,765", icon: "🔒" },
  { label: "AI Insights Generated", value: "8,432", icon: "🤖" },
];

const steps = [
  {
    icon: "📝",
    title: "Sign Up",
    desc: "Create your Coinet account in seconds.",
  },
  {
    icon: "🔗",
    title: "Connect",
    desc: "Link your wallets, exchanges, and social accounts.",
  },
  {
    icon: "📊",
    title: "Analyze",
    desc: "Get real-time analytics, AI insights, and privacy controls.",
  },
  {
    icon: "🚀",
    title: "Act",
    desc: "Trade, manage privacy, and receive smart notifications.",
  },
];

const partners = [
  { name: "Solana", logo: "/logos/solana.svg" },
  { name: "TradingView", logo: "/logos/tradingview.svg" },
  { name: "Apple", logo: "/logos/apple.svg" },
  { name: "Canva", logo: "/logos/canva.svg" },
];

export default function HomePage() {
  const [newsletterStatus, setNewsletterStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNewsletterStatus("idle");
    // Simulate async
    setTimeout(() => {
      if (email.includes("@")) {
        setNewsletterStatus("success");
        setEmail("");
      } else {
        setNewsletterStatus("error");
      }
      setSubmitting(false);
    }, 1200);
    if ((window as any)?.gtag) {
      (window as any).gtag("event", "newsletter_subscribe", { label: email });
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#f1f5f9] dark:from-[#0a0a23] dark:via-[#18192b] dark:to-[#23234d] flex flex-col items-center">
      {/* Skip to content for a11y */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only absolute top-2 left-2 bg-blue-600 text-white px-4 py-2 rounded z-50"
      >
        Skip to main content
      </a>
      {/* Hero Section */}
      <section
        className="w-full max-w-5xl mx-auto flex flex-col items-center text-center py-24 px-4"
        id="main-content"
      >
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight animate-fade-in">
          Welcome to <span className="text-blue-600">Coinet</span>
        </h1>
        <p className="text-xl md:text-2xl text-blue-700 dark:text-blue-200 mb-8 font-medium animate-fade-in delay-200">
          The professional-grade crypto platform for privacy, analytics, and
          trading—designed to delight.
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center animate-fade-in delay-400">
          <Link href="/dashboard" className="...">
            <Button
              variant="primary"
              size="lg"
              analyticsEvent="go_to_dashboard"
            >
              Go to Dashboard
            </Button>
          </Link>
          <Link href="#features" className="...">
            <Button variant="secondary" size="lg" analyticsEvent="learn_more">
              Learn More
            </Button>
          </Link>
        </div>
      </section>
      {/* Animated Stats Section */}
      <section className="w-full max-w-5xl mx-auto py-8 px-4 grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-in delay-600">
        {stats.map((s) => (
          <Card
            key={s.label}
            variant="glass"
            hover
            className="flex flex-col items-center text-center backdrop-blur-xl"
            aria-label={s.label}
          >
            <span className="text-3xl mb-2 animate-bounce-slow">{s.icon}</span>
            <span className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-1">
              {s.value}
            </span>
            <span className="text-gray-600 dark:text-gray-300 text-sm">
              {s.label}
            </span>
          </Card>
        ))}
      </section>
      {/* Features Section */}
      <section
        id="features"
        className="w-full max-w-5xl mx-auto py-16 px-4 grid grid-cols-1 md:grid-cols-3 gap-12"
      >
        {features.map((f) => (
          <Card
            key={f.title}
            variant="glass"
            hover
            className="flex flex-col items-center text-center"
            aria-label={f.title}
          >
            <span className="text-5xl mb-4">{f.icon}</span>
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
              {f.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">{f.desc}</p>
          </Card>
        ))}
      </section>
      {/* How it Works Section */}
      <section className="w-full max-w-4xl mx-auto py-16 px-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-8 text-center">
          How it works
        </h2>
        <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
          {steps.map((step, i) => (
            <Card
              key={step.title}
              variant="glass"
              hover
              className="flex flex-col items-center text-center w-64 relative"
              aria-label={step.title}
            >
              <span className="text-3xl mb-2">{step.icon}</span>
              <h4 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">
                {step.title}
              </h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                {step.desc}
              </p>
              {i < steps.length - 1 && (
                <span className="absolute right-0 top-1/2 transform -translate-y-1/2 text-2xl text-blue-400 md:block hidden">
                  →
                </span>
              )}
            </Card>
          ))}
        </div>
      </section>
      {/* Partners Section */}
      <section className="w-full max-w-4xl mx-auto py-12 px-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-8 text-center">
          Our Partners
        </h2>
        <div className="flex flex-wrap gap-8 justify-center items-center">
          {partners.map((p) => (
            <Card
              key={p.name}
              variant="glass"
              hover
              className="flex flex-col items-center w-32 py-4"
              aria-label={p.name}
            >
              <img
                src={p.logo}
                alt={p.name}
                className="h-12 w-auto mb-2 opacity-80 hover:opacity-100 transition"
              />
              <span className="text-gray-500 dark:text-gray-400 text-xs">
                {p.name}
              </span>
            </Card>
          ))}
        </div>
      </section>
      {/* Newsletter Signup Section */}
      <section className="w-full max-w-2xl mx-auto py-12 px-4">
        <Card
          variant="glass"
          hover
          className="flex flex-col items-center"
          aria-label="Newsletter Signup"
        >
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            Stay in the loop
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-center">
            Get the latest updates, features, and crypto insights from Coinet.
            No spam, ever.
          </p>
          <form
            className="flex flex-col md:flex-row gap-4 w-full max-w-md items-center"
            onSubmit={handleNewsletter}
            aria-live="polite"
          >
            <Input
              type="email"
              placeholder="Your email"
              className="flex-1"
              required
              aria-label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              analyticsEvent="newsletter_email_focus"
              disabled={submitting}
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              sound
              soundType={
                newsletterStatus === "success"
                  ? "success"
                  : newsletterStatus === "error"
                    ? "error"
                    : "link"
              }
              analyticsEvent="newsletter_subscribe_click"
              disabled={submitting}
              aria-label="Subscribe"
            >
              {submitting ? "Subscribing..." : "Subscribe"}
            </Button>
          </form>
          <div className="mt-2 min-h-[24px]" aria-live="polite">
            {newsletterStatus === "success" && (
              <span className="text-green-600">Thank you for subscribing!</span>
            )}
            {newsletterStatus === "error" && (
              <span className="text-red-600">
                Please enter a valid email address.
              </span>
            )}
          </div>
        </Card>
      </section>
      {/* Testimonials Section */}
      <section className="w-full max-w-4xl mx-auto py-16 px-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-8 text-center">
          What our users say
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((t) => (
            <Card
              key={t.name}
              variant="glass"
              hover
              className="flex flex-col items-center"
              aria-label={t.name}
            >
              <p className="text-lg italic text-gray-700 dark:text-gray-200 mb-4">
                “{t.quote}”
              </p>
              <span className="font-bold text-blue-700 dark:text-blue-300">
                {t.name}
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                {t.title}
              </span>
            </Card>
          ))}
        </div>
      </section>
      {/* Footer */}
      <footer className="w-full py-8 text-center text-gray-400 dark:text-gray-600 text-sm border-t border-gray-200 dark:border-gray-800 mt-12">
        Coinet &copy; {new Date().getFullYear()} — Built for the future of
        crypto.
      </footer>
    </main>
  );
}
