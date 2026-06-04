import React, { useCallback, useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import IconButton from '../../components/ui/IconButton';
import { isModerator } from '../../services/auth';
import pb from '../../services/pb';
import { error } from '../../lib/log';
import MembershipEditModal from './MembershipEditModal';
import './Profile.css';
import '../trainings/Trainings.css';

function MembershipModal({ isOpen, onClose, user, onMutated }) {
  const [editMode, setEditMode] = useState(null);
  const moderator = isModerator();
  const [availableSessions, setAvailableSessions] = useState(0);
  const [usedSessions, setUsedSessions] = useState(0);

  const fetchMembership = useCallback(async () => {
    if (!user?.id) return;
    try {
      const fresh = await pb.collection('users').getOne(user.id, {
        fields: 'available_sessions,attendance_count'
      });
      setAvailableSessions(Number(fresh.available_sessions ?? 0));
      setUsedSessions(Number(fresh.attendance_count ?? 0));
    } catch (err) {
      error('fetch membership:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isOpen) {
      setEditMode(null);
      return;
    }

    setAvailableSessions(Number(user?.available_sessions ?? 0));
    setUsedSessions(Number(user?.attendance_count ?? 0));
    fetchMembership();
  }, [isOpen, fetchMembership, user?.available_sessions, user?.attendance_count]);

  const applyMembership = (record) => {
    if (!record) return;
    setAvailableSessions(Number(record.available_sessions ?? 0));
    setUsedSessions(Number(record.attendance_count ?? 0));
  };

  const handleMutated = async (updated) => {
    if (updated) {
      applyMembership(updated);
    } else {
      await fetchMembership();
    }
    onMutated?.(updated);
    setEditMode(null);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Абонемент"
        showCloseButton={false}
      >
        <div className="detail-header-row">
          <span className="detail-badge-type">Посещения</span>
          <div className="detail-header-actions">
            {moderator && (
              <>
                <IconButton
                  ariaLabel="Добавить посещения"
                  variant="ghost"
                  size="sm"
                  className="action-circle-btn btn-add-plus membership-add-sessions-btn"
                  onClick={() => setEditMode('add')}
                >
                  <span aria-hidden="true">+</span>
                </IconButton>
                <IconButton
                  ariaLabel="Уменьшить посещения"
                  variant="ghost"
                  size="sm"
                  className="action-circle-btn btn-cancel-cross"
                  onClick={() => setEditMode('subtract')}
                >
                  <span aria-hidden="true">-</span>
                </IconButton>
              </>
            )}
            <IconButton
              type="button"
              className="ui-modal-close"
              ariaLabel="Закрыть"
              onClick={onClose}
            >
              <span aria-hidden="true">✕</span>
            </IconButton>
          </div>
        </div>

        <div className="profile-meta-info">
          <p><strong>Доступные посещения:</strong> {availableSessions}</p>
          <p><strong>Использованные посещения:</strong> {usedSessions}</p>
        </div>
      </Modal>

      <MembershipEditModal
        isOpen={Boolean(editMode)}
        onClose={() => setEditMode(null)}
        user={user}
        mode={editMode}
        onMutated={handleMutated}
      />
    </>
  );
}

export default MembershipModal;
