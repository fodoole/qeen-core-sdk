const common = require('./common.js');
const puppeteer = require('puppeteer');
const { BigQuery } = require('@google-cloud/bigquery');
let browser;

afterEach(async () => {
  await browser.close();
});

const env = {
  PROJECT_ID: process.env.PROJECT_ID,
  BQ_DATASET: process.env.BQ_DATASET,
  BQ_EVENTS_TABLE: process.env.BQ_EVENTS_TABLE,
  BQ_EVENTS_TABLE_NPDP: process.env.BQ_EVENTS_TABLE_NPDP,
  BQ_REGION: process.env.BQ_REGION
}

// The time to wait for the events to be logged in BigQuery.
const loggingWaitTime = 10_000;

const hostAddress = process.env.ANALYTICS_HOST || 'localhost';
const port = (hostAddress !== 'localhost') ? process.env.PORT || '' : 8080;
const serverURL = `${hostAddress === 'localhost' ? 'http://' : ''}${hostAddress}${port ? ':' : ''}${port}`;

const QueryParams = {
  PAGE_SESSION_ID: 'page_session_id',
  CONTENT_SERVING_ID: 'content_serving_id',
  LOGGING_TIMESTAMP: 'logging_timestamp',
  EVENT_TIMESTAMP: 'event_timestamp'
};

/**
 * Executes a query in BigQuery.
 * @param {string} paramName The parameter name to query for.
 * @param {string} paramValue The parameter value to query for.
 * @param {string} table The table to query from.
 * @param {Number} timestampName The timestamp name to query for.
 * @param {Number} timestampValue The timestamp value to query for.
 * @returns {Promise<void>} A promise that resolves when the query is complete.
 */
async function executeQuery(paramName, paramValue, table, timestampName, timestampValue = 0) {
  const bigqueryClient = new BigQuery();

  const query = `SELECT * FROM \`${env.PROJECT_ID}.${env.BQ_DATASET}.${table}\` WHERE ${paramName} = '${paramValue}' AND ${timestampName} > ${timestampValue}`;

  const options = {
    query: query,
    location: env.BQ_REGION,
  };

  const [rows] = await bigqueryClient.query(options);

  return rows;
}

/**
 * Executes a query in BigQuery based on the Event class.
 * @param {string} sessionId The session ID to query for.
 * @param {string} table The table to query from.
 * @param {Number} timestamp The timestamp to query for.
 * @returns {Promise<void>} A promise that resolves when the query is complete.
 */
async function executeQueryEvent(sessionId, table, timestamp = 0) {
  return executeQuery(QueryParams.PAGE_SESSION_ID, sessionId, table, QueryParams.EVENT_TIMESTAMP, timestamp);
}

/**
 * Denullifies an object. Number values are converted to 0, string values are converted to ''.
 * @param {Object} obj The object to denullify.
 * @param {string[]} zeroProps The properties to convert to 0.
 * @returns {Object} The denullified object.
 */
function denullify(obj, zeroProps = []) {
  let newObj = { ...obj };
  Object.keys(newObj).forEach(key => {
    if (newObj[key] === null) {
      newObj[key] = zeroProps.includes(key) ? 0 : '';
    }
  });
  return newObj;
}

/**
 * Processes the page-level analytics test.
 * @param {Object[]} payloads The payloads to process.
 * @param {Array<string>} sessionIds The session IDs to query for.
 * @param {Number} startTime The start time of the test.
 * @param {string} table The table to query from.
 * @returns {Object} The mutated rows and the matching events.
 */
async function processPageLevelAnalyticsTest(payloads, sessionIds, startTime, table) {
  const events = common.reduceToEventsArray(payloads);

  // Making sure we only get the events we're interested in
  const eventsOfInterest = events.filter(event => sessionIds.includes(event.pid));

  // Give the events some time to be logged in BigQuery
  await common.wait(loggingWaitTime);

  const rows = [];
  for (const sessionId of sessionIds) {
    const rowsForSession = await executeQueryEvent(sessionId, table, startTime);
    rows.push(...rowsForSession);
  }

  // Bind BigQuery column names to the expected event properties
  let rowsMutated = rows.map(row => {
    return {
      t: row.event_type,
      v: row.event_value,
      l: row.event_label,
      edp: row.event_dom_path,
      ts: row.event_timestamp,
      u: row.page_url,
      ua: row.user_agent,
      r: row.referrer_url,
      p: row.project_id,
      pid: row.page_session_id,
      csrvid: row.content_serving_id,
      cid: row.content_id,
      cs: row.content_status,
      uid: row.user_device_id,
      prid: row.product_id,
      wid: row.website_id
    };
  });

  // Ensure that any event with a null property matches BigQuery's null value stand-in
  let eventsMatching = eventsOfInterest.map(event => denullify(event, ['v', 'ts']));

  // Delete the properties not stored in BigQuery
  eventsMatching = eventsMatching.map(event => { delete event['endpoint']; return event; });
  eventsMatching = eventsMatching.map(event => { delete event['npdp']; return event; });
  if (table === env.BQ_EVENTS_TABLE_NPDP) {
    eventsMatching = eventsMatching.map(event => { delete event['prid']; return event; });
  }

  eventsMatching = common.sortObjects(eventsMatching, ['t', 'l']);
  rowsMutated = common.sortObjects(rowsMutated, ['t', 'l']);

  return { eventsMatching, rowsMutated };
}

