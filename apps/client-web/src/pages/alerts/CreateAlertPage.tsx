import { AlertForm } from '../../components/alerts/AlertForm';
import { AppleCanvaSolanaTheme } from '../../design-system/themes/AppleCanvaSolanaTheme';

export default function CreateAlertPage() {
  return (
    <AppleCanvaSolanaTheme>
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <AlertForm />
      </div>
    </AppleCanvaSolanaTheme>
  );
} 