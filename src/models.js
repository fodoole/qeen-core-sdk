import { config, state } from './config.js';

/**
 * Class that handles page-level analytics.
 * @class PageAnalyticsEvent
 * @param {string} type The type of event (e.g. CLICK, SCROLL, etc.)
 * @param {number} value The value of the event (numeric value, if applicable)
 * @param {string} label The label of the event (e.g. 'ADD_TO_CART')
 * @param {string} domPath The DOM path of the element that triggered the event
 */
export class PageAnalyticsEvent {
  ts = Date.now()
  pid = state.sessionId
  u = window.location.href
  ua = navigator.userAgent
  r = document.referrer
  p = config.projectId
  csrvid = config.contentServingId
  cid = config.contentId
  uid = state.fodooleDeviceId
  npdp = !config.isPdp

  constructor(type, value, label, domPath) {
    this.t = type;
    this.v = value;
    this.l = label;
    this.edp = domPath;

    this.pushEvent();
  };

  // Pushes the event to the analytics endpoint.
  pushEvent() {
    if (window.location.hash.includes('fodoole-dev')) {
      console.log(this);
    }

    const payloadObject = {
      event: this
    };
    const payload = JSON.stringify(payloadObject);
    navigator.sendBeacon(config.analyticsEndpoint, payload);
  };
}
