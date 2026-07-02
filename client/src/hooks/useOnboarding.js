// @ts-check
import { useCallback } from 'react';
import { completeOnboarding as completeOnboardingApi } from '../services/auth';

/**
 * @typedef {import('../services/auth').UserRecord} UserRecord
 */

/**
 * @param {UserRecord | null | undefined} user
 * @param {(updated: UserRecord) => void} [onUpdate]
 */
export function useOnboarding(user, onUpdate) {
  const isOnboarding = Boolean(user && !user.onboarding_completed);
  const canEditName = Boolean(user && !user.name_set_in_onboarding);

  const completeOnboarding = useCallback(async () => {
    if (!user?.id) return;
    const updated = await completeOnboardingApi(user.id);
    onUpdate?.(updated);
    return updated;
  }, [user?.id, onUpdate]);

  return { isOnboarding, completeOnboarding, canEditName };
}
