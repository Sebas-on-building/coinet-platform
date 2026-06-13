import { cn } from "@/lib/utils";

type Variant =
  | "default"
  | "primary"
  | "positive"
  | "negative"
  | "caution"
  | "outline";

const variants: Record<Variant, string> = {
  default: "bg-secondary text-secondary-foreground",
  primary: "bg-primary/15 text-primary border border-primary/30",
  positive: "bg-positive/15 text-positive border border-positive/30",
  negative: "bg-negative/15 text-negative border border-negative/30",
  caution: "bg-caution/15 text-caution border border-caution/30",
  outline: "border border-border text-muted-foreground",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: { variant?: Variant } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
