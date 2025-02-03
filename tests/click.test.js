const common = require('./common.js');
const puppeteer = require('puppeteer');
let browser;

afterEach(async () => {
  await browser.close();
});

describe('Click Events', () => {
  it('(Click) should observe a CLICK event', async () => {
    browser = await puppeteer.launch();

    const { page, payloads } = await common.setupTest(browser, {
      url: common.pages.productPage,
      endpoint: common.endpoints.pageLevelAnalytics,
      json: true,
      waitForSessionStart: true,
    }, {});

    await page.click('#add-to-cart');

    await common.wait(common.debounceTime + 50);

    const events = common.reduceToEventsArray(payloads);
    expect(events).toContainEqual(expect.objectContaining({ t: 'CLICK', l: 'ADD_TO_CART' }));
  });

  it('(Click Group) should observe 3 CLICK events with the same label', async () => {
    browser = await puppeteer.launch();

    const { page, payloads } = await common.setupTest(browser, {
      url: common.pages.productPage,
      endpoint: common.endpoints.pageLevelAnalytics,
      json: true,
      waitForSessionStart: true,
    }, {});

    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#add-to-wishlist-carrousel')).map(button => {
        let path = [];
        let node = button;
        while (node !== document.body) {
          let name = node.nodeName;
          if (node.id) {
            name += `#${node.id}`;
          }
          if (node.className) {
            name += `.${node.className.replace(/\s+/g, '.')}`;
          }
          path.unshift(name);
          node = node.parentNode;
        }
        return path.join(' > ');
      });
    });

    for (let i = 0; i < buttons.length; i++) {
      await page.click(buttons[i]);
      await common.wait(common.debounceTime + 50);
    }

    const events = common.reduceToEventsArray(payloads);
    const clickGroupEvents = events.filter(event => event.l === 'ATW');
    expect(clickGroupEvents.length).toBe(3);
  });

  it('(Click Debounce) should observe a single CLICK event', async () => {
    browser = await puppeteer.launch();

    const { page, payloads } = await common.setupTest(browser, {
      url: common.pages.productPage,
      endpoint: common.endpoints.pageLevelAnalytics,
      json: true,
      waitForSessionStart: true,
    }, {});

    await page.click('#add-to-cart');
    await page.click('#add-to-cart');

    await common.wait(common.debounceTime);

    const events = common.reduceToEventsArray(payloads);
    const clickEvents = events.filter(event => event.t === 'CLICK');
    expect(clickEvents.length).toBeLessThanOrEqual(1);
  });

  it('(Event Cleanup) should not see any events leaking from different page types', async () => {
    browser = await puppeteer.launch();

    const { page, _ } = await common.setupTest(browser, {
      url: common.pages.productPage,
      endpoint: common.endpoints.pageLevelAnalytics,
      json: true,
      waitForSessionStart: true,
    }, {});

    await page.click('#root > nav > a:nth-child(3)');

    const clickEvents = await page.evaluate(() => window.qeen.config.clickEvents);
    const scrollEvents = await page.evaluate(() => window.qeen.config.scrollEvents);

    expect(clickEvents).not.toContainEqual(expect.objectContaining({ label: 'ADD_TO_CART' }));
    expect(clickEvents).not.toContainEqual(expect.objectContaining({ label: 'ADD_TO_WISHLIST' }));
    expect(clickEvents).not.toContainEqual(expect.objectContaining({ label: 'ATW' }));
    expect(scrollEvents).not.toContainEqual(expect.objectContaining({ label: 'SCROLL_TITLE' }));
    expect(scrollEvents).not.toContainEqual(expect.objectContaining({ label: 'SCROLL_DESC' }));
  });
});