import React from 'react';
import { Card } from '@/components/ui/Card/Card';

const Overlays = React.memo(() => (
  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
    {/* Example overlay: watermark */}
    <div style={{ position: 'absolute', bottom: 16, right: 16, opacity: 0.2, fontSize: 24, fontWeight: 700, color: 'white' }}>
      COINET
    </div>
    {/* More overlays (e.g., AI, analytics, subtitles) can be added here */}
  </div>
));

export default Overlays; 