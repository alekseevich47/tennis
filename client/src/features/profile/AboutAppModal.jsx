import React, { useState } from 'react';
import Modal from '../../components/ui/Modal';
import { APP_DISPLAY_VERSION } from '../../lib/appVersion';
import { openExternalLink } from '../../lib/messengerBridge';
import { LEGAL_DOCUMENTS } from '../legal/legalDocuments';
import LegalDocumentModal from '../legal/LegalDocumentModal';
import '../legal/LegalConsentFields.css';

const DEVELOPER_SITE = 'https://loomixx.ru';
const DEVELOPER_EMAIL = 'loomixx.dev@ya.ru';
const TELEGRAM_URL = 'https://t.me/alekseevich47';
const VK_CHAT_URL = 'https://vk.me/alekseevich';

/**
 * @param {string} url
 */
function openExternalUrl(url) {
  openExternalLink(url);
}

/**
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
export default function AboutAppModal({ isOpen, onClose }) {
  const [legalDocId, setLegalDocId] = useState(
    /** @type {import('../legal/legalDocuments').LegalDocId | null} */ (null)
  );

  return (
    <>
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
            <span className="about-app-row__value">{APP_DISPLAY_VERSION ? `v${APP_DISPLAY_VERSION}` : 'v—'}</span>
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

          <div className="about-app-legal">
            {LEGAL_DOCUMENTS.map((doc) => (
              <button
                key={doc.id}
                type="button"
                className="about-app-legal__btn"
                onClick={() => setLegalDocId(doc.id)}
              >
                <span>{doc.title}</span>
                <span className="about-app-legal__arrow" aria-hidden="true">
                  ›
                </span>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <LegalDocumentModal
        docId={legalDocId}
        isOpen={Boolean(legalDocId)}
        onClose={() => setLegalDocId(null)}
        overlayClassName="ui-modal-overlay--above-about-app"
      />
    </>
  );
}
