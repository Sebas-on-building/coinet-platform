import React from 'react';
import { Button } from '../../../../../../src/components/ui/Button/Button';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';

const UploadButton = () => {
  const { spacing } = useTheme();
  return (
    <Button
      variant="primary"
      style={{ marginTop: spacing.md, minWidth: 120, fontWeight: 600, transition: 'box-shadow 0.2s', boxShadow: '0 2px 8px #0002' }}
      aria-label="Upload a new video"
      onClick={() => alert('Upload modal coming soon!')}
    >
      Upload
    </Button>
  );
};
export default UploadButton; 