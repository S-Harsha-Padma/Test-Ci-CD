const { getCarrierShippingMethod } = require('../../../../../../actions/commerce/webhook/shipping/methods/carrier');
const { createShippingOperation } = require('../../../../../../lib/adobe-commerce');
const { getCustomerGroupIdFromCode } = require('../../../../../../lib/aio-state');

jest.mock('../../../../../../lib/adobe-commerce');
jest.mock('../../../../../../lib/aio-state');

describe('getCarrierShippingMethod', () => {
  let logger;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };
    jest.clearAllMocks();
  });

  test('should return carrier shipping methods if customer group matches', async () => {
    const params = {
      CARRIER_CODE: 'carrier_code',
      SHIPPING_METHOD_CODE: 'shipping_method_code',
      SHIPPING_METHOD_TITLE: 'Shipping Method Title',
    };
    const customer = {
      group_id: '123',
    };
    const customerGroupId = '123';

    getCustomerGroupIdFromCode.mockResolvedValue(customerGroupId);
    const expectedShippingMethod = {
      carrier_code: params.CARRIER_CODE,
      method: params.SHIPPING_METHOD_CODE,
      method_title: params.SHIPPING_METHOD_TITLE,
      price: 0,
      cost: 0,
      additional_data: [
        {
          key: 'shipping_method',
          value: params.SHIPPING_METHOD_CODE,
        },
        {
          key: 'address',
          value: ['Weekly Courier to San Jose Towers', '345 Park Ave, San Jose', 'CA, 95110, USA'].join('\n'),
        },
      ],
    };
    createShippingOperation.mockReturnValue(expectedShippingMethod);

    const result = await getCarrierShippingMethod(params, customer, logger);
    expect(result).toEqual([expectedShippingMethod]);
    expect(createShippingOperation).toHaveBeenCalledWith(expectedShippingMethod);
  });

  test('should return an empty array if customer group does not match', async () => {
    const params = {
      CARRIER_CODE: 'carrier_code',
      SHIPPING_METHOD_CODE: 'shipping_method_code',
      SHIPPING_METHOD_TITLE: 'Shipping Method Title',
    };
    const customer = {
      group_id: '123',
    };
    const customerGroupId = '456';

    getCustomerGroupIdFromCode.mockResolvedValue(customerGroupId);

    const result = await getCarrierShippingMethod(params, customer, logger);
    expect(result).toEqual([]);
    expect(createShippingOperation).not.toHaveBeenCalled();
  });

  test('should return an empty array if customer is null', async () => {
    const params = {
      CARRIER_CODE: 'carrier_code',
      SHIPPING_METHOD_CODE: 'shipping_method_code',
      SHIPPING_METHOD_TITLE: 'Shipping Method Title',
    };
    const customer = null;
    const customerGroupId = '123';

    getCustomerGroupIdFromCode.mockResolvedValue(customerGroupId);

    const result = await getCarrierShippingMethod(params, customer, logger);
    expect(result).toEqual([]);
    expect(createShippingOperation).not.toHaveBeenCalled();
  });

  test('should return an empty array if customer does not have group_id', async () => {
    const params = {
      CARRIER_CODE: 'carrier_code',
      SHIPPING_METHOD_CODE: 'shipping_method_code',
      SHIPPING_METHOD_TITLE: 'Shipping Method Title',
    };
    const customer = {};
    const customerGroupId = '123';

    getCustomerGroupIdFromCode.mockResolvedValue(customerGroupId);

    const result = await getCarrierShippingMethod(params, customer, logger);
    expect(result).toEqual([]);
    expect(createShippingOperation).not.toHaveBeenCalled();
  });
});
