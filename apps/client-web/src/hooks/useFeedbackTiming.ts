import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface FeedbackTracking {
  feedback_count: number;
  first_feedback_submitted_at: string | null;
  second_feedback_submitted_at: string | null;
  dismissed_count: number;
}

interface UseFeedbackTimingResult {
  shouldShowFeedback: boolean;
  handleFeedbackSubmitted: () => Promise<void>;
  handleFeedbackDismissed: () => Promise<void>;
  isLoading: boolean;
}

export function useFeedbackTiming(userMessageCount: number): UseFeedbackTimingResult {
  const { user } = useAuth();
  const [shouldShowFeedback, setShouldShowFeedback] = useState(false);
  const [tracking, setTracking] = useState<FeedbackTracking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    fetchFeedbackTracking();
  }, [user]);

  useEffect(() => {
    if (!tracking || userMessageCount < 1) {
      setShouldShowFeedback(false);
      return;
    }

    checkShouldShowFeedback();
  }, [userMessageCount, tracking]);

  const fetchFeedbackTracking = async () => {
    if (!user) return;

    // Demo mode: Skip DB operations for demo user
    const DEMO_USER_UUID = '00000000-0000-0000-0000-000000000001';
    if (user.id === DEMO_USER_UUID) {
      console.warn('Demo mode: Skipping feedback tracking database operations');
      setTracking({
        feedback_count: 0,
        dismissed_count: 0,
        first_feedback_submitted_at: null,
        second_feedback_submitted_at: null,
      });
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('feedback_tracking')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching feedback tracking:', error);
        return;
      }

      if (!data) {
        // Create initial tracking record
        const { data: newTracking, error: insertError } = await supabase
          .from('feedback_tracking')
          .insert({
            user_id: user.id,
            feedback_count: 0,
            dismissed_count: 0,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating feedback tracking:', insertError);
          return;
        }

        setTracking(newTracking as FeedbackTracking);
      } else {
        setTracking(data as FeedbackTracking);
      }
    } catch (error) {
      console.error('Unexpected error in fetchFeedbackTracking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkShouldShowFeedback = () => {
    if (!tracking) return;

    // Only show once: after first conversation and never interacted with feedback before
    if (
      tracking.feedback_count === 0 && 
      tracking.dismissed_count === 0 && 
      userMessageCount >= 1
    ) {
      setShouldShowFeedback(true);
      return;
    }

    // Never show again if user has submitted feedback or dismissed it
    setShouldShowFeedback(false);
  };

  const handleFeedbackSubmitted = async () => {
    if (!user || !tracking) return;

    // Demo mode: Skip DB operations
    const DEMO_USER_UUID = '00000000-0000-0000-0000-000000000001';
    if (user.id === DEMO_USER_UUID) {
      setShouldShowFeedback(false);
      return;
    }

    try {
      const updates: Partial<FeedbackTracking> = {
        feedback_count: tracking.feedback_count + 1,
      };

      if (tracking.feedback_count === 0) {
        updates.first_feedback_submitted_at = new Date().toISOString();
      } else if (tracking.feedback_count === 1) {
        updates.second_feedback_submitted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('feedback_tracking')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating feedback tracking:', error);
        return;
      }

      // Update local state
      setTracking({
        ...tracking,
        ...updates,
      } as FeedbackTracking);

      setShouldShowFeedback(false);
    } catch (error) {
      console.error('Unexpected error in handleFeedbackSubmitted:', error);
    }
  };

  const handleFeedbackDismissed = async () => {
    if (!user || !tracking) return;

    // Demo mode: Skip DB operations
    const DEMO_USER_UUID = '00000000-0000-0000-0000-000000000001';
    if (user.id === DEMO_USER_UUID) {
      setShouldShowFeedback(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('feedback_tracking')
        .update({
          dismissed_count: tracking.dismissed_count + 1,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating dismissed count:', error);
        return;
      }

      setTracking({
        ...tracking,
        dismissed_count: tracking.dismissed_count + 1,
      });

      setShouldShowFeedback(false);
    } catch (error) {
      console.error('Unexpected error in handleFeedbackDismissed:', error);
    }
  };

  return {
    shouldShowFeedback,
    handleFeedbackSubmitted,
    handleFeedbackDismissed,
    isLoading,
  };
}
