import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Copy, Check, BookOpen, HelpCircle, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleEmailCopy = () => {
    navigator.clipboard.writeText("team@coinet.ai");
    setCopiedEmail(true);
    toast.success("Email copied to clipboard!");
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleEmailClick = () => {
    window.location.href = "mailto:team@coinet.ai";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Contact Support</DialogTitle>
          <DialogDescription>
            Get help from our team
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email Contact */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <code className="text-sm font-mono">team@coinet.ai</code>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEmailCopy}
                className="h-8 gap-2"
              >
                {copiedEmail ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <Button
              onClick={handleEmailClick}
              className="w-full gap-2"
            >
              <Mail className="w-4 h-4" />
              Send Email
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or explore
              </span>
            </div>
          </div>

          {/* Additional Resources */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => window.open('#', '_blank')}
            >
              <BookOpen className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1 text-left">
                <div className="font-medium">Documentation</div>
                <div className="text-xs text-muted-foreground">
                  Guides, tutorials, and API reference
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => window.open('#', '_blank')}
            >
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1 text-left">
                <div className="font-medium">Help Center</div>
                <div className="text-xs text-muted-foreground">
                  FAQs and troubleshooting
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>

          {/* Response Time Info */}
          <div className="text-center text-xs text-muted-foreground pt-2">
            Average response time: 24 hours
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
