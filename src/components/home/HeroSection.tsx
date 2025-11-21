import React from "react";
import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiTrendingUp,
  FiShield,
  FiGlobe,
  FiAward,
  FiBook,
} from "react-icons/fi";
import { getTypographyClasses } from "../../styles/typography";
import {
  buttonVariants,
  Tooltip,
  ConfettiBurst,
} from "../common/MicroInteractions";
import {
  SkipToMainContent,
  AccessibleButton,
  AccessibleImage,
  AccessibleLiveRegion,
  focusRingClasses,
} from "../common/Accessibility";

export const HeroSection: React.FC = () => {
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState("");

  const handleGetStarted = () => {
    setShowConfetti(true);
    setAnnouncement(
      "Welcome to our platform! Get started with cryptocurrency trading.",
    );
    setTimeout(() => {
      setShowConfetti(false);
      setAnnouncement("");
    }, 2000);
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800">
      <SkipToMainContent />
      <AccessibleLiveRegion>{announcement}</AccessibleLiveRegion>

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-500/10 rounded-full blur-3xl"
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-500/5 via-transparent to-transparent"
          />
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className={`${getTypographyClasses("display", "large")} text-neutral-900 dark:text-white`}
              >
                Trade Crypto with Confidence
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`${getTypographyClasses("body", "large")} text-neutral-600 dark:text-neutral-300`}
              >
                The most trusted platform for cryptocurrency trading and
                analysis. Access real-time market data, advanced trading tools,
                and secure transactions.
              </motion.p>
            </div>

            {/* Feature Highlights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-6"
              role="list"
              aria-label="Platform features"
            >
              {[
                {
                  icon: (
                    <FiTrendingUp
                      className="w-5 h-5 text-primary-500"
                      aria-hidden="true"
                    />
                  ),
                  title: "Real-time Data",
                  description: "Live market updates and analytics",
                },
                {
                  icon: (
                    <FiShield
                      className="w-5 h-5 text-primary-500"
                      aria-hidden="true"
                    />
                  ),
                  title: "Secure Trading",
                  description: "Advanced security measures",
                },
                {
                  icon: (
                    <FiGlobe
                      className="w-5 h-5 text-primary-500"
                      aria-hidden="true"
                    />
                  ),
                  title: "Global Access",
                  description: "Trade from anywhere, anytime",
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="flex items-start space-x-3 group"
                  role="listitem"
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors duration-200"
                    aria-hidden="true"
                  >
                    {feature.icon}
                  </motion.div>
                  <div>
                    <h3
                      className={`${getTypographyClasses("heading", "h5")} text-neutral-900 dark:text-white`}
                    >
                      {feature.title}
                    </h3>
                    <p
                      className={`${getTypographyClasses("body", "small")} text-neutral-600 dark:text-neutral-300`}
                    >
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <AccessibleButton
                label="Get Started"
                description="Begin your cryptocurrency trading journey"
                icon={
                  <motion.div
                    initial={{ x: 0 }}
                    whileHover={{ x: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <FiArrowRight className="w-5 h-5" aria-hidden="true" />
                  </motion.div>
                }
                onClick={handleGetStarted}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-500 hover:bg-primary-600 transition-colors duration-200"
              />
              <Tooltip content="Learn more about our platform features and benefits">
                <AccessibleButton
                  label="Learn More"
                  description="Discover platform features and benefits"
                  className="inline-flex items-center justify-center px-6 py-3 border border-neutral-300 dark:border-neutral-600 text-base font-medium rounded-md text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors duration-200"
                />
              </Tooltip>
            </motion.div>

            {/* Engagement Features Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-primary-500/5 border border-primary-500/10">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
                  <FiAward className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h4
                    className={`${getTypographyClasses("heading", "h6")} text-neutral-900 dark:text-white`}
                  >
                    Earn Rewards
                  </h4>
                  <p
                    className={`${getTypographyClasses("body", "small")} text-neutral-600 dark:text-neutral-300`}
                  >
                    Complete challenges and earn badges
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-primary-500/5 border border-primary-500/10">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
                  <FiBook className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h4
                    className={`${getTypographyClasses("heading", "h6")} text-neutral-900 dark:text-white`}
                  >
                    Learn & Grow
                  </h4>
                  <p
                    className={`${getTypographyClasses("body", "small")} text-neutral-600 dark:text-neutral-300`}
                  >
                    Access educational resources
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-primary-500/5 border border-primary-500/10">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
                  <FiShield className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h4
                    className={`${getTypographyClasses("heading", "h6")} text-neutral-900 dark:text-white`}
                  >
                    Trusted Platform
                  </h4>
                  <p
                    className={`${getTypographyClasses("body", "small")} text-neutral-600 dark:text-neutral-300`}
                  >
                    Bank-level security & compliance
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Visual Elements */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            {/* Trading Interface Preview */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
              role="img"
              aria-label="Trading interface preview showing Bitcoin price chart and trading controls"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-secondary-500/5" />

              {/* Mock Trading Chart */}
              <div className="relative h-[400px] p-4">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-500/10 via-transparent to-transparent" />

                {/* Chart Grid Lines */}
                <div
                  className="absolute inset-0 grid grid-cols-6 grid-rows-6"
                  aria-hidden="true"
                >
                  {Array.from({ length: 7 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                      className="border-b border-neutral-200 dark:border-neutral-700"
                      style={{ top: `${(i * 100) / 6}%` }}
                    />
                  ))}
                  {Array.from({ length: 7 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                      className="border-r border-neutral-200 dark:border-neutral-700"
                      style={{ left: `${(i * 100) / 6}%` }}
                    />
                  ))}
                </div>

                {/* Animated Price Line */}
                <svg
                  className="absolute inset-0 w-full h-full"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <motion.path
                    d="M0,200 Q100,150 200,180 T400,160 T600,190 T800,140 T1000,170"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                  />
                  <defs>
                    <linearGradient
                      id="gradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="var(--color-primary-500)" />
                      <stop
                        offset="100%"
                        stopColor="var(--color-secondary-500)"
                      />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Price Points */}
                <div
                  className="absolute bottom-4 left-4 right-4 flex justify-between"
                  aria-hidden="true"
                >
                  {["$45,000", "$46,000", "$47,000", "$48,000", "$49,000"].map(
                    (price, i) => (
                      <motion.span
                        key={price}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 1 + i * 0.1 }}
                        className={`${getTypographyClasses("data", "small")} text-neutral-600 dark:text-neutral-300`}
                      >
                        {price}
                      </motion.span>
                    ),
                  )}
                </div>
              </div>

              {/* Trading Controls */}
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <span
                        className={`${getTypographyClasses("data", "small")} text-primary-500`}
                      >
                        ₿
                      </span>
                    </motion.div>
                    <div>
                      <div
                        className={`${getTypographyClasses("body", "regular")} text-neutral-900 dark:text-white`}
                      >
                        Bitcoin
                      </div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`${getTypographyClasses("data", "small")} text-primary-500`}
                      >
                        +2.5%
                      </motion.div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <AccessibleButton
                      label="Buy"
                      description="Buy Bitcoin"
                      className="px-4 py-2 rounded-md bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 transition-colors duration-200"
                    />
                    <AccessibleButton
                      label="Sell"
                      description="Sell Bitcoin"
                      className="px-4 py-2 rounded-md bg-secondary-500/10 text-secondary-500 hover:bg-secondary-500/20 transition-colors duration-200"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Decorative Elements */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="absolute -top-4 -right-4 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="absolute -bottom-4 -left-4 w-24 h-24 bg-secondary-500/10 rounded-full blur-2xl"
              aria-hidden="true"
            />
          </motion.div>
        </div>
      </div>

      {/* Confetti Effect */}
      <ConfettiBurst trigger={showConfetti} />
    </div>
  );
};
