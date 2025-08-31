const { getUspsShippingMethod } = require('../../../../../../actions/commerce/webhook/shipping/methods/usps');

describe('getUspsShippingMethod', () => {
  test('should return an operation to remove tablerate shipping method if package weight is greater than 1.1', () => {
    const params = {
      rateRequest: {
        package_weight: 1.2,
      },
    };

    const expectedOperation = {
      op: 'add',
      path: 'result',
      value: {
        method: 'bestway',
        remove: true,
      },
    };

    const result = getUspsShippingMethod(params);
    expect(result).toEqual([expectedOperation]);
  });
});
