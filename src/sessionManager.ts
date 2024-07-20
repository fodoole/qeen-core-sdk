/**
 * @file sessionManager.js
 * @description The session manager script for Fodoole Analytics SDK.
 */

import { Config, State, getContentEndpoint } from './config.js';
import { InteractionEvent, PageAnalyticsEvent, fetchContentParams } from './models.js';
import { InvalidParameterError, URLContainsNoFodooleError, ResponseNotOkError } from './errors.js';
import { bindScrollEventsToElements, bindTabEvents, bindIdleTimeEvents, resetIdleTimer } from './pageEvents.js';
import { onLoad, beforeUnload, randInt, limit, Debouncer } from './utils.js';

/**
  * Function that implements common logic for resetting the session state.
  * This function is called when a session is initialised or reset.
  * @param {string} label The label for the page view event.
  */
function initResetCommon(label: string): void {
  // Manage state
  if (label === 'RESET') {
    State.isResetSession = true;
  }
  State.sessionId = String(randInt());

  // Instantiate idle timer
  resetIdleTimer(Config.idleTime);

  // Log the page view and content served events
  function logPageView(): void {
    new PageAnalyticsEvent('PAGE_VIEW', null, label, null);
    if (!State.contentServed && Config.isPdp && Config.contentServingId !== '0') {
      new PageAnalyticsEvent('CONTENT_SERVED', null, null, null);
      State.contentServed = true;
    }
  }

  // Only send the page view event if the page is visible
  if (document.visibilityState === 'visible') {
    logPageView();
  } else { // If the page is not visible, wait for it to become visible
    document.addEventListener('visibilitychange', function logVisibleEvent() {
      State.lastTabExitTime = Date.now();
      if (document.visibilityState === 'visible') {
        logPageView();
        document.removeEventListener('visibilitychange', logVisibleEvent);
      }
    });
  }
}

/**
 * Function that sends a PAGE_EXIT event when the page is closed.
 */
function terminateSession(): void {
  // Trigger any remaining debounced events and send PAGE_EXIT event
  Debouncer.flushAll();
  new PageAnalyticsEvent('PAGE_EXIT', null, null, null);
}

/**
 * Function that binds events that should only be bound once per thread.
 */
function bindThreadEvents(): void {
  if (State.boundThreadEvents) {
    return;
  }
  State.boundThreadEvents = true;

  // Bind tab and idle time events
  bindTabEvents();
  bindIdleTimeEvents(Config.idleTime);

  // Fire any debounced events on page exit and send PAGE_EXIT event
  beforeUnload(function () {
    terminateSession();
  });
}

/**
 * Function that initializes a page session.
 * This function is called when the page is loaded.
 */
function initSession(): void {
  // Reset session data
  State.reset();
  State.sessionId = String(randInt());

  onLoad(function () {
    // Common initialization logic
    initResetCommon('INIT');

    // Bind general exit events
    bindThreadEvents();
  });
}

/**
 * Resets the session by resetting the state This is mainly used when a user
 * returns to the page after a long period of time or when idle time is hit
 * while user is still on the page.
 */
export function resetSession(): void {
  // Reset session id and session data
  State.reset();
  // Rebind intersection observer for scroll events
  bindScrollEventsToElements(Config.scrollEvents);

  initResetCommon('RESET');
}

/**
 * Prepare selectors for the content rendering or replacement.
 * @param {any[]} rawContent - The raw content to be prepared.
 * @returns {Object} - The content selectors.
 */
function prepareSelectors(rawContent: any[]): any {
  let contentSelectors: any = {};
  rawContent.forEach(entry => {
    contentSelectors[entry?.path] = entry?.value;
  });

  return contentSelectors;
}

/**
 * @interface ContentResponse
 * @property {string} fodooleDeviceId - The Fodoole device ID.
 * @property {string} analyticsEndpoint - The endpoint for the analytics server.
 * @property {string} projectId - The project ID.
 * @property {string} contentServingId - The content serving ID.
 * @property {string} contentId - The content ID.
 * @property {boolean} isPdp - The product detail page flag.
 * @property {number} idleTime - The idle time in milliseconds.
 * @property {any[]} rawContentSelectors - The raw content selectors.
 * @property {Object} contentSelectors - The content selectors and content.
 */
