import React from 'react';
import Modal from '../../components/ui/Modal';

const DEVELOPER_SITE = 'https://loomixx.ru';
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
        <div className="about-app-row">
          <span className="about-app-row__label">Версия приложения:</span>
          <span className="about-app-row__value">v1.0</span>
        </div>

        <div className="about-app-row">
          <span className="about-app-row__label">Разработка:</span>
          <a
            className="about-app-row__value about-app-row__value--action"
            href={DEVELOPER_SITE}
            onClick={(e) => {
              e.preventDefault();
              openExternalUrl(DEVELOPER_SITE);
            }}
          >
            loomixx.ru
          </a>
        </div>

        <div className="about-app-row">
          <span className="about-app-row__label">Почта:</span>
          <a
            className="about-app-row__value about-app-row__value--action"
            href={`mailto:${DEVELOPER_EMAIL}`}
            onClick={(e) => {
              e.preventDefault();
              openExternalUrl(`mailto:${DEVELOPER_EMAIL}`);
            }}
          >
            {DEVELOPER_EMAIL}
          </a>
        </div>

        <div className="about-app-row">
          <span className="about-app-row__label">Telegram:</span>
          <a
            className="about-app-row__value about-app-row__value--action"
            href={TELEGRAM_URL}
            onClick={(e) => {
              e.preventDefault();
              openExternalUrl(TELEGRAM_URL);
            }}
          >
            @alekseevich47
          </a>
        </div>

        <div className="about-app-row">
          <span className="about-app-row__label">ВК:</span>
          <a
            className="about-app-row__value about-app-row__value--action"
            href={VK_CHAT_URL}
            onClick={(e) => {
              e.preventDefault();
              openExternalUrl(VK_CHAT_URL);
            }}
          >
            @alekseevich
          </a>
        </div>
      </div>
    </Modal>
  );
}
