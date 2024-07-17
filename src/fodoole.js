import { fetchContent, initFodooleAnalytics } from './sessionManager.js';
import { Config, State } from './config.js';
import { bindClickEvents } from './clickEvents.js';
import { bindScrollEvents } from './scrollEvents.js';
import { randInt } from './utils.js';

/**
 * @namespace fodoole
 * @description The main namespace for the Fodoole Analytics SDK.
 */
window.fodoole = window.fodoole || {};
fodoole.fetchFodooleContent = fetchContent;
fodoole.initFodooleAnalytics = initFodooleAnalytics;
fodoole.config = Config;
fodoole.state = State;
fodoole.bindClickEvents = bindClickEvents; // FIXME: maybe unnecessary
fodoole.bindScrollEvents = bindScrollEvents; // FIXME: maybe unnecessary
fodoole.randInt = randInt;

// fodoole.prepareSelectors();
// TODO: fetch function

// export { fodoole };