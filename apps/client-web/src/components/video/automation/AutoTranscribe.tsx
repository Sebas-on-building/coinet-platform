import React, { useState } from 'react';
import { Card } from '../../../../../../src/components/ui/Card/Card';
import { Button } from '../../../../../../src/components/ui/Button/Button';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';

const AutoTranscribe = () => {
  const { spacing, radii, shadows, typography } = useTheme();
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const handleTranscribe = () => {
    setTranscribing(true);
    setTimeout(() => {
      setTranscript('This is an auto-generated transcript of your video.');
      setTranscribing(false);
    }, 2000);
  };
  return (
    <Card style={{ borderRadius: radii.md, boxShadow: shadows.sm, padding: spacing.md, minWidth: 320 }}>
      <div style={{ ...typography.h4, marginBottom: spacing.sm }}>Auto Transcribe</div>
      <Button variant="primary" onClick={handleTranscribe} disabled={transcribing} style={{ marginBottom: spacing.sm }}>
        {transcribing ? 'Transcribing...' : 'Generate Transcript'}
      </Button>
      {transcript && <div style={{ ...typography.body, background: '#f3f4f6', borderRadius: 8, padding: spacing.sm }}>{transcript}</div>}
    </Card>
  );
};
export default AutoTranscribe; 