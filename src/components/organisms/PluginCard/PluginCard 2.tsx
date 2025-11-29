import React from 'react';
import PluginCardAnalytics from './PluginCardAnalytics/PluginCardAnalytics';
import PluginCardSecurity from './PluginCardSecurity/PluginCardSecurity';
import PluginCardActions from './PluginCardActions/PluginCardActions';
import PluginCardMeta from './PluginCardMeta/PluginCardMeta';
import PluginCardVersioning from './PluginCardVersioning/PluginCardVersioning';
import PluginCardCollab from './PluginCardCollab/PluginCardCollab';
import PluginCardReview from './PluginCardReview/PluginCardReview';
import PluginCardChangelog from './PluginCardChangelog/PluginCardChangelog';
import PluginCardDependencies from './PluginCardDependencies/PluginCardDependencies';
import PluginCardCompatibility from './PluginCardCompatibility/PluginCardCompatibility';
import PluginCardFavorite from './PluginCardFavorite/PluginCardFavorite';
import PluginCardShare from './PluginCardShare/PluginCardShare';
import PluginCardFork from './PluginCardFork/PluginCardFork';
import PluginCardPreview from './PluginCardPreview/PluginCardPreview';
import PluginCardDocs from './PluginCardDocs/PluginCardDocs';
import PluginCardSupport from './PluginCardSupport/PluginCardSupport';
import PluginCardFeedback from './PluginCardFeedback/PluginCardFeedback';
import PluginCardRoadmap from './PluginCardRoadmap/PluginCardRoadmap';
import PluginCardAI from './PluginCardAI/PluginCardAI';
import PluginCardAccessibility from './PluginCardAccessibility/PluginCardAccessibility';
import PluginCardTheming from './PluginCardTheming/PluginCardTheming';
import PluginCardExtensibility from './PluginCardExtensibility/PluginCardExtensibility';
import PluginCardAPIDocs from './PluginCardAPIDocs/PluginCardAPIDocs';
import PluginCardLiveDemo from './PluginCardLiveDemo/PluginCardLiveDemo';
import PluginCardOnboarding from './PluginCardOnboarding/PluginCardOnboarding';
import PluginCardAudit from './PluginCardAudit/PluginCardAudit';
import PluginCardRBAC from './PluginCardRBAC/PluginCardRBAC';
import PluginCardRollback from './PluginCardRollback/PluginCardRollback';
import PluginCardVersionDiff from './PluginCardVersionDiff/PluginCardVersionDiff';
import PluginCardLiveSync from './PluginCardLiveSync/PluginCardLiveSync';
import PluginCardHotReload from './PluginCardHotReload/PluginCardHotReload';
import styles from './PluginCard.module.css';

export interface PluginCardProps {
  plugin: any;
  onInstall?: (plugin: any) => void;
  onFavorite?: (plugin: any) => void;
  onShare?: (plugin: any) => void;
  onFork?: (plugin: any) => void;
  onReport?: (plugin: any) => void;
  // ... extensible props for future features
}

const PluginCard: React.FC<PluginCardProps> = ({ plugin, ...actions }) => {
  return (
    <div className={styles.root}>
      <PluginCardMeta plugin={plugin} />
      <PluginCardPreview plugin={plugin} />
      <PluginCardActions plugin={plugin} {...actions} />
      <PluginCardAnalytics plugin={plugin} />
      <PluginCardSecurity plugin={plugin} />
      <PluginCardVersioning plugin={plugin} />
      <PluginCardCollab plugin={plugin} />
      <PluginCardReview plugin={plugin} />
      <PluginCardChangelog plugin={plugin} />
      <PluginCardDependencies plugin={plugin} />
      <PluginCardCompatibility plugin={plugin} />
      <PluginCardFavorite plugin={plugin} />
      <PluginCardShare plugin={plugin} />
      <PluginCardFork plugin={plugin} />
      <PluginCardDocs plugin={plugin} />
      <PluginCardSupport plugin={plugin} />
      <PluginCardFeedback plugin={plugin} />
      <PluginCardRoadmap plugin={plugin} />
      <PluginCardAI plugin={plugin} />
      <PluginCardAccessibility plugin={plugin} />
      <PluginCardTheming plugin={plugin} />
      <PluginCardExtensibility plugin={plugin} />
      <PluginCardAPIDocs plugin={plugin} />
      <PluginCardLiveDemo plugin={plugin} />
      <PluginCardOnboarding plugin={plugin} />
      <PluginCardAudit plugin={plugin} />
      <PluginCardRBAC plugin={plugin} />
      <PluginCardRollback plugin={plugin} />
      <PluginCardVersionDiff plugin={plugin} />
      <PluginCardLiveSync plugin={plugin} />
      <PluginCardHotReload plugin={plugin} />
    </div>
  );
};

export default PluginCard; 