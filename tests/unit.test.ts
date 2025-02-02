/**
 * @jest-environment jsdom
 */

import { randInt, limit } from '../src/utils';
import { prepareSelectors } from '../src/sessionManager';

describe('Utilities', () => {
  it('(Random Integer) should generate a random integer between 10^15 and 10^16 - 1', async () => {
    const randIntResult = randInt();

    expect(randIntResult).toBeGreaterThanOrEqual(1e15);
    expect(randIntResult).toBeLessThan(1e16);
    expect(typeof randIntResult).toBe('number');
  });

  it('(Limit) should limit a number to a given range', async () => {
    const limitResultAbove = limit(10, 0, 5);
    const limitResultBelow = limit(-10, 0, 5);
    const limitResultWithin = limit(3, 0, 5);

    expect(limitResultAbove).toBe(5);
    expect(limitResultBelow).toBe(0);
    expect(limitResultWithin).toBe(3);
  });

  it('(Prepare Selectors) should observe the correct content selector bindings', async () => {
    const contentSelectors = prepareSelectors([
      {
        'uid': '0001',
        'path': '.title',
        'value': 'Title'
      },
      {
        'uid': '0002',
        'path': '#desc',
        'value': 'Description'
      },
      {
        'uid': '0003',
        'path': 'html > head > title',
        'value': 'Document Title'
      }]);

    expect(contentSelectors).toEqual({
      '.title': 'Title',
      '#desc': 'Description',
      'html > head > title': 'Document Title',
    });
  });
});
