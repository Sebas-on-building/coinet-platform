import { Fragment } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ElementType;
  onClick?: () => void;
  current?: boolean;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
  separator?: React.ReactNode;
}

export function BreadcrumbNav({ 
  items, 
  className,
  showHome = true,
  separator
}: BreadcrumbNavProps) {
  const homeItem: BreadcrumbItem = {
    label: 'Home',
    href: '/',
    icon: Home,
  };

  const allItems = showHome ? [homeItem, ...items] : items;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn('flex items-center space-x-1 text-sm', className)}
    >
      <ol className="flex items-center space-x-1">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const Icon = item.icon;

          return (
            <Fragment key={index}>
              <li className="flex items-center">
                {item.href && !isLast ? (
                  <Link
                    to={item.href}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      'text-muted-foreground'
                    )}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{item.label}</span>
                  </Link>
                ) : item.onClick && !isLast ? (
                  <button
                    onClick={item.onClick}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      'text-muted-foreground'
                    )}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{item.label}</span>
                  </button>
                ) : (
                  <span
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1',
                      isLast ? 'text-foreground font-medium' : 'text-muted-foreground'
                    )}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{item.label}</span>
                  </span>
                )}
              </li>
              
              {!isLast && (
                <li className="flex items-center text-muted-foreground/50">
                  {separator || <ChevronRight className="w-4 h-4" />}
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

// Compact breadcrumb variant for mobile
interface CompactBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function CompactBreadcrumb({ items, className }: CompactBreadcrumbProps) {
  if (items.length === 0) return null;

  const currentItem = items[items.length - 1];
  const parentItem = items.length > 1 ? items[items.length - 2] : null;

  return (
    <nav className={cn('flex items-center text-sm', className)}>
      {parentItem && (
        <>
          {parentItem.href ? (
            <Link
              to={parentItem.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </Link>
          ) : parentItem.onClick ? (
            <button
              onClick={parentItem.onClick}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          ) : null}
        </>
      )}
      <span className="ml-2 font-medium text-foreground truncate max-w-[200px]">
        {currentItem.label}
      </span>
    </nav>
  );
}

// Dropdown breadcrumb variant for many items
interface DropdownBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  maxVisible?: number;
}

export function DropdownBreadcrumb({ 
  items, 
  className,
  maxVisible = 3 
}: DropdownBreadcrumbProps) {
  if (items.length <= maxVisible) {
    return <BreadcrumbNav items={items} className={className} showHome={false} />;
  }

  const firstItem = items[0];
  const lastItems = items.slice(-2);
  const hiddenItems = items.slice(1, -2);

  return (
    <nav className={cn('flex items-center space-x-1 text-sm', className)}>
      <ol className="flex items-center space-x-1">
        {/* First item */}
        <li>
          {firstItem.href ? (
            <Link
              to={firstItem.href}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
            >
              {firstItem.icon && <firstItem.icon className="w-4 h-4" />}
              <span>{firstItem.label}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-1 text-muted-foreground">
              {firstItem.icon && <firstItem.icon className="w-4 h-4" />}
              <span>{firstItem.label}</span>
            </span>
          )}
        </li>

        {/* Separator */}
        <li className="text-muted-foreground/50">
          <ChevronRight className="w-4 h-4" />
        </li>

        {/* Dropdown for hidden items */}
        <li>
          <button
            className="px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
            title={`${hiddenItems.length} hidden items`}
          >
            ...
          </button>
        </li>

        {/* Last items */}
        {lastItems.map((item, index) => (
          <Fragment key={index}>
            <li className="text-muted-foreground/50">
              <ChevronRight className="w-4 h-4" />
            </li>
            <li>
              {item.href && index < lastItems.length - 1 ? (
                <Link
                  to={item.href}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
                >
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-1 text-foreground font-medium">
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
