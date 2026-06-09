import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useCart } from '../../context/CartContext';
import './CartIcon.css';

const BASE_Y = -1280;
const ROPE_RESOLUTION = 4;
const ROPE_SOLVER_ITERATIONS = 20;
const ROPE_SIZE = 10;

function lerp(first, second, percentage) {
  return first + (second - first) * percentage;
}

class App {
  constructor(window, canvas, context, updateHandler, drawHandler, frameRate = 60) {
    this._window = window;
    this._canvas = canvas;
    this._context = context;
    this._updateHandler = updateHandler;
    this._drawHandler = drawHandler;
    this._frameRate = frameRate;
    this._lastTime = 0;
    this._currentTime = 0;
    this._deltaTime = 0;
    this._interval = 0;
    this._intervalId = null;
    this.onMouseMoveHandler = () => {};
    this.onMouseDownHandler = () => {};
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this._onMouseEventHandlerWrapper = this._onMouseEventHandlerWrapper.bind(this);
    this._onRequestAnimationFrame = this._onRequestAnimationFrame.bind(this);
  }

  start() {
    this._lastTime = Date.now();
    this._currentTime = 0;
    this._deltaTime = 0;
    this._interval = 1000 / this._frameRate;
    this._canvas.addEventListener(
      'mousemove',
      (e) => this._onMouseEventHandlerWrapper(e, this.onMouseMoveHandler),
      false
    );
    this._canvas.addEventListener(
      'mousedown',
      (e) => this._onMouseEventHandlerWrapper(e, this.onMouseDownHandler),
      false
    );
    this._intervalId = setInterval(() => {
      this._onRequestAnimationFrame();
    }, 30);
  }

  stop() {
    if (this._intervalId != null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  _onMouseEventHandlerWrapper(e, callback) {
    let element = this._canvas;
    let offsetX = 0;
    let offsetY = 0;
    if (element.offsetParent) {
      do {
        offsetX += element.offsetLeft;
        offsetY += element.offsetTop;
      } while ((element = element.offsetParent));
    }
    callback(e.pageX - offsetX, e.pageY - offsetY);
  }

  _onRequestAnimationFrame() {
    this._currentTime = Date.now();
    this._deltaTime = this._currentTime - this._lastTime;
    if (this._deltaTime > this._interval) {
      const dts = this._deltaTime * 0.001;
      this._updateHandler(dts);
      this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
      this._drawHandler(this._canvas, this._context, dts);
      this._lastTime = this._currentTime - (this._deltaTime % this._interval);
    }
  }
}

class Vector2 {
  static zero() {
    return { x: 0, y: 0 };
  }

  static sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
  }

  static add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
  }

  static mult(a, b) {
    return { x: a.x * b.x, y: a.y * b.y };
  }

  static scale(v, scaleFactor) {
    return { x: v.x * scaleFactor, y: v.y * scaleFactor };
  }

  static mag(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }

  static normalized(v) {
    const mag = Vector2.mag(v);
    if (mag === 0) return Vector2.zero();
    return { x: v.x / mag, y: v.y / mag };
  }
}

class RopePoint {
  static integrate(point, gravity, dt, previousFrameDt) {
    point.velocity = Vector2.sub(point.pos, point.oldPos);
    point.oldPos = { ...point.pos };

    const timeCorrection = previousFrameDt !== 0 ? dt / previousFrameDt : 0;
    const accel = Vector2.add(gravity, { x: 0, y: point.mass });
    const velCoef = timeCorrection * point.damping;
    const accelCoef = dt ** 2;

    point.pos.x += point.velocity.x * velCoef + accel.x * accelCoef;
    point.pos.y += point.velocity.y * velCoef + accel.y * accelCoef;
  }

