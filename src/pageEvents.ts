/**
 * @file pageEvents.ts
 * @description The page events script for qeen Core SDK.
 */

import { Config, State } from './config';
import { PageAnalyticsEvent, InteractionEvent } from './models';
import { InvalidParameterError } from './errors';
import { resetSession, BindQueueItem } from './sessionManager';
import { Debouncer } from './utils';

/**
 * Function for binding click events to DOM elements.
 * Accepts a single click event object or an array of click event objects.
 * @param {InteractionEvent | InteractionEvent[] | any | any[]} clickEvents - A click event object or an array of click event objects.
 * @throws {InvalidParameterError} Throws an error if the provided parameters are invalid.
 * @throws {InvalidParameterError} Throws an error if no elements are found with the provided selector.
 */
export function bindClickEvents(clickEvents: InteractionEvent | InteractionEvent[] | any | any[]): void {
  if (State.sessionId) {
    bindClickEventsToElements(clickEvents);
  } else {
    State.bindQueue = State.bindQueue || [];
    State.bindQueue.push(new BindQueueItem(bindClickEventsToElements, [clickEvents]));
  }
}

/**
 * Callback function for binding click events to DOM elements.
 * @param {InteractionEvent | InteractionEvent[] | any | any[]} clickEvents - A click event object or an array of click event objects.
 * @throws {InvalidParameterError} Throws an error if the provided parameters are invalid.
 * @throws {InvalidParameterError} Throws an error if no elements are found with the provided selector.
 */
function bindClickEventsToElements(clickEvents: InteractionEvent | InteractionEvent[] | any | any[]): void {
  const debounceTime: number = 500;
  // Ensure clickEvents is always an array
  const eventsArray: Array<InteractionEvent | any> = Array.isArray(clickEvents) ? clickEvents : [clickEvents];
  eventsArray.forEach(function (event) {
    if (!(event instanceof InteractionEvent)) {
      event = new InteractionEvent(event.label, event.selector);
    }

    const domElements: NodeListOf<Element> = document.querySelectorAll(event.selector);
    if (domElements.length === 0) {
      throw new InvalidParameterError(`No elements found with the selector: ${event.selector}`);
    }

    domElements.forEach(element => {
      // Only bind the event if it hasn't been bound before
      if (!element.hasAttribute('data-qeen-click-bound')) {
        element.setAttribute('data-qeen-click-bound', 'true');
        element.addEventListener('click', new Debouncer(function (): void {
          new PageAnalyticsEvent('CLICK', null, event.label, event.selector);
        }, debounceTime)._debounced);
      }
    });
    // Keep track of the click events
    Config.clickEvents = Config.clickEvents || [];
    if (!Config.clickEvents.some(e => e?.label === event.label && e?.selector === event.selector)) {
      Config.clickEvents.push(event);
    }
  });
}

/**
 * Function for binding scroll events to DOM elements.
 * Accepts a single scroll event object or an array of scroll event objects.
 * @param {InteractionEvent | InteractionEvent[] | any | any[]} scrollEvents - A scroll event object or an array of scroll event objects.
 * @throws {InvalidParameterError} Throws an error if the provided parameters are invalid.
 * @throws {InvalidParameterError} Throws an error if no elements are found with the provided selector.
 */
export function bindScrollEvents(scrollEvents: InteractionEvent | InteractionEvent[] | any | any[]): void {
  if (State.sessionId) {
    bindScrollEventsToElements(scrollEvents);
  } else {
    State.bindQueue = State.bindQueue || [];
    State.bindQueue.push(new BindQueueItem(bindScrollEventsToElements, [scrollEvents]));
  }
}

/**
 * Callback function for binding scroll events to DOM elements.
 * @param {InteractionEvent | InteractionEvent[] | any | any[]} scrollEvents - A scroll event object or an array of scroll event objects.
 * @throws {InvalidParameterError} Throws an error if the provided parameters are invalid.
 * @throws {InvalidParameterError} Throws an error if no elements are found with the provided selector.
 */
export function bindScrollEventsToElements(scrollEvents: InteractionEvent | InteractionEvent[] | any | any[]): void {
  // Ensure scrollEvents is always an array
  const eventsArray: Array<InteractionEvent | any> = Array.isArray(scrollEvents) ? scrollEvents : [scrollEvents];
  eventsArray.forEach(function (event) {
    if (!(event instanceof InteractionEvent)) {
      event = new InteractionEvent(event.label, event.selector);
    }
    const domElements: NodeListOf<Element> = document.querySelectorAll(event.selector);
    if (domElements.length === 0) {
      throw new InvalidParameterError(`No elements found with the selector: ${event.selector}`);
    }

    domElements.forEach(element => {
      element.setAttribute('data-qeen-scroll-bound', 'true');
      let observer: IntersectionObserver | null = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Only log the event if it hasn't been logged before
            if (!State.scrollObservedElements.has(event.label)) {
              new PageAnalyticsEvent('SCROLL', null, event.label, event.selector);
              State.scrollObservedElements.add(event.label);
            }
            observer?.unobserve(entry.target);
            observer = null;
          }
        });
      }, { threshold: 0.5 });
      observer.observe(element);
    });
    // Keep track of the scroll events
    Config.scrollEvents = Config.scrollEvents || [];
    if (!Config.scrollEvents.some(e => e?.label === event.label && e?.selector === event.selector)) {
      Config.scrollEvents.push(event);
    }
  });
}

