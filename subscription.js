/**
 * subscription.js
 *
 * Single source of truth for uboth+ status.
 *
 * Architecture: premium is stored at `couples/{coupleId}/premium` in Firebase RTDB.
 * One partner buys → write true to that path → both partners unlock instantly
 * via the live onValue listener here. No device-local state; no sync issues.
 *
 * To wire RevenueCat later:
 *   1. Install react-native-purchases
 *   2. On successful purchase, call: set(ref(database, `couples/${coupleId}/premium`), true)
 *   3. Nothing else changes — this hook handles the rest for both partners.
 */

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from './firebaseConfig';

/**
 * useSubscription(coupleId)
 * Returns { isPremium: boolean, loading: boolean }
 *
 * isPremium is false for all users until RevenueCat is wired.
 * loading is true only on the initial Firebase read.
 */
export function useSubscription(coupleId) {
  // TODO: revert to false when RevenueCat is wired
  const [isPremium, setIsPremium] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coupleId) {
      setLoading(false);
      return;
    }

    // onValue (live listener) so both partners unlock the moment
    // one person purchases — no app restart required.
    const unsubscribe = onValue(
      ref(database, `couples/${coupleId}/premium`),
      (snap) => {
        setIsPremium(snap.val() === true);
        setLoading(false);
      },
      () => {
        // Firebase unreachable — fail closed (no premium access)
        setIsPremium(false);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [coupleId]);

  return { isPremium, loading };
}