  static constrain(point) {
    if (point.next) {
      const delta = Vector2.sub(point.next.pos, point.pos);
      const len = Vector2.mag(delta);
      const diff = len - point.distanceToNextPoint;
      const normal = Vector2.normalized(delta);

      if (!point.isFixed) {
        point.pos.x += normal.x * diff * 0.25;
        point.pos.y += normal.y * diff * 0.25;
      }
      if (!point.next.isFixed) {
        point.next.pos.x -= normal.x * diff * 0.25;
        point.next.pos.y -= normal.y * diff * 0.25;
      }
    }
    if (point.prev) {
      const delta = Vector2.sub(point.prev.pos, point.pos);
      const len = Vector2.mag(delta);
      const diff = len - point.distanceToNextPoint;
      const normal = Vector2.normalized(delta);

      if (!point.isFixed) {
        point.pos.x += normal.x * diff * 0.25;
        point.pos.y += normal.y * diff * 0.25;
      }
      if (!point.prev.isFixed) {
        point.prev.pos.x -= normal.x * diff * 0.25;
        point.prev.pos.y -= normal.y * diff * 0.25;
      }
    }
  }

  constructor(initialPos, distanceToNextPoint) {
    this.pos = initialPos;
    this.distanceToNextPoint = distanceToNextPoint;
    this.isFixed = false;
    this.oldPos = { ...initialPos };
    this.velocity = Vector2.zero();
    this.mass = 1;
    this.damping = 1;
    this.prev = null;
    this.next = null;
  }
}

class Rope {
  static generate(start, end, resolution, canvas) {
    const delta = Vector2.sub(end, start);
    const len = Vector2.mag(delta);
    const points = [];
    const pointsLen = len / resolution;

    for (let i = 0; i < pointsLen; i++) {
      const percentage = i / (pointsLen - 1);
      points[i] = new RopePoint(
        {
          x: lerp(start.x, end.x, percentage),
          y: lerp(start.y, end.y, percentage)
        },
        resolution
      );
      points[i].mass = canvas.dataset.mass;
      points[i].damping = canvas.dataset.damping;
    }

    for (let i = 0; i < pointsLen; i++) {
      points[i].prev = i !== 0 ? points[i - 1] : null;
      points[i].next = i !== pointsLen - 1 ? points[i + 1] : null;
    }

    points[0].isFixed = points[points.length - 1].isFixed = true;
    return points;
  }

  constructor(points, solverIterations) {
    this._points = points;
    this._prevDelta = 0;
    this._solverIterations = solverIterations;
    this.update = this.update.bind(this);
    this.getPoint = this.getPoint.bind(this);
  }

  getPoint(index) {
    return this._points[index];
  }

  update(canvas, dt) {
    if (document.hidden) return;

    for (let i = 1; i < this._points.length - 1; i++) {
      RopePoint.integrate(
        this._points[i],
        { x: canvas.dataset.x, y: canvas.dataset.y },
        dt,
        this._prevDelta
      );
    }
    for (let iteration = 0; iteration < this._solverIterations; iteration++) {
      for (let i = 1; i < this._points.length - 1; i++) {
        RopePoint.constrain(this._points[i]);
      }
    }
    this._prevDelta = dt;
  }
}

function drawRopePoints(context, points, color, width) {
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const prev = i > 0 ? points[i - 1] : null;
    if (prev) {
      context.beginPath();
      context.moveTo(prev.pos.x, prev.pos.y);
      context.lineTo(p.pos.x, p.pos.y);
      context.lineWidth = width;
      context.strokeStyle = color;
      context.stroke();
    }
  }
}

function ropeYForCount(count, wasOpen, currentY) {
  if (count === 0) return BASE_Y;
  if (count >= 1 && !wasOpen) return BASE_Y * -0.7;
  return currentY;
}

/**
 * @param {{ onClick?: () => void, className?: string }} props
 */
