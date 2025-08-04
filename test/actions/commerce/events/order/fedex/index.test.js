const { main } = require('../../../../../../actions/commerce/events/order/fed-ex/index');
const { Core } = require('@adobe/aio-sdk');
const {
  getAdobeCommerceClient,
  actionErrorResponse,
  actionSuccessResponse,
} = require('../../../../../../lib/adobe-commerce');

jest.mock('@adobe/aio-sdk', () => ({
  Core: {
    Logger: jest.fn().mockReturnValue({
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

jest.mock('../../../../../../lib/adobe-commerce', () => ({
  getAdobeCommerceClient: jest.fn(),
  actionErrorResponse: jest.fn(),
  actionSuccessResponse: jest.fn(),
}));

describe('main', () => {
  const mockLogger = Core.Logger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error if orderId is missing', async () => {
    const params = {
      data: {
        value: {
          order: {},
        },
      },
    };

    const errorResponse = { statusCode: 500, body: 'Order ID is missing' };
    actionErrorResponse.mockReturnValue(errorResponse);

    const result = await main(params);
    expect(mockLogger.error).toHaveBeenCalledWith('Order ID is missing');
    expect(actionErrorResponse).toHaveBeenCalledWith(500, 'Order ID is missing');
    expect(result).toEqual(errorResponse);
  });

  it('should skip if shipping method is not in FedEx list', async () => {
    const params = {
      FEDEX_METHODS: JSON.stringify({
        FEDEX: [{ method_code: 'ground' }],
      }),
      FEDEX_CODE: 'fedex',
      data: {
        value: {
          order: {
            entity_id: 1001,
            shipping_method: 'ups_ground',
            payment: {
              additional_information: { ext_shipping_info: 'CC123' },
            },
          },
        },
      },
    };

    const successResponse = { body: 'Shipping method not in FedEx list. No comment added.' };
    actionSuccessResponse.mockReturnValue(successResponse);

    const result = await main(params);
    expect(actionSuccessResponse).toHaveBeenCalledWith('Shipping method not in FedEx list. No comment added.');
    expect(result).toEqual(successResponse);
  });

  it('should skip if cost center is not present', async () => {
    const params = {
      FEDEX_METHODS: JSON.stringify({
        FEDEX: [{ method_code: 'ground' }],
      }),
      FEDEX_CODE: 'fedex',
      data: {
        value: {
          order: {
            entity_id: 1001,
            shipping_method: 'fedex_ground',
            payment: {
              additional_information: {},
            },
          },
        },
      },
    };

    const successResponse = { body: 'Cost center number not available. No comment added.' };
    actionSuccessResponse.mockReturnValue(successResponse);

    const result = await main(params);
    expect(actionSuccessResponse).toHaveBeenCalledWith('Cost center number not available. No comment added.');
    expect(result).toEqual(successResponse);
  });

  it('should add cost center comment if all conditions are met', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({ success: true });
    getAdobeCommerceClient.mockResolvedValue({ orderCommentUpdate: mockUpdate });

    const params = {
      FEDEX_METHODS: JSON.stringify({
        FEDEX: [{ method_code: 'ground' }],
      }),
      FEDEX_CODE: 'fedex',
      data: {
        value: {
          order: {
            entity_id: 1001,
            shipping_method: 'fedex_ground',
            payment: {
              additional_information: { ext_shipping_info: 'CC999' },
            },
          },
        },
      },
    };

    const successResponse = { body: 'Cost center comment added successfully' };
    actionSuccessResponse.mockReturnValue(successResponse);

    const result = await main(params);
    expect(mockUpdate).toHaveBeenCalledWith(
      1001,
      expect.objectContaining({
        statusHistory: expect.objectContaining({
          comment: 'Cost Center Number: CC999',
        }),
      })
    );
    expect(actionSuccessResponse).toHaveBeenCalledWith('Cost center comment added successfully');
    expect(result).toEqual(successResponse);
  });

  it('should handle error from orderCommentUpdate', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({ success: false });
    getAdobeCommerceClient.mockResolvedValue({ orderCommentUpdate: mockUpdate });

    const params = {
      FEDEX_METHODS: JSON.stringify({
        FEDEX: [{ method_code: 'ground' }],
      }),
      FEDEX_CODE: 'fedex',
      data: {
        value: {
          order: {
            entity_id: 1001,
            shipping_method: 'fedex_ground',
            payment: {
              additional_information: { ext_shipping_info: 'CC999' },
            },
          },
        },
      },
    };

    const errorResponse = { statusCode: 500, body: 'Failed to add cost center comment' };
    actionErrorResponse.mockReturnValue(errorResponse);

    const result = await main(params);
    expect(mockLogger.error).toHaveBeenCalledWith('Unexpected error adding cost center comment', expect.any(Object));
    expect(result).toEqual(errorResponse);
  });

  it('should handle unexpected exceptions', async () => {
    const error = new Error('Something went wrong');
    getAdobeCommerceClient.mockRejectedValue(error);

    const params = {
      FEDEX_METHODS: JSON.stringify({ FEDEX: [{ method_code: 'ground' }] }),
      FEDEX_CODE: 'fedex',
      data: {
        value: {
          order: {
            entity_id: 1001,
            shipping_method: 'fedex_ground',
            payment: {
              additional_information: { ext_shipping_info: 'CC999' },
            },
          },
        },
      },
    };

    const errorResponse = { statusCode: 500, body: error };
    actionErrorResponse.mockReturnValue(errorResponse);

    const result = await main(params);
    expect(mockLogger.error).toHaveBeenCalledWith(error);
    expect(result).toEqual(errorResponse);
  });
});
