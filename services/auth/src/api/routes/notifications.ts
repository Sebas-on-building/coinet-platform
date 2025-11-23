import { Router } from 'express';
import { onboardingStep1, onboardingStep2, onboardingStep3 } from '../../controllers/onboardingController';
import { sendReferralInvite } from '../../controllers/referralController';
import { notifyUser, notifyAdmin } from '../../controllers/adminNotificationController';
import { sendWeeklyReport, sendMonthlyReport } from '../../controllers/analyticsReportController';
import { trackStepCompletion, trackDropOff, getOnboardingStats } from '../../controllers/onboardingAnalyticsController';
import { inviteReferral, acceptReferral, rewardReferral, getReferralStats } from '../../controllers/referralRewardController';
import { getPreferences, updatePreferences, subscribeCategory, unsubscribeCategory } from '../../controllers/notificationPreferenceController';
import { sendNotification, markAsRead, getNotificationStats, abTestNotification } from '../../controllers/notificationEventController';

const router = Router();

// Onboarding sequence
router.post('/onboarding/step1', onboardingStep1);
router.post('/onboarding/step2', onboardingStep2);
router.post('/onboarding/step3', onboardingStep3);

// Onboarding analytics
router.post('/onboarding/analytics/complete', trackStepCompletion);
router.post('/onboarding/analytics/dropoff', trackDropOff);
router.get('/onboarding/analytics/stats', getOnboardingStats);

// Referral
router.post('/referral/invite', sendReferralInvite);
router.post('/referral/inviteReward', inviteReferral);
router.post('/referral/accept', acceptReferral);
router.post('/referral/reward', rewardReferral);
router.get('/referral/stats', getReferralStats);

// Admin notifications
router.post('/admin/user', notifyUser);
router.post('/admin/admin', notifyAdmin);

// Analytics reports
router.post('/analytics/weekly', sendWeeklyReport);
router.post('/analytics/monthly', sendMonthlyReport);

// Notification preferences
router.get('/preferences', getPreferences);
router.post('/preferences/update', updatePreferences);
router.post('/preferences/subscribe', subscribeCategory);
router.post('/preferences/unsubscribe', unsubscribeCategory);

// Notification events (in-app, push, SMS, email)
router.post('/event/send', sendNotification);
router.post('/event/read', markAsRead);
router.get('/event/stats', getNotificationStats);

// A/B testing
router.post('/event/abtest', abTestNotification);

export default router; 