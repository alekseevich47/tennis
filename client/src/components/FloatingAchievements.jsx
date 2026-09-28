import React, { useEffect, useMemo, useRef } from 'react';
import { useAchievements } from '../hooks/useAchievements';

const ICON_SIZE = 32;
const ICON_HALF = ICON_SIZE / 2;
/** Зазор вокруг круга аватара (px). */
const AVATAR_PAD = 10;
const SPEED_MIN = 18;
const SPEED_MAX = 42;

/**
 * @param {number} seed
 */
function hashUnit(seed) {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

/**
 * @param {number} min
 * @param {number} max
 * @param {number} seed
 */
function seededRange(min, max, seed) {
  return min + hashUnit(seed) * (max - min);
}

/**
 * @typedef {{
 *   x: number,
 *   y: number,
 *   vx: number,
 *   vy: number,
 *   el: HTMLElement | null
 * }} MedalBody
 */

/**
 * @param {{ userId?: string | null }} props
 */
function FloatingAchievements({ userId }) {
  const { data, isLoading } = useAchievements(userId);
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const bodiesRef = useRef(/** @type {MedalBody[]} */ ([]));
  const rafRef = useRef(0);

  const achievedIcons = useMemo(() => {
    if (!data) return [];
    const icons = [];
    for (const achievement of data) {
      for (const level of achievement.levels) {
        if (level.achieved && level.icon_url) {
          icons.push(level.icon_url);
        }
      }
    }
    return icons;
  }, [data]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || achievedIcons.length === 0) return undefined;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const band = root.parentElement;
    if (!band) return undefined;

    const avatarEl = band.querySelector('.avatar-wrapper-large');
    const wraps = /** @type {HTMLElement[]} */ (
      Array.from(root.querySelectorAll('.floating-achievement-wrap'))
    );

    const measure = () => {
      const bandRect = band.getBoundingClientRect();
      const w = bandRect.width;
      const h = bandRect.height;
      if (w < 8 || h < 8) return null;

      let cx = w / 2;
      let cy = Math.min(h * 0.42, 70);
      let r = 45 + AVATAR_PAD;

      if (avatarEl) {
        const ar = avatarEl.getBoundingClientRect();
        cx = ar.left - bandRect.left + ar.width / 2;
        cy = ar.top - bandRect.top + ar.height / 2;
        r = ar.width / 2 + AVATAR_PAD;
      }

      return { w, h, cx, cy, r };
    };

    const placeAwayFromAvatar = (i, geom) => {
      const angle = (i / Math.max(1, achievedIcons.length)) * Math.PI * 2 + hashUnit(i * 13) * 0.4;
      const dist = geom.r + ICON_HALF + 12 + hashUnit(i * 29) * 28;
      let x = geom.cx + Math.cos(angle) * dist - ICON_HALF;
      let y = geom.cy + Math.sin(angle) * dist - ICON_HALF;
      x = Math.max(0, Math.min(geom.w - ICON_SIZE, x));
      y = Math.max(0, Math.min(geom.h - ICON_SIZE, y));
      return { x, y };
    };

    const geom0 = measure();
    if (!geom0) return undefined;

    bodiesRef.current = wraps.map((el, i) => {
      const { x, y } = placeAwayFromAvatar(i, geom0);
      const speed = seededRange(SPEED_MIN, SPEED_MAX, i * 7 + 1);
      const dir = seededRange(0, Math.PI * 2, i * 11 + 3);
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      return {
        x,
        y,
        vx: Math.cos(dir) * speed,
        vy: Math.sin(dir) * speed,
        el
      };
    });

    if (reduceMotion) {
      return undefined;
    }

    let last = performance.now();

    const bounceCircle = (body, geom) => {
      const mx = body.x + ICON_HALF;
      const my = body.y + ICON_HALF;
      const dx = mx - geom.cx;
      const dy = my - geom.cy;
      const dist = Math.hypot(dx, dy);
      const minDist = geom.r + ICON_HALF;
      if (dist >= minDist || dist < 1e-6) return;

      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      body.x += nx * overlap;
      body.y += ny * overlap;

      const vn = body.vx * nx + body.vy * ny;
      if (vn < 0) {
        body.vx -= 2 * vn * nx;
        body.vy -= 2 * vn * ny;
      }
    };

    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const geom = measure();
      if (!geom) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      for (const body of bodiesRef.current) {
        if (!body.el) continue;
        body.x += body.vx * dt;
        body.y += body.vy * dt;

        if (body.x <= 0) {
          body.x = 0;
          body.vx = Math.abs(body.vx);
        } else if (body.x >= geom.w - ICON_SIZE) {
          body.x = geom.w - ICON_SIZE;
          body.vx = -Math.abs(body.vx);
        }

        if (body.y <= 0) {
          body.y = 0;
          body.vy = Math.abs(body.vy);
        } else if (body.y >= geom.h - ICON_SIZE) {
          body.y = geom.h - ICON_SIZE;
          body.vy = -Math.abs(body.vy);
        }

        bounceCircle(body, geom);
        body.el.style.transform = `translate3d(${body.x}px, ${body.y}px, 0)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    const onResize = () => {
      const geom = measure();
      if (!geom) return;
      for (let i = 0; i < bodiesRef.current.length; i++) {
        const body = bodiesRef.current[i];
        const { x, y } = placeAwayFromAvatar(i, geom);
        body.x = x;
        body.y = y;
        if (body.el) body.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      bodiesRef.current = [];
    };
  }, [achievedIcons]);

  if (!userId || isLoading || achievedIcons.length === 0) {
    return null;
  }

  return (
    <div className="floating-achievements" aria-hidden="true" ref={rootRef}>
      {achievedIcons.map((iconUrl, index) => (
        <span key={`${iconUrl}-${index}`} className="floating-achievement-wrap">
          <img src={iconUrl} alt="" className="floating-achievement-icon" />
        </span>
      ))}
    </div>
  );
}

export default FloatingAchievements;
