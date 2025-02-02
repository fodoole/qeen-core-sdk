/**
 * @file utils.ts
 * @description Utility functions for qeen Core SDK.
 */

/**
 * Wrapper for the onload event.
 * @param {Function} fn - function to be executed on load.
 */
export function onLoad(fn: Function): void {
  if (['interactive', 'complete'].includes(document.readyState)) {
    fn();
  } else {
    document.addEventListener('readystatechange', fn as (this: Document, ev: Event) => any, { once: true });
  }
}

/**
 * Wrapper for beforeunload event.
 * @param {Function} fn - function to be executed before the page is unloaded.
 */
export function beforeUnload(fn: Function): void {
  window.addEventListener('beforeunload', function (): void {
    fn();
  }, false);
}

/**
 * @class Debouncer
 * @param {Function} fn - the function to be debounced.
 * @param {number} delay - the time in milliseconds to wait before calling the function.
 * @returns {Debouncer} - an object containing the debounced function, a trigger function, and a clear function.
 * @method debounced - the function to debounce the function.
 * @method trigger - the function to trigger the function immediately.
 * @method clear - the function to clear the timeout.
 * @method flushAll - the function to flush all pending debounced events.
 * @property {Debouncer[]} debouncedEvents - an array of all debounced events.
 * @description After creating a debouncer object, start the timeout through the debounced function. Any extra calls to the debounced function within the delay time will reset the timer and the function will only be called after the delay time has passed without any calls. The debouncer can be forced to trigger immediately by calling the trigger function. The debouncer can be cleared by calling the clear function.
 */
export class Debouncer {
  public _fn: Function;
  public _delay: number;

  static _debouncedEvents: Debouncer[] = [];
  private _timer: number = 0;
  private _context: any | null = null;
  private _args: any[] | null = null;

  constructor(fn: Function, delay: number) {
    this._fn = fn;
    this._delay = delay;
  }

  /**
   * Clear the timeout.
   */
  _clear = (): void => {
    window.clearTimeout(this._timer);
    this._context = null;
    this._args = null;
    const index: number = Debouncer._debouncedEvents.indexOf(this);
    if (index !== -1) {
      Debouncer._debouncedEvents.splice(index, 1);
    }
  }

  /**
   * Debounce the function.
   * @param {...any} args - arguments to be passed to the function.
   */
  _debounced = (...args: any[]): void => {
    this._context = this;
    this._args = args;
    const clearFunc: Function = this._clear;
    window.clearTimeout(this._timer);
    this._timer = window.setTimeout(() => {
      this._fn.apply(this._context, this._args);
      clearFunc();
    }, this._delay);
    const index: number = Debouncer._debouncedEvents.indexOf(this);
    if (index === -1) {
      Debouncer._debouncedEvents.push(this);
    }
  }

  /**
   * Trigger the function immediately.
   */
  _trigger = (): void => {
    if (this._context && this._args) {
      this._fn.apply(this._context, this._args);
    }
    this._clear();
  }

  /**
   * Flush all pending debounced events.
   */
  static _flushAll = (): void => {
    Debouncer._debouncedEvents.forEach(debouncer => {
      debouncer._trigger();
    });
  }
}

/**
 * Function for generating a random 16-digit number.
 * @returns {number} - A random number between `10^15` and `10^16 - 1`.
 */
export function randInt(): number {
  const min: number = Math.pow(10, 15);
  const max: number = Math.pow(10, 16) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Function for limiting a value between a minimum and maximum value.
 * @param {number} value - The value to be limited.
 * @param {number} min - The minimum value.
 * @param {number} max - The maximum value.
 * @returns {number} - The limited value.
 */
export function limit(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
