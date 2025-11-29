import React from "react";
import { motion } from "framer-motion";
import {
  FiAward,
  FiBook,
  FiHeadphones,
  FiShield,
  FiGlobe,
  FiUsers,
  FiTrophy,
  FiGift,
  FiStar,
  FiTrendingUp,
  FiHelpCircle,
  FiMessageSquare,
  FiMail,
  FiPhone,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";
import { getTypographyClasses } from "../../styles/typography";
import {
  AccessibleButton,
  AccessibleDialog,
  AccessibleTabPanel,
} from "./Accessibility";

// Achievement Badge Component
interface AchievementBadgeProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  progress?: number;
  isUnlocked?: boolean;
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  icon,
  title,
  description,
  progress,
  isUnlocked = false,
}) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className={`relative p-4 rounded-lg border ${
      isUnlocked
        ? "border-primary-500/20 bg-primary-500/5"
        : "border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50"
    }`}
  >
    <div className="flex items-start space-x-3">
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
          isUnlocked
            ? "bg-primary-500/10 text-primary-500"
            : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4
          className={`${getTypographyClasses("heading", "h5")} text-neutral-900 dark:text-white`}
        >
          {title}
        </h4>
        <p
          className={`${getTypographyClasses("body", "small")} text-neutral-600 dark:text-neutral-300`}
        >
          {description}
        </p>
        {progress !== undefined && (
          <div className="mt-2">
            <div className="h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-primary-500"
              />
            </div>
            <p
              className={`${getTypographyClasses("data", "small")} text-neutral-500 dark:text-neutral-400 mt-1`}
            >
              {progress}% Complete
            </p>
          </div>
        )}
      </div>
    </div>
  </motion.div>
);

// Educational Resource Component
interface EducationalResourceProps {
  title: string;
  description: string;
  type: "article" | "video" | "tutorial";
  duration?: string;
  level: "beginner" | "intermediate" | "advanced";
}

