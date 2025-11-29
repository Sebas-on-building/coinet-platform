import { PredictWidget } from '../../components/analytics/PredictWidget';
import { ModelStatusWidget } from '../../components/analytics/ModelStatusWidget';
import { BatchTrainingWidget } from '../../components/analytics/BatchTrainingWidget';
import { AppleCanvaSolanaTheme } from '../../design-system/themes/AppleCanvaSolanaTheme';
import { useState } from 'react';

export default function PredictPage() {
  const [status, setStatus] = useState('ready');
  const handleTrain = async () => {
    setStatus('training');
    await fetch('/api/v1/analytics/train', { method: 'POST' });
    setStatus('ready');
  };

  return (
    <AppleCanvaSolanaTheme>
      <div className="flex flex-col items-center gap-8 p-12">
        <ModelStatusWidget status={status} />
        <BatchTrainingWidget onTrain={handleTrain} />
        <PredictWidget />
      </div>
    </AppleCanvaSolanaTheme>
  );
} 