const { getFedExShippingMethods } = require('../../../../../../actions/commerce/webhook/shipping/methods/fedex');
const { createShippingOperation } = require('../../../../../../lib/adobe-commerce');
const { getCustomerGroupById } = require('../../../../../../lib/aio-state');

jest.mock('../../../../../../lib/adobe-commerce');
jest.mock('../../../../../../lib/aio-state');

describe('getFedExShippingMethods', () => {
  let logger;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };
    jest.clearAllMocks();
  });

  test('should return FedEx shipping methods for valid customer group (domestic)', async () => {
    const params = {
      rateRequest: { dest_country_id: 'US' },
      FEDEX_CODE: 'fedex',
      FEDEX_SHIPPING_PRODUCT_PRICE: 2.95,
      FEDEX_METHODS: JSON.stringify({
        FEDEX: [{ method_code: 'fedEx-ground', method_title: 'FedEx Ground' }],
      }),
      CUSTOMER_GROUP_CODE: 'business',
      PO_FEDEX_CUSTOMER_GROUP: 'enterprise',
    };
    const customer = { group_id: '123' };
    const customerGroupCode = 'business';

    getCustomerGroupById.mockResolvedValue(customerGroupCode);
    createShippingOperation.mockImplementation((method) => method);

    const result = await getFedExShippingMethods(params, customer, logger);

    expect(result).toEqual([
      {
        carrier_code: 'fedex',
        method: 'fedEx-ground',
        method_title: 'FedEx Ground',
        price: 2.95,
        cost: 2.95,
        additional_data: [
          { key: 'shipping_method', value: 'fedEx-ground' },
          {
            key: 'shipping_description',
            value:
              'Bill to Adobe’s FedEx account for business orders only: $2.95 will be added to your order for processing and the shipping cost will be billed separately to your cost center',
          },
        ],
      },
    ]);
    expect(createShippingOperation).toHaveBeenCalledTimes(1);
  });

  test('should return FedEx shipping methods for valid customer group (international)', async () => {
    const params = {
      rateRequest: { dest_country_id: 'CA' },
      FEDEX_CODE: 'fedex',
      FEDEX_SHIPPING_PRODUCT_PRICE: 2.95,
      FEDEX_METHODS: JSON.stringify({
        FEDEX_INTL: [{ method_code: 'fedEx-intl', method_title: 'FedEx International' }],
      }),
      CUSTOMER_GROUP_CODE: 'business',
      PO_FEDEX_CUSTOMER_GROUP: 'enterprise',
    };
    const customer = { group_id: '123' };
    const customerGroupCode = 'enterprise';

    getCustomerGroupById.mockResolvedValue(customerGroupCode);
    createShippingOperation.mockImplementation((method) => method);

    const result = await getFedExShippingMethods(params, customer, logger);

    expect(result).toEqual([
      {
        carrier_code: 'fedex',
        method: 'fedEx-intl',
        method_title: 'FedEx International',
        price: 0, // Changed from 2.95 to 0
        cost: 0, // Changed from 2.95 to 0
        additional_data: [
          { key: 'shipping_method', value: 'fedEx-intl' },
          {
            key: 'shipping_description',
            value:
              'Bill to Adobe’s FedEx account for business orders only: $2.95 will be added to your order for processing and the shipping cost will be billed separately to your cost center',
          },
        ],
      },
    ]);
    expect(createShippingOperation).toHaveBeenCalledTimes(1);
  });

  test('should return an empty array if customer group does not match', async () => {
    const params = {
      rateRequest: { dest_country_id: 'US' },
      FEDEX_CODE: 'fedex',
      FEDEX_METHODS: JSON.stringify({
        FEDEX: [{ method_code: 'fedEx-ground', method_title: 'FedEx Ground' }],
      }),
      CUSTOMER_GROUP_CODE: 'business',
      PO_FEDEX_CUSTOMER_GROUP: 'enterprise',
    };
    const customer = { group_id: '123' };
    const customerGroupCode = 'retail'; // This group is not in the allowed list

    getCustomerGroupById.mockResolvedValue(customerGroupCode);

    const result = await getFedExShippingMethods(params, customer, logger);

    expect(result).toEqual([]);
    expect(createShippingOperation).not.toHaveBeenCalled();
  });

  test('should return an empty array if customer does not have group_id', async () => {
    const params = {
      rateRequest: { dest_country_id: 'US' },
      FEDEX_CODE: 'fedex',
      FEDEX_METHODS: JSON.stringify({
        FEDEX: [{ method_code: 'fedEx-ground', method_title: 'FedEx Ground' }],
      }),
      CUSTOMER_GROUP_CODE: 'business',
      PO_FEDEX_CUSTOMER_GROUP: 'enterprise',
    };
    const customer = {};

    const result = await getFedExShippingMethods(params, customer, logger);

    expect(result).toEqual([]);
    expect(createShippingOperation).not.toHaveBeenCalled();
  });
});
