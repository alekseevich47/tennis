// @ts-check
import React from 'react';
import Modal from '../../components/ui/Modal';
import { getLegalDocument } from './legalDocuments';
import './LegalConsentFields.css';

/**
 * @param {{
 *   docId: import('./legalDocuments').LegalDocId | null,
 *   isOpen: boolean,
 *   onClose: () => void,
 *   overlayClassName?: string
 * }} props
 */
export default function LegalDocumentModal({ docId, isOpen, onClose, overlayClassName }) {
  const doc = docId ? getLegalDocument(docId) : null;

  return (
    <Modal
      isOpen={Boolean(isOpen && doc)}
      onClose={onClose}
      title={doc?.title || 'Документ'}
      ariaLabel={doc?.title || 'Юридический документ'}
      overlayClassName={overlayClassName}
      className="legal-doc-modal"
      size="tall"
    >
      {doc ? (
        <div className="legal-doc-body">
          {doc.sections.map((section, index) => (
            <section key={index} className="legal-doc-section">
              {section.heading ? <h3 className="legal-doc-heading">{section.heading}</h3> : null}
              {section.paragraphs.map((paragraph, pIndex) => (
                <p key={pIndex} className="legal-doc-paragraph">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      ) : null}
    </Modal>
  );
}
