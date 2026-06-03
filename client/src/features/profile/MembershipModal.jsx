import React, { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import IconButton from '../../components/ui/IconButton';
import { isModerator } from '../../services/auth';
import MembershipEditModal from './MembershipEditModal';
import './Profile.css';
import '../trainings/Trainings.css';

function MembershipModal({ isOpen, onClose, user, onMutated }) {
  const [editMode, setEditMode] = useState(null);
  const moderator = isModerator();
  const availableSessions = user?.available_sessions ?? 0;
  const usedSessions = user?.attendance_count ?? 0;

  useEffect(() => {
    if (!isOpen) setEditMode(null);
  }, [isOpen]);

  const handleMutated = () => {
    onMutated?.();
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
