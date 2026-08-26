import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import ProfileViewModal from '../features/profile/ProfileViewModal';

/**
 * @typedef {{
 *   collection: 'posts' | 'tournament_posts',
 *   postId: string
 * }} MentionPostTarget
 *
 * @typedef {{
 *   openUserProfile: (user: { id: string, full_name?: string, [key: string]: unknown } | string) => void,
 *   openPostMention: (payload: { source: 'feed' | 'tournament', postId: string }) => void,
 *   postTarget: MentionPostTarget | null,
 *   clearPostTarget: () => void
 * }} MentionNavApi
 */

const MentionNavContext = createContext(/** @type {MentionNavApi | null} */ (null));

/**
 * Навигация по @-упоминаниям: профиль и модалка публикации (лента / турнир).
 * @param {{
 *   children: React.ReactNode,
 *   currentUser: any,
 *   onOpenFeedPost: (postId: string) => void,
 *   onOpenTournamentPost: (postId: string) => void
 * }} props
 */
export function MentionNavProvider({
  children,
  currentUser,
  onOpenFeedPost,
  onOpenTournamentPost
}) {
  const [viewingUser, setViewingUser] = useState(/** @type {any} */ (null));
  const [postTarget, setPostTarget] = useState(/** @type {MentionPostTarget | null} */ (null));

  const openUserProfile = useCallback((userOrId) => {
    if (!userOrId) return;
    if (typeof userOrId === 'string') {
      setViewingUser({ id: userOrId });
      return;
    }
    if (userOrId.id) setViewingUser(userOrId);
  }, []);

  const openPostMention = useCallback(
    ({ source, postId }) => {
      if (!postId) return;
      if (source === 'tournament') {
        onOpenTournamentPost(postId);
        setPostTarget({ collection: 'tournament_posts', postId });
        return;
      }
      onOpenFeedPost(postId);
      setPostTarget({ collection: 'posts', postId });
    },
    [onOpenFeedPost, onOpenTournamentPost]
  );

  const clearPostTarget = useCallback(() => setPostTarget(null), []);

  const value = useMemo(
    () => ({
      openUserProfile,
      openPostMention,
      postTarget,
      clearPostTarget
    }),
    [openUserProfile, openPostMention, postTarget, clearPostTarget]
  );

  return (
    <MentionNavContext.Provider value={value}>
      {children}
      <ProfileViewModal
        isOpen={!!viewingUser}
        onClose={() => setViewingUser(null)}
        targetUser={viewingUser}
        currentUser={currentUser}
      />
    </MentionNavContext.Provider>
  );
}

/** @returns {MentionNavApi | null} */
export function useMentionNav() {
  return useContext(MentionNavContext);
}
