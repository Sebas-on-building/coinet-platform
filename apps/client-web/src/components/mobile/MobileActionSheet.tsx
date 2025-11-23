import { useState } from 'react';
import { BottomSheet, BottomSheetAction } from '@/components/ui/bottom-sheet';
import { Share2, Download, Copy, Trash2, Settings, AlertCircle } from 'lucide-react';

interface MobileActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  actions: Array<{
    icon?: React.ReactNode;
    label: string;
    description?: string;
    onClick: () => void;
    destructive?: boolean;
    disabled?: boolean;
  }>;
}

export function MobileActionSheet({
  open,
  onOpenChange,
  title = 'Actions',
  actions,
}: MobileActionSheetProps) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      showHandle
      dismissible
    >
      <div className="space-y-2 py-2">
        {actions.map((action, index) => (
          <BottomSheetAction
            key={index}
            icon={action.icon}
            label={action.label}
            description={action.description}
            onClick={() => {
              action.onClick();
              onOpenChange(false);
            }}
            destructive={action.destructive}
            disabled={action.disabled}
          />
        ))}
      </div>
    </BottomSheet>
  );
}

// Example usage component
export function ExampleMobileActions() {
  const [open, setOpen] = useState(false);

  const actions = [
    {
      icon: <Share2 className="w-5 h-5" />,
      label: 'Share',
      description: 'Share this conversation',
      onClick: () => console.log('Share clicked'),
    },
    {
      icon: <Download className="w-5 h-5" />,
      label: 'Download',
      description: 'Save to device',
      onClick: () => console.log('Download clicked'),
    },
    {
      icon: <Copy className="w-5 h-5" />,
      label: 'Copy',
      description: 'Copy to clipboard',
      onClick: () => console.log('Copy clicked'),
    },
    {
      icon: <Settings className="w-5 h-5" />,
      label: 'Settings',
      description: 'Configure options',
      onClick: () => console.log('Settings clicked'),
    },
    {
      icon: <Trash2 className="w-5 h-5" />,
      label: 'Delete',
      description: 'Remove this item',
      onClick: () => console.log('Delete clicked'),
      destructive: true,
    },
  ];

  return (
    <MobileActionSheet
      open={open}
      onOpenChange={setOpen}
      title="Message Actions"
      actions={actions}
    />
  );
}
