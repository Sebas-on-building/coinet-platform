import { cn } from "@/lib/utils";

interface SkipNavProps {
  contentId?: string;
  className?: string;
}

export function SkipNav({ contentId = "main-content", className }: SkipNavProps) {
  return (
    <div className={cn("skip-nav-wrapper", className)}>
      <a
        href={`#${contentId}`}
        className={cn(
          "sr-only focus:not-sr-only",
          "fixed top-4 left-4 z-[9999]",
          "bg-primary text-primary-foreground",
          "px-4 py-2 rounded-lg",
          "font-medium text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "transition-all duration-200",
          "hover:bg-primary/90"
        )}
        onClick={(e) => {
          e.preventDefault();
          const target = document.getElementById(contentId);
          if (target) {
            target.tabIndex = -1;
            target.focus();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
      >
        Skip to main content
      </a>
    </div>
  );
}

export function SkipNavLinks() {
  const links = [
    { href: "#main-content", label: "Skip to main content" },
    { href: "#main-navigation", label: "Skip to navigation" },
    { href: "#search", label: "Skip to search" },
  ];

  return (
    <div className="skip-nav-links">
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className={cn(
            "sr-only focus:not-sr-only",
            "fixed top-4 left-4 z-[9999]",
            "bg-primary text-primary-foreground",
            "px-4 py-2 rounded-lg",
            "font-medium text-sm",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "transition-all duration-200",
            "hover:bg-primary/90"
          )}
          onClick={(e) => {
            e.preventDefault();
            const target = document.querySelector(link.href);
            if (target instanceof HTMLElement) {
              target.tabIndex = -1;
              target.focus();
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
