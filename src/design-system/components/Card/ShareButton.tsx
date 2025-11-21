import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShareModal } from './ShareModal';

export interface ShareButtonProps {
  url: string;
  title?: string;
  data?: any;
  ariaLabel?: string;
  onShare?: () => void;
  className?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ url, title = 'Share', data, ariaLabel = 'Share event', onShare, className }) => {
  const [showModal, setShowModal] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        onShare?.();
      } catch (err) {
        // fallback to modal if user cancels or error
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <motion.button
        type="button"
        aria-label={ariaLabel}
        onClick={handleShare}
        className={className}
        whileTap={{ scale: 0.92 }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          marginRight: 6,
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: 8,
          transition: 'background 0.18s',
          color: 'var(--color-accent-blue)',
        }}
        tabIndex={0}
      >
        <motion.svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" initial={false} animate={{ scale: showModal ? 1.18 : 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }} aria-hidden="true">
          <motion.path d="M12 3v10m0 0l3.5-3.5M12 13l-3.5-3.5M5 19h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </motion.button>
      {showModal && <ShareModal url={url} title={title} data={data} onClose={() => setShowModal(false)} />}
    </>
  );
}; 