/**
 * This function checks if the tab switch causes a session reset.
 * @return {boolean} - True if the tab switch causes a session reset, false otherwise.
 */
function tabSwitchCausesReset(): boolean {
  const exitReturnDiff: number = Date.now() - State.lastTabExitTime;
  return exitReturnDiff >= Config.idleTime;
}

/**
 * This function binds tab switch events to the document object.
 */
export function bindTabEvents(): void {
  document.addEventListener('visibilitychange', function (): void {
    if (State.lastEventType === 'PAGE_EXIT') {
      resetSession();
      return;
    }
    if (document.hidden) {
      State.lastTabExitTime = Date.now();
      new PageAnalyticsEvent('TAB_SWITCH', null, 'EXIT', null);
      // Flush any debounced events
      Debouncer._flushAll();
    } else {
      if (tabSwitchCausesReset()) {
        resetSession();
      } else {
        new PageAnalyticsEvent('TAB_SWITCH', null, 'RETURN', null);
      }
    }
  });
}

/**
 * This function instantiates and resets the idle timer when a user interacts with the page. 
 * @param {number} idleThreshold - the time in milliseconds before the user is considered idle.
 * @throws {InvalidParameterError} Throws an error if the provided parameters are invalid.
 */
export function resetIdleTimer(idleThreshold: number): void {
  if (!idleThreshold) {
    throw new InvalidParameterError('Idle threshold is required to reset the idle timer.');
  }
  window.clearTimeout(State.idleTimer);
  if (!document.hidden) {
    State.idleTimer = window.setTimeout(function (): void {
      /* sometimes the timer can be created while the page is in view, but fires
         after the page is hidden; this should ensure that tab switches don't
         trigger a session to reset twice
      */
      const idleTimeExceeded: boolean = Date.now() - State.lastIdleTime >= idleThreshold;
      if (!document.hidden && idleTimeExceeded) {
        new PageAnalyticsEvent('IDLE', idleThreshold, null, null);
        State.lastIdleTime = Date.now();
        // Reset the session
        resetSession();
      }
    }, idleThreshold);
  }
}

/**
 * This function binds idle time events to the document object.
 * @param {number} idleThreshold - the time in milliseconds before the user is considered idle.
 */
export function bindIdleTimeEvents(idleThreshold: number): void {
  ['mousemove', 'keypress', 'touchmove', 'scroll', 'click', 'keyup', 'touchstart', 'touchend', 'visibilitychange']
    .forEach(function (event) { document.addEventListener(event, function (): void { resetIdleTimer(idleThreshold); }); });
}

/**
 * Function for sending a checkout event to the analytics endpoint.
 * @param {string} currency - The currency of the transaction.
 * @param {number} value - The value of the transaction.
 * @throws {InvalidParameterError} Throws an error if the provided parameters are invalid.
 * @throws {InvalidParameterError} Throws an error if the event is attempted to be sent on a product detail page.
 * @description Checkout events may only be sent on non-product detail pages.
 */
export function sendCheckoutEvent(currency: string, value: number): void {
  if (!currency || !value) {
    throw new InvalidParameterError('Currency and value are required for checkout events.');
  }
  if (State.sessionId) {
    pushCheckoutEvent(currency, value);
  } else {
    State.bindQueue = State.bindQueue || [];
    State.bindQueue.push(new BindQueueItem(pushCheckoutEvent, [currency, value]));
  }
}

/**
 * Callback function for sending a checkout event to the analytics endpoint.
 * @param {string} currency - The currency of the transaction.
 * @param {number} value - The value of the transaction.
 * @throws {InvalidParameterError} Throws an error if the provided parameters are invalid.
 * @throws {InvalidParameterError} Throws an error if the event is attempted to be sent on a product detail page.
 * @description Checkout events may only be sent on non-product detail pages.
 */
function pushCheckoutEvent(currency: string, value: number): void {
  if (Config.isPdp) {
    throw new InvalidParameterError('Checkout events may only be sent on non-product detail pages.');
  }
  new PageAnalyticsEvent('CHECKOUT', value, currency, null);
}
