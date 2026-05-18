import PostHog from 'posthog-react-native';

let client = null;

export function initAnalytics() {
  const key = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  if (!key) return;
  client = new PostHog(key, {
    host: 'https://us.i.posthog.com',
    disabled: __DEV__,
  });
}

export function identify(userId) {
  client?.identify(userId);
}

export function track(event, properties = {}) {
  client?.capture(event, properties);
}

// ── Named events ──────────────────────────────────────────────────────────────

export const Events = {
  ONBOARDING_COMPLETE:  'onboarding_complete',
  NAME_SUBMITTED:       'name_submitted',
  EMAIL_CAPTURED:       'email_captured',
  EMAIL_SKIPPED:        'email_skipped',
  PAIRED:               'paired',
  SESSION_STARTED:      'session_started',
  SESSION_ABANDONED:    'session_abandoned',  // exited during meditation
  SESSION_COMPLETED:    'session_completed',  // finished full flow
  MOOD_SELECTED:        'mood_selected',
  APPRECIATION_SENT:    'appreciation_sent',
  PAYWALL_VIEWED:       'paywall_viewed',
};