interface ContentResponse {
  fodooleDeviceId: string;
  analyticsEndpoint: string;
  projectId: string;
  contentServingId: string;
  contentId: string;
  isPdp: boolean;
  idleTime: number;
  rawContentSelectors: any[];
  contentSelectors: Object;
}

/**
 * Function to fetch Fodoole content.
 * @param {string} fodooleDeviceId - The user device ID.
 * @returns {Promise<Object>} - The promise object representing the response.
 * @property {Object} contentSelectors - The content selectors and content.
 * @throws {InvalidParameterError} - Throws an error if the user device ID is not provided.
 * @throws {ResponseNotOkError} - Throws an error if the response is not OK.
 * @throws {URLContainsNoFodooleError} - Throws an error if the URL contains #no-fodoole.
 */
export async function fetchContent(fodooleDeviceId: string): Promise<ContentResponse> {
  try {
    if (!fodooleDeviceId) {
      return Promise.reject(new InvalidParameterError('Fodoole user device ID is required.'));
    }
    if (window.location.hash.includes('no-fodoole')) {
      return Promise.reject(new URLContainsNoFodooleError('Fodoole is disabled; URL contains #no-fodoole'));
    }

    const params: fetchContentParams = new fetchContentParams(fodooleDeviceId);
    const response: Response = await fetch(`${getContentEndpoint}?${params.toString()}`);
    if (!response.ok) {
      return Promise.reject(new ResponseNotOkError(response.status, response.statusText, response.url));
    }
    const data: ContentResponse = await response.json();
    data.fodooleDeviceId = fodooleDeviceId;
    data.contentSelectors = prepareSelectors(data.rawContentSelectors)
    // Save the content in the config object for frontend investigation and debugging
    Config.rawContentSelectors = data.rawContentSelectors;
    Config.contentSelectors = data.contentSelectors;
    return data;
  } catch (error) {
    console.error('Failed to get Fodoole content:', error);
    return Promise.reject(error);
  }
}

/**
 * Function that cleans up stale events that are no longer present on the page.
 */
function cleanUpStaleEvents(): void {
  Config.clickEvents = Config.clickEvents.filter((event: InteractionEvent) => document.querySelector(event.value));
  Config.scrollEvents = Config.scrollEvents.filter((event: InteractionEvent) => document.querySelector(event.value));
}

/**
 * Class that represents a queue item for binding events.
 * @class BindQueueItem
 * @param {Function} fn - The function to be called.
 * @param {any[]} args - The arguments to be passed to the function.
 * @property {Function} fn - The function to be called.
 * @property {any[]} args - The arguments to be passed to the function.
 */
export class BindQueueItem {
  public fn: Function;
  public args: any[];

  constructor(fn: Function, args: any[]) {
    this.fn = fn;
    this.args = args;
  }
}

/**
 * Function that initializes the Fodoole Analytics SDK.
 * @param {any} config - The configuration object for the Fodoole Analytics SDK.
 */
export function initPageSession(config: ContentResponse): void {
  if (Config.noFodoole) {
    return;
  }
  if (!config.fodooleDeviceId) {
    throw new InvalidParameterError('User device ID is required.');
  }

  // Terminate previous session
  if (State.sessionId) {
    terminateSession();
  }

  State.fodooleDeviceId = config.fodooleDeviceId;
  Config.analyticsEndpoint = config.analyticsEndpoint || '';
  Config.projectId = config.projectId || '0';
  Config.contentServingId = config.contentServingId || '0';
  Config.contentId = config.contentId || '-';
  Config.isPdp = config.isPdp || false;
  Config.idleTime = limit(config.idleTime, 60_000, 599_000, 300_000);

  // Ensure interaction events don't leak through different routes
  Config.clickEvents = Config.clickEvents || [];
  Config.scrollEvents = Config.scrollEvents || [];
  cleanUpStaleEvents();

  initSession();

  // Apply pending bindings
  State.bindQueue.forEach(item => {
    item.fn(...item.args);
  });
  State.bindQueue = [];
}