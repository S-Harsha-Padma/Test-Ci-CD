const { getWarehouseShippingMethod } = require('../../../../../../actions/commerce/webhook/shipping/methods/warehouse');
const { createShippingOperation } = require('../../../../../../lib/adobe-commerce');

jest.mock('../../../../../../lib/adobe-commerce');

describe('getWarehouseShippingMethod', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return warehouse shipping methods', () => {
    const params = {
      rateRequest: {
        dest_country_id: 'US',
      },
      WAREHOUSE_PICKUP_CARRIER_CODE: 'warehouse_pickup',
      WAREHOUSE_PICKUP_METHOD_CODE: 'pickup',
      WAREHOUSE_PICKUP_METHOD_TITLE: 'Warehouse Pickup',
    };

    const expectedShippingMethod = {
      carrier_code: params.WAREHOUSE_PICKUP_CARRIER_CODE,
      method: params.WAREHOUSE_PICKUP_METHOD_CODE,
      method_title: params.WAREHOUSE_PICKUP_METHOD_TITLE,
      price: 0,
      cost: 0,
      additional_data: [
        {
          key: 'shipping_method',
          value: params.WAREHOUSE_PICKUP_METHOD_CODE,
        },
        {
          key: 'address',
          value: ['Free pickup at BrandVia Warehouse', '1943 Lundy Ave', 'San Jose, CA, USA, 95131'].join('\n'),
        },
      ],
    };

    createShippingOperation.mockReturnValue(expectedShippingMethod);

    const result = getWarehouseShippingMethod(params);
    expect(result).toEqual([expectedShippingMethod]);
    expect(createShippingOperation).toHaveBeenCalledWith(expectedShippingMethod);
  });
});
