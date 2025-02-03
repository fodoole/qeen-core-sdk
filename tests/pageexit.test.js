const common = require('./common.js');
const puppeteer = require('puppeteer');
let browser;

afterEach(async () => {
  await browser.close();
});

describe('Page Exit', () => {
  it('(Page Exit) should observe a PAGE_EXIT event when exiting the page', async () => {
    browser = await puppeteer.launch();

    const { page, payloads } = await common.setupTest(browser, {
      url: common.pages.productPage,
      endpoint: common.endpoints.pageLevelAnalytics,
      json: true,
      waitForSessionStart: true,
    }, {});

    await page.reload();

    const events = common.reduceToEventsArray(payloads);
    expect(events.some(event => event.t === 'PAGE_EXIT')).toBe(true);
  });

  it('(Page Exit with Click) should observe a PAGE_EXIT and CLICK event when exiting the page', async () => {
    browser = await puppeteer.launch();

    const { page, payloads } = await common.setupTest(browser, {
      url: common.pages.productPage,
      endpoint: common.endpoints.pageLevelAnalytics,
      json: true,
      waitForSessionStart: true,
    }, {});

    await page.click('#add-to-cart');

    await page.reload();

    const events = common.reduceToEventsArray(payloads);
    expect(events.some(event => event.t === 'PAGE_EXIT')).toBe(true);
    expect(events.some(event => event.t === 'CLICK')).toBe(true);
  });

  it('(Page Exit Correct URL) should observe the correct URL in the PAGE_EXIT event', async () => {
    browser = await puppeteer.launch();

    const { page, payloads } = await common.setupTest(browser, {
      url: common.pages.productPage,
      endpoint: common.endpoints.pageLevelAnalytics,
      json: true,
      waitForSessionStart: true,
    }, {});

    await page.click('h3.productTitle');

    // Wait for the page to navigate
    await common.wait(1_000);

    const events = common.reduceToEventsArray(payloads);
    const pageViewEvent = events.find(event => event.t === 'PAGE_VIEW');
    const pageExitEvent = events.find(event => event.t === 'PAGE_EXIT');
    expect(pageExitEvent.u).toBe(pageViewEvent.u);
  });

  it('(Thread Binding) should observe exactly one PAGE_EXIT event when exiting the page', async () => {
    browser = await puppeteer.launch();

    const { page, payloads } = await common.setupTest(browser, {
      url: common.pages.homePage,
      endpoint: common.endpoints.pageLevelAnalytics,
      json: true,
      waitForSessionStart: true,
    }, {});

    await page.reload();

    const events = common.reduceToEventsArray(payloads);
    expect(events.filter(event => event.t === 'PAGE_EXIT').length).toBe(1);
  });
});