// @ts-check
import React, { useState } from 'react';
import { LEGAL_DOCUMENTS } from './legalDocuments';
import LegalDocumentModal from './LegalDocumentModal';
import './LegalConsentFields.css';

/**
 * @typedef {import('./legalDocuments').LegalDocId} LegalDocId
 * @typedef {{ terms: boolean, privacy: boolean, publicity: boolean }} LegalConsentState
 */

/**
 * @param {{
 *   value: LegalConsentState,
 *   onChange: (next: LegalConsentState) => void,
 *   disabled?: boolean,
 *   modalOverlayClassName?: string,
 *   idPrefix?: string
 * }} props
 */
export default function LegalConsentFields({
  value,
  onChange,
  disabled = false,
  modalOverlayClassName,
  idPrefix = 'legal'
}) {
  const [openDocId, setOpenDocId] = useState(/** @type {LegalDocId | null} */ (null));

  /**
   * @param {LegalDocId} id
   * @param {boolean} checked
   */
  const setFlag = (id, checked) => {
    if (disabled) return;
    if (id === 'terms') onChange({ ...value, terms: checked });
    else if (id === 'privacy') onChange({ ...value, privacy: checked });
    else onChange({ ...value, publicity: checked });
  };

  /**
   * @param {LegalDocId} id
   * @returns {boolean}
   */
  const isChecked = (id) => {
    if (id === 'terms') return value.terms;
    if (id === 'privacy') return value.privacy;
    return value.publicity;
  };

  return (
    <>
      <div className="legal-consent-fields" role="group" aria-label="Согласия">
        {LEGAL_DOCUMENTS.map((doc) => {
          const inputId = `${idPrefix}-${doc.id}`;
          return (
            <label key={doc.id} className="legal-consent-row" htmlFor={inputId}>
              <input
                id={inputId}
                type="checkbox"
                className="legal-consent-checkbox"
                checked={isChecked(doc.id)}
                disabled={disabled}
                onChange={(e) => setFlag(doc.id, e.target.checked)}
              />
              <span className="legal-consent-label">
                {doc.checkboxLead}{' '}
                <button
                  type="button"
                  className="legal-consent-link"
                  disabled={disabled}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenDocId(doc.id);
                  }}
                >
                  {doc.checkboxLink}
                </button>
              </span>
            </label>
          );
        })}
      </div>

      <LegalDocumentModal
        docId={openDocId}
        isOpen={Boolean(openDocId)}
        onClose={() => setOpenDocId(null)}
        overlayClassName={modalOverlayClassName}
      />
    </>
  );
}

/**
 * @param {LegalConsentState} value
 * @returns {boolean}
 */
export function areLegalConsentsAccepted(value) {
  return Boolean(value?.terms && value?.privacy && value?.publicity);
}
