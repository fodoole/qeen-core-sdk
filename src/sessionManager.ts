/**
 * @file sessionManager.ts
 * @description The session manager script for qeen Core SDK.
 */

import { Config, State, getContentEndpoint } from './config';
import { InteractionEvent, PageAnalyticsEvent, fetchContentParams, ContentResponse } from './models';
import { InvalidParameterError, URLContainsNoQeenError, ResponseNotOkError } from './errors';
import { bindScrollEventsToElements, bindTabEvents, bindIdleTimeEvents, resetIdleTimer } from './pageEvents';
import { onLoad, beforeUnload, randInt, limit, Debouncer } from './utils';

/**
 * Function that sets the content served flag to true.
 */
export function setContentServed(): void {
  State.contentServed = true;
}

/**
 * Function that sets the content served flag to false.
 */
export function resetContentServed(): void {
  State.contentServed = false;
}

/**
 * Function that sends a CONTENT_SERVED event.
 * @description This function only sends the event once per session, if content is served, the page is a PDP, and the content serving ID is not 0.
 */
export function sendContentServed(): void {
  if (State.contentServedSent || !State.contentServed || !Config.isPdp || Config.contentServingId === '0') {
    return;
  }
  new PageAnalyticsEvent('CONTENT_SERVED', null, null, null);
  State.contentServedSent = true;
}

/**
  * Function that implements common logic for resetting the session state.
  * This function is called when a session is initialised or reset.
  * @param {string} label The label for the page view event.
  */
function initResetCommon(label: string): void {
  // Manage state
  State.sessionId = String(randInt());

  // Rebind intersection observer for scroll events
  bindScrollEventsToElements(Config.scrollEvents);

  // Instantiate idle timer
  resetIdleTimer(Config.idleTime);

  // Log the page view and content served events
  function logPageView(): void {
    new PageAnalyticsEvent('PAGE_VIEW', null, label, null);
    sendContentServed();
  }

  // Only send the page view event if the page is visible
  if (document.visibilityState === 'visible') {
    logPageView();
  } else {
    // If the page is not visible, wait for it to become visible
    document.addEventListener('visibilitychange', function (): void {
      State.lastTabExitTime = Date.now();
      if (document.visibilityState === 'visible') {
        logPageView();
      }
    }, { once: true });
  }
}

/**
 * Function that sends a PAGE_EXIT event when the page is closed.
 */
function terminateSession(): void {
  // Trigger any remaining debounced events and send PAGE_EXIT event
  Debouncer._flushAll();
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

  initResetCommon('RESET');
}

/**
 * Prepare selectors for the content rendering or replacement.
 * @param {any[]} rawContent - The raw content to be prepared.
 * @returns {Object} - The content selectors.
 */
export function prepareSelectors(rawContent: any[]): any {
  let contentSelectors: any = {};
  rawContent.forEach(entry => {
    contentSelectors[entry?.path] = entry?.value;
  });

  return contentSelectors;
}

/**
 * Function to fetch qeen content.
 * @param {string} qeenDeviceId - The user device ID.
 * @param {string | undefined} overrideFetchURL - The override fetch URL.
 * @returns {Promise<ContentResponse>} The promise object representing the response.
 * @property {Object} contentSelectors - The content selectors and content.
 * @throws {InvalidParameterError} - Throws an error if the user device ID is not provided.
 * @throws {ResponseNotOkError} - Throws an error if the response is not OK.
 * @throws {URLContainsNoQeenError} - Throws an error if the URL contains #no-qeen.
 */
export async function fetchContent(qeenDeviceId: string, overrideFetchURL: string | undefined): Promise<ContentResponse> {
  try {
    if (!qeenDeviceId) {
      return Promise.reject(new InvalidParameterError('qeen user device ID is required.'));
    }
    if (window.location.hash.includes('no-qeen')) {
      return Promise.reject(new URLContainsNoQeenError('qeen is disabled; URL contains #no-qeen'));
    }
    resetContentServed();

    const params: fetchContentParams = new fetchContentParams(qeenDeviceId);
    const response: Response = await fetch(`${overrideFetchURL || getContentEndpoint}?${params._toString()}`);
    if (!response.ok) {
      return Promise.reject(new ResponseNotOkError(response.status, await response.text(), response.url));
    }
    const data: ContentResponse = await response.json();
    data.qeenDeviceId = qeenDeviceId;
    data.contentSelectors = prepareSelectors(data.rawContentSelectors)
    // Save the content in the config object for frontend investigation and debugging
    Config.rawContentSelectors = data.rawContentSelectors;
    Config.contentSelectors = data.contentSelectors;
    return data;
  } catch (error) {
    console.error('Failed to get qeen content:', error);
    return Promise.reject(error);
  }
}

/**
 * Function that cleans up stale events that are no longer present on the page.
 */
function cleanUpStaleEvents(): void {
  Config.clickEvents = Config.clickEvents.filter((event: InteractionEvent) => document.querySelector(event.selector));
  Config.scrollEvents = Config.scrollEvents.filter((event: InteractionEvent) => document.querySelector(event.selector));
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
 * Function that initializes the qeen Core SDK.
 * @param {ContentResponse} config - The configuration object for the qeen Core SDK.
 */
export function initPageSession(config: ContentResponse): void {
  if (Config.noQeen) {
    return;
  }
  if (!config.qeenDeviceId) {
    throw new InvalidParameterError('User device ID is required.');
  }

  // Terminate previous session
  if (State.sessionId) {
    terminateSession();
  }

  State.qeenDeviceId = config.qeenDeviceId;
  State.pageUrl = window.location.href;
  State.requestUrl = config.requestUrl;
  Config.analyticsEndpoint = config.analyticsEndpoint || '';
  Config.projectId = config.projectId || '-';
  Config.websiteId = config.websiteId || '-';
  Config.contentServingId = config.contentServingId || '0';
  Config.contentId = config.contentId || '-';
  Config.contentStatus = config.contentStatus || '';
  Config.productId = config.productId || '-';
  Config.isPdp = config.isPdp || false;
  Config.idleTime = limit(config.idleTime, 60_000, 599_000) || 300_000;

  // Ensure interaction events don't leak through different pages
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