// index.test.js
const { Core } = require('@adobe/aio-sdk');
const { main } = require('../../../../../../actions/commerce/events/order/status');
const { HTTP_OK } = require('../../../../../../lib/http');

jest.mock('@adobe/aio-sdk');
jest.mock('../../../../../../lib/adobe-commerce');

describe('Order Status Update Tests', () => {
  let logger;
  let params;

  beforeEach(() => {
    // Setup logger mock
    logger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };
    Core.Logger.mockReturnValue(logger);

    // Setup test parameters
    params = {
      LOG_LEVEL: 'debug',
      data: {
        value: {
          order_id: '12345',
          status: 'processing',
        },
      },
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  test('should process order status update successfully', async () => {
    const result = await main(params);

    expect(result).toEqual({
      statusCode: HTTP_OK,
      body: {
        success: true,
        message: 'Orders status updated successfully',
      },
    });

    expect(logger.info).toHaveBeenCalledWith('Calling the main action for erp order status');
  });

  test('should handle errors gracefully', async () => {
    const error = new Error('Test error');
    Core.Logger.mockImplementationOnce(() => ({
      ...logger,
      error: jest.fn().mockImplementation(() => {
        throw error;
      }),
    }));

    const result = await main(params);

    expect(result).toEqual({
      statusCode: HTTP_OK,
      body: {
        success: true,
        message: 'Orders status updated successfully',
      },
    });
  });
});
