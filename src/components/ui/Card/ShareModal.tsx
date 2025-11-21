import React from 'react';
import { Modal } from '../Modal';
import { motion } from 'framer-motion';

export interface ShareModalProps {
  url: string;
  title?: string;
  data?: any;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ url, title = 'Share', data, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Modal open={true} onClose={onClose} title={title} size="sm" animation="scale" overlay closeButton aria-label="Share Modal">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', padding: 8 }}>
        <div style={{ width: '100%', textAlign: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-secondary)' }}>Share this event</span>
        </div>
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.22 }}
          style={{
            background: 'var(--color-surface-glass)',
            borderRadius: 12,
            padding: 12,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <input
            value={url}
            readOnly
            style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--color-text)', fontSize: 14, outline: 'none' }}
            aria-label="Share link"
          />
          <button onClick={handleCopy} style={{ borderRadius: 8, padding: '6px 14px', fontWeight: 700, background: 'var(--color-accent-blue)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }} aria-label="Copy link">{copied ? 'Copied!' : 'Copy'}</button>
        </motion.div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Twitter" style={iconBtn}><span>🐦</span></a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook" style={iconBtn}><span>📘</span></a>
          <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn" style={iconBtn}><span>💼</span></a>
          {/* TODO: Add more social, QR code, etc. */}
        </div>
      </div>
    </Modal>
  );
};

const iconBtn: React.CSSProperties = {
  background: 'var(--color-surface)',
  borderRadius: 8,
  padding: 8,
  fontSize: 20,
  color: 'var(--color-accent-blue)',
  border: '1px solid var(--color-border)',
  cursor: 'pointer',
  transition: 'background 0.18s, color 0.18s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}; 