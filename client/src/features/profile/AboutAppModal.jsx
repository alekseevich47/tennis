import React, { useCallback } from 'react';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/ToastContext';
import { MAX_SELLER_URL } from '../../config';
import {
  BUY_MOBILE_TOAST_ACTION_LABEL,
  isMobileMaxPlatform,
  openSellerChat
} from '../shop/buyMessage';

const DEVELOPER_EMAIL = 'loomixx.dev@ya.ru';
const TELEGRAM_URL = 'https://t.me/alekseevich47';
const VK_CHAT_URL = 'https://vk.me/alekseevich';

/**
 * @param {string} url
 */
function openExternalUrl(url) {
  const webApp = window.WebApp;
  if (webApp?.openLink) {
    webApp.openLink(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
export default function AboutAppModal({ isOpen, onClose }) {
  const { showToast } = useToast();

  const handleAdminChat = useCallback(() => {
    if (isMobileMaxPlatform()) {
      showToast({
        text: 'Чат с администратором',
        actionLabel: BUY_MOBILE_TOAST_ACTION_LABEL,
        onAction: () => openSellerChat(MAX_SELLER_URL)
      });
      return;
    }
    openSellerChat(MAX_SELLER_URL);
  }, [showToast]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="О приложении"
      ariaLabel="О приложении"
      overlayClassName="about-app-overlay"
      className="about-app-sheet"
    >
      <div className="about-app-body">
        <section className="about-app-section">
          <h3 className="about-app-label">Связь с администрацией</h3>
          <button
            type="button"
            className="about-app-chip about-app-chip--action"
            onClick={handleAdminChat}
          >
            Илья Миленький
          </button>
        </section>

        <section className="about-app-section">
          <h3 className="about-app-label">Версия приложения</h3>
          <span className="about-app-chip">v1.0</span>
        </section>

        <section className="about-app-section">
          <h3 className="about-app-label">Разработка приложения</h3>
          <p className="about-app-developer">loomixx</p>
          <div className="about-app-dev-links">
            <a
              className="about-app-chip about-app-chip--action"
              href={`mailto:${DEVELOPER_EMAIL}`}
              onClick={(e) => {
                e.preventDefault();
                openExternalUrl(`mailto:${DEVELOPER_EMAIL}`);
              }}
            >
              Почта: {DEVELOPER_EMAIL}
            </a>
            <a
              className="about-app-chip about-app-chip--action"
              href={TELEGRAM_URL}
              onClick={(e) => {
                e.preventDefault();
                openExternalUrl(TELEGRAM_URL);
              }}
            >
              Telegram: @alekseevich47
            </a>
            <a
              className="about-app-chip about-app-chip--action"
              href={VK_CHAT_URL}
              onClick={(e) => {
                e.preventDefault();
                openExternalUrl(VK_CHAT_URL);
              }}
            >
              ВК: @alekseevich
            </a>
          </div>
        </section>
      </div>
    </Modal>
  );
}