const EducationalResource: React.FC<EducationalResourceProps> = ({
  title,
  description,
  type,
  duration,
  level,
}) => {
  const getTypeIcon = () => {
    switch (type) {
      case "article":
        return <FiBook className="w-5 h-5" />;
      case "video":
        return <FiHeadphones className="w-5 h-5" />;
      case "tutorial":
        return <FiAward className="w-5 h-5" />;
    }
  };

  const getLevelColor = () => {
    switch (level) {
      case "beginner":
        return "text-green-500";
      case "intermediate":
        return "text-yellow-500";
      case "advanced":
        return "text-red-500";
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
          {getTypeIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4
            className={`${getTypographyClasses("heading", "h5")} text-neutral-900 dark:text-white`}
          >
            {title}
          </h4>
          <p
            className={`${getTypographyClasses("body", "small")} text-neutral-600 dark:text-neutral-300`}
          >
            {description}
          </p>
          <div className="mt-2 flex items-center space-x-4">
            {duration && (
              <span
                className={`${getTypographyClasses("data", "small")} text-neutral-500 dark:text-neutral-400`}
              >
                {duration}
              </span>
            )}
            <span
              className={`${getTypographyClasses("data", "small")} ${getLevelColor()}`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Trading Competition Component
interface TradingCompetitionProps {
  title: string;
  prize: string;
  participants: number;
  endDate: string;
  status: "active" | "upcoming" | "ended";
}

const TradingCompetition: React.FC<TradingCompetitionProps> = ({
  title,
  prize,
  participants,
  endDate,
  status,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case "active":
        return "text-green-500";
      case "upcoming":
        return "text-yellow-500";
      case "ended":
        return "text-neutral-500";
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
          <FiTrophy className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4
              className={`${getTypographyClasses("heading", "h5")} text-neutral-900 dark:text-white`}
            >
              {title}
            </h4>
            <span
              className={`${getTypographyClasses("data", "small")} ${getStatusColor()}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
          <p
            className={`${getTypographyClasses("body", "small")} text-neutral-600 dark:text-neutral-300 mt-1`}
          >
            Prize Pool: {prize}
          </p>
          <div className="mt-2 flex items-center space-x-4">
            <span
              className={`${getTypographyClasses("data", "small")} text-neutral-500 dark:text-neutral-400`}
            >
              {participants} Participants
            </span>
            <span
              className={`${getTypographyClasses("data", "small")} text-neutral-500 dark:text-neutral-400`}
            >
              Ends: {endDate}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Referral Program Component
interface ReferralProgramProps {
  code: string;
  rewards: string;
  referrals: number;
  totalEarned: string;
}

const ReferralProgram: React.FC<ReferralProgramProps> = ({
  code,
  rewards,
  referrals,
  totalEarned,
}) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="p-4 rounded-lg border border-primary-500/20 bg-primary-500/5"
  >
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
        <FiGift className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4
          className={`${getTypographyClasses("heading", "h5")} text-neutral-900 dark:text-white`}
        >
          Referral Program
        </h4>
        <p
          className={`${getTypographyClasses("body", "small")} text-neutral-600 dark:text-neutral-300`}
        >
          Share your code: <span className="font-mono">{code}</span>
        </p>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div>
            <p
              className={`${getTypographyClasses("data", "small")} text-neutral-500 dark:text-neutral-400`}
            >
              Rewards
            </p>
            <p
              className={`${getTypographyClasses("body", "regular")} text-primary-500`}
            >
              {rewards}
            </p>
          </div>
          <div>
            <p
              className={`${getTypographyClasses("data", "small")} text-neutral-500 dark:text-neutral-400`}
            >
              Total Earned
            </p>
            <p
              className={`${getTypographyClasses("body", "regular")} text-primary-500`}
            >
              {totalEarned}
            </p>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

// Enhanced Trust Indicator Component
interface EnhancedTrustIndicatorProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  certification?: string;
  verification?: string;
}

const EnhancedTrustIndicator: React.FC<EnhancedTrustIndicatorProps> = ({
  icon,
  title,
  description,
  certification,
  verification,
}) => (
  <div className="flex items-start space-x-3">
    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
      {icon}
    </div>
    <div>
      <h4
        className={`${getTypographyClasses("heading", "h5")} text-neutral-900 dark:text-white`}
      >
        {title}
      </h4>
      <p
        className={`${getTypographyClasses("body", "small")} text-neutral-600 dark:text-neutral-300`}
      >
        {description}
      </p>
      {certification && (
        <div className="mt-2 flex items-center space-x-2">
          <FiCheckCircle className="w-4 h-4 text-green-500" />
          <span
            className={`${getTypographyClasses("data", "small")} text-green-500`}
          >
            {certification}
          </span>
        </div>
      )}
      {verification && (
        <div className="mt-1 flex items-center space-x-2">
          <FiStar className="w-4 h-4 text-yellow-500" />
          <span
            className={`${getTypographyClasses("data", "small")} text-yellow-500`}
          >
            {verification}
          </span>
        </div>
      )}
    </div>
  </div>
);

// Support Ticket Component
interface SupportTicketProps {
  id: string;
  subject: string;
  status: "open" | "in-progress" | "resolved";
  lastUpdate: string;
}

const SupportTicket: React.FC<SupportTicketProps> = ({
  id,
  subject,
  status,
  lastUpdate,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case "open":
        return "text-yellow-500";
      case "in-progress":
        return "text-blue-500";
      case "resolved":
        return "text-green-500";
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
    >
      <div className="flex items-center justify-between">
        <div>
          <h4
            className={`${getTypographyClasses("heading", "h6")} text-neutral-900 dark:text-white`}
          >
            {subject}
          </h4>
          <p
            className={`${getTypographyClasses("data", "small")} text-neutral-500 dark:text-neutral-400`}
          >
            Ticket #{id}
          </p>
        </div>
        <div className="text-right">
          <span
            className={`${getTypographyClasses("data", "small")} ${getStatusColor()}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          <p
            className={`${getTypographyClasses("data", "small")} text-neutral-500 dark:text-neutral-400`}
          >
            Updated: {lastUpdate}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// Main Engagement Features Component
export const EngagementFeatures: React.FC = () => {
  const [showSupportDialog, setShowSupportDialog] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("achievements");

  const achievements = [
    {
      icon: <FiAward className="w-5 h-5" />,
      title: "First Trade",
      description: "Complete your first cryptocurrency trade",
      progress: 100,
      isUnlocked: true,
    },
    {
      icon: <FiShield className="w-5 h-5" />,
      title: "Security Champion",
      description: "Enable 2FA and complete security checklist",
      progress: 75,
      isUnlocked: false,
    },
    {
      icon: <FiUsers className="w-5 h-5" />,
      title: "Community Builder",
      description: "Invite 5 friends to join the platform",
      progress: 40,
      isUnlocked: false,
    },
  ];

  const educationalResources = [
    {
      title: "Getting Started with Cryptocurrency",
      description:
        "Learn the basics of cryptocurrency trading and blockchain technology",
      type: "article" as const,
      duration: "5 min read",
      level: "beginner" as const,
    },
    {
      title: "Advanced Trading Strategies",
      description: "Master technical analysis and trading patterns",
      type: "video" as const,
      duration: "15 min",
      level: "advanced" as const,
    },
    {
      title: "Security Best Practices",
      description: "Essential security measures for protecting your assets",
      type: "tutorial" as const,
      duration: "10 min",
      level: "intermediate" as const,
    },
  ];

  const tradingCompetitions = [
    {
      title: "Monthly Trading Challenge",
      prize: "10 BTC",
      participants: 1250,
      endDate: "2024-04-30",
      status: "active" as const,
    },
    {
      title: "Weekend Warriors",
      prize: "5 BTC",
      participants: 850,
      endDate: "2024-04-15",
      status: "upcoming" as const,
    },
  ];

  const referralProgram = {
    code: "TRADE2024",
    rewards: "20% of trading fees",
    referrals: 12,
    totalEarned: "0.5 BTC",
  };

  const enhancedTrustIndicators = [
    {
      icon: <FiShield className="w-5 h-5" />,
      title: "Bank-Level Security",
      description: "AES-256 encryption and cold storage",
      certification: "ISO 27001 Certified",
      verification: "Regular Security Audits",
    },
    {
      icon: <FiGlobe className="w-5 h-5" />,
      title: "Global Compliance",
      description: "Licensed and regulated in multiple jurisdictions",
      certification: "FCA Registered",
      verification: "KYC/AML Compliant",
    },
    {
      icon: <FiUsers className="w-5 h-5" />,
      title: "1M+ Users",
      description: "Join our growing community of traders",
      certification: "Trusted by Institutions",
      verification: "4.8/5 User Rating",
    },
  ];

  const supportTickets = [
    {
      id: "TICKET-001",
      subject: "Account Verification Issue",
      status: "in-progress" as const,
      lastUpdate: "2 hours ago",
    },
    {
      id: "TICKET-002",
      subject: "Trading Fee Question",
      status: "resolved" as const,
      lastUpdate: "1 day ago",
    },
  ];

  return (
    <div className="py-12 bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            className={`${getTypographyClasses("display", "medium")} text-neutral-900 dark:text-white`}
          >
            Learn, Earn, and Trade with Confidence
          </h2>
          <p
            className={`${getTypographyClasses("body", "large")} text-neutral-600 dark:text-neutral-300 mt-4`}
          >
            Access educational resources, earn achievements, and join our
            trusted community
          </p>
        </div>

        <AccessibleTabPanel
          tabs={[
            {
              id: "achievements",
              label: "Achievements & Rewards",
              content: (
                <div className="space-y-8">
                  <div className="space-y-6">
                    <h3
                      className={`${getTypographyClasses("heading", "h4")} text-neutral-900 dark:text-white`}
                    >
                      Your Achievements
                    </h3>
                    <div className="space-y-4">
                      {achievements.map((achievement) => (
                        <AchievementBadge
                          key={achievement.title}
                          {...achievement}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3
                      className={`${getTypographyClasses("heading", "h4")} text-neutral-900 dark:text-white`}
                    >
                      Trading Competitions
                    </h3>
                    <div className="space-y-4">
                      {tradingCompetitions.map((competition) => (
                        <TradingCompetition
                          key={competition.title}
                          {...competition}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3
                      className={`${getTypographyClasses("heading", "h4")} text-neutral-900 dark:text-white`}
                    >
                      Referral Program
                    </h3>
                    <ReferralProgram {...referralProgram} />
                  </div>
                </div>
              ),
            },
            {
              id: "education",
              label: "Learning Resources",
              content: (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {educationalResources.map((resource) => (
                      <EducationalResource key={resource.title} {...resource} />
                    ))}
                  </div>
                </div>
              ),
            },
            {
              id: "support",
              label: "Support & Trust",
              content: (
                <div className="space-y-8">
                  <div className="space-y-6">
                    <h3
                      className={`${getTypographyClasses("heading", "h4")} text-neutral-900 dark:text-white`}
                    >
                      Your Support Tickets
                    </h3>
                    <div className="space-y-4">
                      {supportTickets.map((ticket) => (
                        <SupportTicket key={ticket.id} {...ticket} />
                      ))}
                    </div>
                    <AccessibleButton
                      label="Create New Ticket"
                      description="Submit a new support request"
                      onClick={() => setShowSupportDialog(true)}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-6">
                    <h3
                      className={`${getTypographyClasses("heading", "h4")} text-neutral-900 dark:text-white`}
                    >
                      Why Trust Us
                    </h3>
                    <div className="space-y-6">
                      {enhancedTrustIndicators.map((indicator) => (
                        <EnhancedTrustIndicator
                          key={indicator.title}
                          {...indicator}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Enhanced Support Dialog */}
      <AccessibleDialog
        isOpen={showSupportDialog}
        onClose={() => setShowSupportDialog(false)}
        title="Contact Support"
      >
        <div className="space-y-6">
          <p
            className={`${getTypographyClasses("body", "regular")} text-neutral-600 dark:text-neutral-300`}
          >
            Our support team is available 24/7 to help you with any questions or
            concerns.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AccessibleButton
              label="Live Chat"
              description="Start a conversation with our support team"
              icon={<FiMessageSquare className="w-5 h-5" />}
              className="w-full"
            />
            <AccessibleButton
              label="Email Support"
              description="Send us an email"
              icon={<FiMail className="w-5 h-5" />}
              className="w-full"
            />
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
            <h4
              className={`${getTypographyClasses("heading", "h5")} text-neutral-900 dark:text-white mb-4`}
            >
              Support Hours
            </h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <FiClock className="w-5 h-5 text-primary-500" />
                <span
                  className={`${getTypographyClasses("body", "regular")} text-neutral-600 dark:text-neutral-300`}
                >
                  24/7 Live Chat Support
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <FiMail className="w-5 h-5 text-primary-500" />
                <span
                  className={`${getTypographyClasses("body", "regular")} text-neutral-600 dark:text-neutral-300`}
                >
                  Email Response: Within 24 hours
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <FiPhone className="w-5 h-5 text-primary-500" />
                <span
                  className={`${getTypographyClasses("body", "regular")} text-neutral-600 dark:text-neutral-300`}
                >
                  Phone Support: 9 AM - 5 PM UTC
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
            <h4
              className={`${getTypographyClasses("heading", "h5")} text-neutral-900 dark:text-white mb-4`}
            >
              Common Issues
            </h4>
            <div className="space-y-2">
              <AccessibleButton
                label="Account Verification"
                description="Get help with KYC process"
                className="w-full justify-start"
              />
              <AccessibleButton
                label="Trading Issues"
                description="Resolve trading problems"
                className="w-full justify-start"
              />
              <AccessibleButton
                label="Security Concerns"
                description="Report security issues"
                className="w-full justify-start"
              />
            </div>
          </div>
        </div>
      </AccessibleDialog>
    </div>
  );
};
