import React, { memo, useMemo } from 'react';
import Avatar from '../../components/ui/Avatar';
import MediaPreviewGrid from '../feed/MediaPreviewGrid';
import TournamentPodium from './TournamentPodium';
import { formatPostDate } from '../../lib/format';
import {
  getMediaThumbUrl,
  getMediaUrl,
  isVideoMediaName,
  mediaNames
} from '../../lib/media';

/**
 * @param {{
 *   post: import('../../services/tournamentPosts').TournamentPostRecord,
 *   players?: any[]
 * }} props
 */
function TournamentPostCard({ post, players = [] }) {
  const participants = Array.isArray(post.participants) ? post.participants : [];

  const playerMap = useMemo(() => {
    const map = new Map();
    players.forEach((player) => map.set(player.id, player));
    return map;
  }, [players]);

  const previewItems = useMemo(() => {
    return mediaNames(post.media).flatMap((filename, index) => {
      const url =
        getMediaThumbUrl(post, 'tournament_posts', filename, '800x0') ||
        getMediaUrl(post, 'tournament_posts', filename);
      if (!url) return [];
      return [{
        key: `${post.id}-${index}`,
        url,
        name: filename,
        isVideo: isVideoMediaName(filename)
      }];
    });
  }, [post]);

  return (
    <article className="tournament-post-card">
      <time className="tournament-post-date" dateTime={post.created}>
        {formatPostDate(post.created)}
      </time>

      {post.content ? <p className="tournament-post-content">{post.content}</p> : null}

      {previewItems.length > 0 ? (
        <MediaPreviewGrid items={previewItems} className="tournament-post-media" />
      ) : null}

      {participants.length > 0 ? (
        <TournamentPodium participants={participants} players={players} />
      ) : null}

      {participants.length > 0 ? (
        <ol className="tournament-results-list">
          {participants.map((participant) => {
            const user = playerMap.get(participant.userId) || {
              id: participant.userId,
              full_name: participant.fullName
            };

            return (
              <li key={participant.userId} className="tournament-results-row">
                <span className="tournament-results-place">{participant.place}</span>
                <Avatar user={user} size="sm" />
                <span className="tournament-results-name">{participant.fullName}</span>
                <span className="tournament-results-points">+{participant.points}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </article>
  );
}

export default memo(TournamentPostCard);
