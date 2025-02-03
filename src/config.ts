/**
 * @file config.ts
 * @description The configuration objects for qeen Core SDK.
 */

import { InteractionEvent } from "./models";
import { BindQueueItem } from "./sessionManager";

/**
 * @constant {string} getContentEndpoint - The endpoint to fetch content.
 */
// export const getContentEndpoint: string = '';
export const getContentEndpoint: string | undefined = process.env['GET_CONTENT_ENDPOINT'];
/**
 * @class Config
 * @description The configuration class for qeen Core SDK.
 * @property {string} analyticsEndpoint - The endpoint for the analytics server.
 * @property {string} projectId - The project ID.
 * @property {string} websiteId - The website ID.
 * @property {string} contentServingId - The content serving ID.
 * @property {string} contentId - The content ID.
 * @property {string} contentStatus - The content status.
 * @property {string} productId - The product ID.
 * @property {boolean} isPdp - The product detail page flag.
 * @property {number} idleTime - The idle time in milliseconds.
 * @property {InteractionEvent[]} clickEvents - The click events array.
 * @property {InteractionEvent[]} scrollEvents - The scroll events array.
 * @property {boolean} noQeen - If the URL contains #no-qeen.
 * @property {any[]} rawContentSelectors - The raw content selectors.
 * @property {Object} contentSelectors - The content selectors and content.
 */
export class Config {
  public static analyticsEndpoint: string;
  public static projectId: string;
  public static productId: string;
  public static websiteId: string;
  public static contentServingId: string;
  public static contentId: string;
  public static contentStatus: string;
  public static isPdp: boolean;
  public static idleTime: number;
  public static clickEvents: InteractionEvent[];
  public static scrollEvents: InteractionEvent[];
  public static noQeen: boolean;
  public static rawContentSelectors: any[];
  public static contentSelectors: Object;
}

/**
 * @class State
 * @description The state class for qeen Core SDK.
 * @property {string} qeenDeviceId - The qeen device ID.
 * @property {boolean} boundThreadEvents - The bound thread events flag.
 * @property {BindQueueItem[]} bindQueue - The bind queue.
 * @property {boolean} contentServed - The content served flag.
 * @property {string} pageUrl - The page URL.
 * @property {string} requestUrl - The request URL.
 * @property {boolean} contentServedSent - The content served sent flag.
 * @property {boolean} pageViewSent - The page viewed flag.
 * @property {string} sessionId - The session ID.
 * @property {number} idleTimer - The idle timer.
 * @property {number} lastIdleTime - The last idle time.
 * @property {number} lastTabExitTime - The last tab exit time.
 * @property {string} lastEventType - The last event type.
 * @property {Set<InteractionEvent | any>} scrollObservedElements - The set of scroll observed elements.
 */
export class State {
  public static qeenDeviceId: string = '';
  public static boundThreadEvents: boolean = false;
  public static bindQueue: BindQueueItem[] = [];
  public static contentServed: boolean = false;
  public static pageUrl: string;
  public static requestUrl: string;
  
  public static contentServedSent: boolean = false;
  public static pageViewSent: boolean = false;
  public static sessionId: string;
  public static idleTimer: number;
  public static lastIdleTime: number;
  public static lastTabExitTime: number;
  public static lastEventType: string = '';
  public static scrollObservedElements: Set<InteractionEvent | any>;

  /**
   * Function to reset the state.
   */
  static reset(): void {
    State.contentServedSent = false;
    State.pageViewSent = false;
    State.sessionId = '';
    State.idleTimer = 0;
    State.lastIdleTime = Date.now();
    State.lastTabExitTime = 0;
    State.lastEventType = '';
    State.scrollObservedElements = new Set();
  }
}
