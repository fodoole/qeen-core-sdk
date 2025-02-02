/**
 * @file errors.ts
 * @description The error classes for qeen Core SDK.
 */

/**
 * Error class for invalid parameters.
 * @class InvalidParameterError
 * @extends Error
 * @param {string} message - The error message.
 */
export class InvalidParameterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidParameterError';
  }
}

/**
 * Error class for unset analytics endpoint.
 * @class AnalyticsEndpointError
 * @extends Error
 * @param {string} message - The error message.
 */
export class AnalyticsEndpointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalyticsEndpointError';
  }
}

/**
 * Error class for if the URL contains #no-qeen.
 * @class URLContainsNoQeenError
 * @extends Error
 * @param {string} message - The error message.
 */
export class URLContainsNoQeenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'URLContainsNoQeenError';
  }
}

/**
 * Error class for response not OK.
 * @class ResponseNotOkError
 * @extends Error
 * @param {number} status - The status code of the response.
 * @param {string} body - The status text of the response.
 * @param {string} url - The URL of the request.
 */
export class ResponseNotOkError extends Error {
  public status: number;
  public body: string;
  public url: string;

  constructor(status: number, body: string, url: string) {
    super(`Request to ${url} failed with status ${status}: ${body}`);
    this.name = "ResponseNotOkError";
    this.status = status;
    this.body = body;
    this.url = url;
  }
}