// E2E Test
describe('E2E/Integration', () => {
  if (Object.values(env).some(prop => prop === undefined)) {
    throw new Error('Please provide the necessary environment variables.');
  }

  it('(Page-Level Analytics) send page-level analytics events via the browser and observe these events in the database', async () => {
    const startTime = Date.now();
    const loggingURL = serverURL + common.endpoints.pageLevelAnalytics;
    browser = await puppeteer.launch();

    const { page, payloads } = await common.setupTest(browser, {
      url: common.pages.productPage,
      endpoint: loggingURL,
      json: true,
      waitForSessionStart: true,
    });

    // PAGE_VIEW
    // CONTENT_SERVED
    const sessionId1 = await page.evaluate(() => window.qeen.state.sessionId);
    const idleTime = await page.evaluate(() => window.qeen.config.idleTime);

    // CLICK
    await page.click('#add-to-cart');

    // SCROLL
    const title = await page.$('#desc');
    await page.evaluate(title => title.scrollIntoView(false), title);

    await common.wait(common.debounceTime + 50);

    // TAB_SWITCH
    const newPage = await browser.newPage();
    await newPage.goto('about:blank');
    await newPage.bringToFront();

    await common.wait(50);
    await page.bringToFront();

    // IDLE
    await common.wait(idleTime);
    const sessionId2 = await page.evaluate(() => window.qeen.state.sessionId);

    // PAGE_EXIT
    await page.reload();
    await browser.close();
    await common.wait(1_000);

    // Process the page-level analytics test
    const { eventsMatching, rowsMutated } = await processPageLevelAnalyticsTest(payloads, [sessionId1, sessionId2], startTime, env.BQ_EVENTS_TABLE);
    expect(rowsMutated).toEqual(eventsMatching);
  });

  it('(Page-Level Analytics/Non-PDP) send page-level analytics (non-PDP) events via the browser and observe these events in the database', async () => {
    const startTime = Date.now();
    const loggingURL = serverURL + common.endpoints.pageLevelAnalytics;
    browser = await puppeteer.launch();

    const { page, payloads } = await common.setupTest(browser, {
      url: common.pages.aboutPage,
      endpoint: loggingURL,
      json: true,
      waitForVisibility: true,
    });

    // PAGE_VIEW
    const sessionId1 = await page.evaluate(() => window.qeen.state.sessionId);
    const idleTime = await page.evaluate(() => window.qeen.config.idleTime);

    // CLICK
    await page.click('#more-info');

    // SCROLL
    const title = await page.$('#description');
    await page.evaluate(title => title.scrollIntoView(false), title);

    await common.wait(common.debounceTime + 50);

    // TAB_SWITCH
    const newPage = await browser.newPage();
    await newPage.goto('about:blank');
    await newPage.bringToFront();

    await common.wait(50);
    await page.bringToFront();

    // IDLE
    await common.wait(idleTime);
    const sessionId2 = await page.evaluate(() => window.qeen.state.sessionId);

    // PAGE_EXIT
    await page.click('#root > nav > a:nth-child(3)');

    // CHECKOUT
    const sessionId3 = await page.evaluate(() => window.qeen.state.sessionId);
    await page.click('#checkout');
    await common.wait(1_500);
    await page.reload();
    await browser.close();
    await common.wait(1_000);

    // Process the page-level analytics test
    const { eventsMatching, rowsMutated  } = await processPageLevelAnalyticsTest(payloads, [sessionId1, sessionId2, sessionId3], startTime, env.BQ_EVENTS_TABLE_NPDP);
    expect(rowsMutated).toEqual(eventsMatching);
  });
});