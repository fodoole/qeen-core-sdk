/**
 * @file qeen.ts
 * @description The main script for qeen Core SDK.
 */

import { fetchContent, initPageSession, setContentServed, resetContentServed, sendContentServed } from './sessionManager';
import { Config, State } from './config';
import { bindClickEvents, bindScrollEvents, sendCheckoutEvent } from './pageEvents';
import { randInt } from './utils';
import { InteractionEvent } from './models';
import { receiveMessage } from './demoMode';
import { InvalidParameterError, AnalyticsEndpointError, ResponseNotOkError, URLContainsNoQeenError } from './errors';

declare global {
  interface Window {
    qeen: any;
    qeenError: string;
  }
}

/**
 * @namespace qeen
 * @description The main namespace for the qeen Core SDK.
 */
window.qeen = window.qeen || {};

window.qeen.fetchQeenContent = fetchContent;
window.qeen.initPageSession = initPageSession;
window.qeen.bindClickEvents = bindClickEvents;
window.qeen.bindScrollEvents = bindScrollEvents;
window.qeen.sendCheckoutEvent = sendCheckoutEvent;
window.qeen.setContentServed = setContentServed;
window.qeen.resetContentServed = resetContentServed;
window.qeen.sendContentServedEvent = sendContentServed;
window.qeen.randInt = randInt;
window.qeen.config = Config;
window.qeen.state = State;
window.qeen.InteractionEvent = InteractionEvent;
window.qeen.InvalidParameterError = InvalidParameterError;
window.qeen.AnalyticsEndpointError = AnalyticsEndpointError;
window.qeen.ResponseNotOkError = ResponseNotOkError;
window.qeen.URLContainsNoQeenError = URLContainsNoQeenError;

if (window.location.hash.includes('no-qeen')) {
  Config.noQeen = true;
  console.info(`${window.qeenError = 'qeen is disabled; URL contains #no-qeen'}`);
  window.addEventListener('message', receiveMessage, false);
} else {
  Config.noQeen = false;
}

window.qeen.sdkVersion = '1.0';
