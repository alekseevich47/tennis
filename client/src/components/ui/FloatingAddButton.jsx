// @ts-check
import clsx from 'clsx';
import { usePullToRefreshState } from './PullToRefresh';
import './FloatingAddButton.css';

/**
 * FAB «Добавить»: sticky + hide/show по скроллу; при PTR держится у верха
 * (компенсация offset), на время refresh плавно скрывается.
 *
 * variant:
 * - `glass` — https://codepen.io/Petr-Knoll/pen/QwWLZdx (Лента / Магазин)
 * - `liquid` — https://codepen.io/lucasromerodb/pen/vEOWpYM (Турнир-Лента)
 *
 * @param {{
 *   visible?: boolean,
 *   onClick?: () => void,
 *   children?: React.ReactNode,
 *   className?: string,
 *   ariaLabel?: string,
 *   variant?: 'glass' | 'liquid'
 * }} props
 */
export default function FloatingAddButton({
  visible = true,
  onClick,
  children = 'Добавить',
  className,
  ariaLabel = 'Добавить',
  variant = 'glass'
}) {
  const { offset, refreshing, springing } = usePullToRefreshState();
  const show = Boolean(visible) && !refreshing;
  const isLiquid = variant === 'liquid';

  return (
    <div
      className={clsx('floating-btn-wrapper', offset > 0 && 'floating-btn-wrapper--ptr')}
      style={{
        marginTop: offset > 0 ? -offset : 0,
        transition: springing
          ? 'margin-top 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)'
          : undefined
      }}
    >
      <div
        className={clsx(
          'floating-add-btn-wrap',
          isLiquid && 'floating-add-btn-wrap--liquid',
          show ? 'is-visible' : 'is-hidden',
          className
        )}
      >
        {isLiquid ? (
          <svg
            className="floating-add-btn__svg-defs"
            width="0"
            height="0"
            aria-hidden="true"
            focusable="false"
          >
            <filter
              id="fab-glass-distortion"
              x="0%"
              y="0%"
              width="100%"
              height="100%"
              filterUnits="objectBoundingBox"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.01 0.01"
                numOctaves="1"
                seed="5"
                result="turbulence"
              />
              <feComponentTransfer in="turbulence" result="mapped">
                <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
                <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
                <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
              </feComponentTransfer>
              <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
              <feSpecularLighting
                in="softMap"
                surfaceScale="5"
                specularConstant="1"
                specularExponent="100"
                lightingColor="white"
                result="specLight"
              >
                <fePointLight x="-200" y="-200" z="300" />
              </feSpecularLighting>
              <feComposite
                in="specLight"
                operator="arithmetic"
                k1="0"
                k2="1"
                k3="1"
                k4="0"
                result="litImage"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="softMap"
                scale="120"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </svg>
        ) : (
          <span className="floating-add-btn__shadow" aria-hidden="true" />
        )}

        <button
          type="button"
          className={clsx(
            'floating-add-btn',
            isLiquid ? 'floating-add-btn--liquid' : 'floating-add-btn--glass'
          )}
          aria-label={ariaLabel}
          onClick={onClick}
        >
          {isLiquid ? (
            <>
              <span className="floating-add-btn__effect" aria-hidden="true" />
              <span className="floating-add-btn__tint" aria-hidden="true" />
              <span className="floating-add-btn__shine" aria-hidden="true" />
            </>
          ) : null}
          <span className="floating-add-btn__label">{children}</span>
        </button>
      </div>
    </div>
  );
}
