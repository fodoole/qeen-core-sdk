/**
 * @file pageEvents.js
 * @description The page events script for Fodoole Analytics SDK.
 */

import { Config, State } from './config.js';
import { PageAnalyticsEvent } from './models.js';
import { resetSession } from './sessionManager.js';
import { Debouncer } from './utils.js';

/**
 * Callback function for binding click events to DOM elements.
 * @param {object[]} clickEvents - Array of click event objects.
 */
export function bindClickEvents(clickEvents) {
  clickEvents.forEach(function (event) {
    const domElements = document.querySelectorAll(event.value);
    domElements.forEach(element => {
      // Only bind the event if it hasn't been bound before
      if (!element.hasAttribute('data-fodoole-click-bound')) {
        element.setAttribute('data-fodoole-click-bound', 'true');
        element.addEventListener('click', new Debouncer(function () {
          new PageAnalyticsEvent('CLICK', null, event.label, event.value);
        }, State.debounceTime).debounced);
      }
    });
    // Keep track of the click events
    Config.clickEvents = Config.clickEvents || new Set();
    Config.clickEvents.add(event);
  });
}
// TODO: bubble error if failed to bind event

/**
 * Callback function for binding scroll events to DOM elements.
 * @param {object[]} scrollEvents - Array of scroll event selectors.
 */
export function bindScrollEvents(scrollEvents) {
  scrollEvents.forEach(function (event) {
    const label = event.label;
    const path = event.value;
    const domElements = document.querySelectorAll(path);

    domElements.forEach(element => {
      let observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Only log the event if it hasn't been logged before
            if (!State.scrollObservedElements.has(label)) {
              new PageAnalyticsEvent('SCROLL', null, label, path);
              State.scrollObservedElements.add(label);
            }
            observer.unobserve(entry.target);
            observer = null;
          }
        });
      }, { threshold: 0.5 });
      observer.observe(element);
    });
    // Keep track of the scroll events
    Config.scrollEvents = Config.scrollEvents || new Set();
    Config.scrollEvents.add(event);
  });
}
// TODO: bubble error if failed to bind event

/**
 * This function checks if the tab switch causes a session reset.
 * @return {boolean} - True if the tab switch causes a session reset, false otherwise.
 */
function tabSwitchCausesReset() {
  const exitReturnDiff = Date.now() - State.lastTabExitTime;
  return exitReturnDiff >= Config.idleTime;
}

/**
 * This function binds tab switch events to the document object.
 */
export function bindTabEvents() {
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      State.lastTabExitTime = Date.now();
      new PageAnalyticsEvent('TAB_SWITCH', null, 'EXIT', null);
      // Flush any debounced events
      Debouncer.flushAll();
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
 */
export function resetIdleTimer(idleThreshold) {
  clearTimeout(State.idleTimer);
  if (!document.hidden) {
    State.idleTimer = setTimeout(function () {
      /* sometimes the timer can be created while the page is in view, but fires
         after the page is hidden; this should ensure that tab switches don't
         trigger a session to reset twice
      */
      const idleTimeExceeded = Date.now() - State.lastIdleTime >= idleThreshold;
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
export function bindIdleTimeEvents(idleThreshold) {
  ['mousemove', 'keypress', 'touchmove', 'scroll', 'click', 'keyup', 'touchstart', 'touchend', 'visibilitychange']
    .forEach(function (event) { document.addEventListener(event, function () { resetIdleTimer(idleThreshold); }); });
}

