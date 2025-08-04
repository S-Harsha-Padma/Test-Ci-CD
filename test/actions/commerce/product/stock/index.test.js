const { main } = require('../../../../../actions/commerce/product/stock/index');
const { errorResponse } = require('../../../../../actions/utils');
const { getAdobeCommerceClient } = require('../../../../../lib/adobe-commerce');
const { HTTP_OK, HTTP_INTERNAL_ERROR } = require('../../../../../lib/http');

jest.mock('@adobe/aio-sdk', () => ({
  Core: {
    Logger: jest.fn().mockImplementation(() => ({
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    })),
  },
}));

jest.mock('../../../../../actions/utils', () => ({
  errorResponse: jest.fn(),
}));

jest.mock('../../../../../lib/adobe-commerce', () => ({
  getAdobeCommerceClient: jest.fn(),
}));

describe('stock function', () => {
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    require('@adobe/aio-sdk').Core.Logger.mockReturnValue(mockLogger);
  });

  test('returns stock quantity when client.getStock is successful', async () => {
    const params = {
      LOG_LEVEL: 'info',
      sku: 'test-sku',
    };
    const mockClient = {
      getProductSalableQuantity: jest.fn().mockResolvedValue(10),
    };
    getAdobeCommerceClient.mockResolvedValue(mockClient);

    const result = await main(params);

    expect(result.statusCode).toBe(HTTP_OK);
    expect(result.body).toEqual({ qty: 0 });
    expect(mockClient.getProductSalableQuantity).toHaveBeenCalledWith('test-sku');
  });

  test('returns zero quantity when stock message is undefined', async () => {
    const params = {
      LOG_LEVEL: 'info',
      sku: 'test-sku',
    };
    const mockClient = {
      getProductSalableQuantity: jest.fn().mockResolvedValue({}),
    };
    getAdobeCommerceClient.mockResolvedValue(mockClient);

    const result = await main(params);

    expect(result.statusCode).toBe(HTTP_OK);
    expect(result.body).toEqual({ qty: 0 });
  });

  test('handles errors and returns error response', async () => {
    const params = {
      LOG_LEVEL: 'info',
      sku: 'test-sku',
    };
    const mockError = new Error('Test error');
    getAdobeCommerceClient.mockRejectedValue(mockError);
    errorResponse.mockReturnValue({
      statusCode: HTTP_INTERNAL_ERROR,
      body: 'Something went wrong while retrieving product stock information.',
    });

    const result = await main(params);

    expect(result.statusCode).toBe(HTTP_INTERNAL_ERROR);
    expect(result.body).toBe('Something went wrong while retrieving product stock information.');
    expect(errorResponse).toHaveBeenCalledWith(
      HTTP_INTERNAL_ERROR,
      'Something went wrong while retrieving product stock information.',
      mockLogger
    );
  });
});
