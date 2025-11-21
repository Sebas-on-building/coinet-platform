import React from "react";
import { motion } from "framer-motion";
import { getTypographyClasses } from "../../styles/typography";

// Focus ring styles that meet WCAG standards
export const focusRingClasses =
  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900";

// Skip to main content link for keyboard users
export const SkipToMainContent: React.FC = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-primary-500 text-white rounded-md"
  >
    Skip to main content
  </a>
);

// Accessible button component
interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  label,
  description,
  icon,
  className = "",
  ...props
}) => (
  <button
    className={`inline-flex items-center justify-center ${focusRingClasses} ${className}`}
    aria-label={description ? `${label}, ${description}` : label}
    {...props}
  >
    {icon && (
      <span className="mr-2" aria-hidden="true">
        {icon}
      </span>
    )}
    <span>{label}</span>
  </button>
);

// Accessible image component
interface AccessibleImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}

export const AccessibleImage: React.FC<AccessibleImageProps> = ({
  src,
  alt,
  width,
  height,
  className = "",
  priority = false,
}) => (
  <img
    src={src}
    alt={alt}
    width={width}
    height={height}
    className={className}
    loading={priority ? "eager" : "lazy"}
  />
);

// Accessible form field component
interface AccessibleFormFieldProps {
  id: string;
  label: string;
  error?: string;
  description?: string;
  children: React.ReactNode;
}

export const AccessibleFormField: React.FC<AccessibleFormFieldProps> = ({
  id,
  label,
  error,
  description,
  children,
}) => (
  <div className="space-y-1">
    <label
      htmlFor={id}
      className={`block ${getTypographyClasses("body", "regular")} text-neutral-900 dark:text-white`}
    >
      {label}
    </label>
    {description && (
      <p
        className={`${getTypographyClasses("body", "small")} text-neutral-600 dark:text-neutral-400`}
      >
        {description}
      </p>
    )}
    {children}
    {error && (
      <p
        className={`${getTypographyClasses("body", "small")} text-error-500`}
        role="alert"
        aria-live="polite"
      >
        {error}
      </p>
    )}
  </div>
);

// Accessible dialog component
interface AccessibleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const AccessibleDialog: React.FC<AccessibleDialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Focus trap
      const focusableElements = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const firstElement = focusableElements?.[0] as HTMLElement;
      const lastElement = focusableElements?.[
        focusableElements.length - 1
      ] as HTMLElement;

      const handleTab = (event: KeyboardEvent) => {
        if (event.key === "Tab") {
          if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          } else if (
            !event.shiftKey &&
            document.activeElement === lastElement
          ) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      };

      document.addEventListener("keydown", handleTab);
      firstElement?.focus();

      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.removeEventListener("keydown", handleTab);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-neutral-900/75"
          aria-hidden="true"
          onClick={onClose}
        />
        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>
        <motion.div
          ref={dialogRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="inline-block align-bottom bg-white dark:bg-neutral-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
        >
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3
                id="dialog-title"
                className={`${getTypographyClasses("heading", "h3")} text-neutral-900 dark:text-white`}
              >
                {title}
              </h3>
              <div className="mt-4">{children}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Accessible tab panel component
interface AccessibleTabPanelProps {
  tabs: Array<{
    id: string;
    label: string;
    content: React.ReactNode;
  }>;
}

export const AccessibleTabPanel: React.FC<AccessibleTabPanelProps> = ({
  tabs,
}) => {
  const [activeTab, setActiveTab] = React.useState(tabs[0].id);

  return (
    <div>
      <div
        role="tablist"
        className="flex space-x-4 border-b border-neutral-200 dark:border-neutral-700"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`${tab.id}-panel`}
            id={tab.id}
            className={`px-4 py-2 ${focusRingClasses} ${
              activeTab === tab.id
                ? "border-b-2 border-primary-500 text-primary-500"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${tab.id}-panel`}
          aria-labelledby={tab.id}
          hidden={activeTab !== tab.id}
          className="mt-4"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
};

// Accessible live region for dynamic content
interface AccessibleLiveRegionProps {
  children: React.ReactNode;
  ariaLive?: "polite" | "assertive";
}

export const AccessibleLiveRegion: React.FC<AccessibleLiveRegionProps> = ({
  children,
  ariaLive = "polite",
}) => (
  <div role="status" aria-live={ariaLive} className="sr-only">
    {children}
  </div>
);
