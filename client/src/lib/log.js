// @ts-check
// Тонкая обёртка над console: в production молчим (L1), в dev — выводим.

import { IS_DEV } from '../config';

const noop = () => {};

export const log = IS_DEV ? console.log.bind(console) : noop;
export const warn = IS_DEV ? console.warn.bind(console) : noop;

// Ошибки всегда логируем — даже в проде они нужны для удалённой диагностики.
export const error = console.error.bind(console);
