import { useState } from 'react';
import { AnimatedModal } from '../../ui/Modal/AnimatedModal';
import { CategoryTabs } from '../../atoms/CategoryTabs/CategoryTabs';
import { PluginReadme } from './PluginReadme';
import { PluginChangelog } from './PluginChangelog';
import { PluginReviewList } from './PluginReviewList';
import { PluginReviewForm } from './PluginReviewForm';
import { PluginInstallButton } from './PluginInstallButton';
import { PluginSecurityReport } from './PluginSecurityReport';
import { PluginVersionHistory } from './PluginVersionHistory';
import styles from './PluginDetailModal.module.css';

const TABS = [
  'Readme',
  'Changelog',
  'Reviews',
  'Security',
  'Version History',
];

export function PluginDetailModal({ isOpen, onClose, plugin }) {
  const [tab, setTab] = useState('Readme');
  const [reviews, setReviews] = useState(plugin.reviews || []);

  const handleReviewSubmit = (review) => {
    setReviews([{ user: 'You', rating: review.rating, comment: review.text }, ...reviews]);
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose}>
      <div className={styles.header}>
        <h2>{plugin.name}</h2>
        <PluginInstallButton plugin={plugin} />
      </div>
      <CategoryTabs categories={TABS} active={tab} onChange={setTab} />
      <div className={styles.content}>
        {tab === 'Readme' && <PluginReadme plugin={plugin} />}
        {tab === 'Changelog' && <PluginChangelog plugin={plugin} />}
        {tab === 'Reviews' && (
          <>
            <PluginReviewForm
              onSubmit={handleReviewSubmit}
              aiSuggestions={["Great plugin!", "Needs more features.", "Excellent support."]}
              emojiReactions={["👍", "🚀", "😍", "😎", "🔥"]}
            />
            <PluginReviewList plugin={{ ...plugin, reviews }} />
          </>
        )}
        {tab === 'Security' && <PluginSecurityReport plugin={plugin} />}
        {tab === 'Version History' && <PluginVersionHistory plugin={plugin} />}
      </div>
    </AnimatedModal>
  );
} 