export default function CartIcon({ onClick, className }) {
  const { totalCount } = useCart();
  const canvasRef = useRef(null);
  const cartRef = useRef(null);
  const ropeRef = useRef(null);
  const pointsRef = useRef(null);
  const appRef = useRef(null);
  const ropeColorRef = useRef('#242836');
  const xRef = useRef(0);
  const yRef = useRef(BASE_Y);
  const prevCountRef = useRef(totalCount);
  const bounceTimersRef = useRef([]);

  const [displayCount, setDisplayCount] = useState(totalCount);
  const [pendingValue, setPendingValue] = useState(null);
  const [pendingPosition, setPendingPosition] = useState(null);
  const [moveClass, setMoveClass] = useState('');
  const [isBounce, setIsBounce] = useState(false);

  const setCanvasOffset = useCallback((x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.dataset.x = String(x);
    canvas.dataset.y = String(y);
    xRef.current = x;
    yRef.current = y;
  }, []);

  const bounceCart = useCallback(() => {
    const y = yRef.current;
    const x = xRef.current;
    setCanvasOffset(-200, y * 3);

    const t1 = setTimeout(() => {
      setCanvasOffset(200, y * 3);
    }, 50);

    setIsBounce(true);

    const t2 = setTimeout(() => {
      setCanvasOffset(x, y);
    }, 100);

    const t3 = setTimeout(() => {
      setIsBounce(false);
    }, 300);

    bounceTimersRef.current.push(t1, t2, t3);
  }, [setCanvasOffset]);

  const runCountAnimation = useCallback(
    (value, minus) => {
      setPendingValue(value);
      setPendingPosition(minus ? 'before' : 'after');
      setMoveClass(minus ? 'moveDown' : 'moveUp');
      bounceCart();

      const timer = setTimeout(() => {
        setDisplayCount(value);
        setMoveClass('');
        setPendingValue(null);
        setPendingPosition(null);
      }, 300);

      bounceTimersRef.current.push(timer);
    },
    [bounceCart]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const cartEl = cartRef.current;
    if (!canvas || !cartEl) return;

    canvas.dataset.x = '0';
    canvas.dataset.y = String(BASE_Y);
    canvas.dataset.mass = '0.8';
    canvas.dataset.damping = '0.8';

    const context = canvas.getContext('2d');
    ropeColorRef.current = getComputedStyle(cartEl)
      .getPropertyValue('--stroke')
      .trim() || '#242836';

    const start = { x: canvas.width / 4, y: canvas.height / 2 };
    const end = { x: canvas.width - canvas.width / 4, y: canvas.height / 2 };
    const points = Rope.generate(start, end, ROPE_RESOLUTION, canvas);
    const rope = new Rope(points, ROPE_SOLVER_ITERATIONS);

    pointsRef.current = points;
    ropeRef.current = rope;

    const tick = (dt) => {
      rope.update(canvas, dt);
    };

    const draw = (_canvas, ctx) => {
      drawRopePoints(ctx, points, ropeColorRef.current, ROPE_SIZE);
    };

    const app = new App(window, canvas, context, tick, draw, 60);
    appRef.current = app;
    app.start();

    if (totalCount >= 1) {
      setCanvasOffset(0, BASE_Y * -0.7);
    }

    return () => {
      app.stop();
      appRef.current = null;
      ropeRef.current = null;
      pointsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rope init once on mount
  }, []);

  useEffect(() => {
    const prev = prevCountRef.current;
    if (prev === totalCount) return;

    const minus = totalCount < prev;
    const wasOpen = prev >= 1;
    const nextY = ropeYForCount(totalCount, wasOpen, yRef.current);
    setCanvasOffset(xRef.current, nextY);

    const delay = totalCount === 1 && !minus ? 300 : 0;
    const timer = setTimeout(() => {
      runCountAnimation(totalCount, minus);
    }, delay);

    prevCountRef.current = totalCount;

    return () => {
      clearTimeout(timer);
      bounceTimersRef.current.forEach(clearTimeout);
      bounceTimersRef.current = [];
    };
  }, [totalCount, runCountAnimation, setCanvasOffset]);

  const isOpen = totalCount >= 1;
  const isCounted = totalCount !== 0;

  return (
    <button
      type="button"
      className={clsx('cart-icon-btn', className)}
      onClick={onClick}
      aria-label={`Корзина${totalCount > 0 ? `, ${totalCount} товаров` : ''}`}
    >
      <div
        ref={cartRef}
        className={clsx(
          'shopping-cart',
          isOpen && 'open',
          isCounted && 'counted',
          isBounce && 'bounce'
        )}
        aria-hidden="true"
      >
        <div className="bag">
          <div className="front">
            <div className="inner" />
            <canvas
              ref={canvasRef}
              width={240}
              height={240}
              data-x="0"
              data-y={String(BASE_Y)}
              data-mass="0.8"
              data-damping="0.8"
            />
          </div>
          <div className="back" />
        </div>
        <div className={clsx('count', moveClass)}>
          <div>
            {pendingPosition === 'before' && (
              <span className="before">{pendingValue}</span>
            )}
            <span className="current">{displayCount}</span>
            {pendingPosition === 'after' && (
              <span className="after">{pendingValue}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
