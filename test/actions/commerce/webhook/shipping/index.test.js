const { main } = require('../../../../../actions/commerce/webhook/shipping/index');
const { Core } = require('@adobe/aio-sdk');
const { validateShippingRestrictions } = require('../../../../../actions/commerce/webhook/shipping/validation');
const { getUspsShippingMethod } = require('../../../../../actions/commerce/webhook/shipping/methods/usps');
const { getCarrierShippingMethod } = require('../../../../../actions/commerce/webhook/shipping/methods/carrier');
const { getWarehouseShippingMethod } = require('../../../../../actions/commerce/webhook/shipping/methods/warehouse');
const { getFedExShippingMethods } = require('../../../../../actions/commerce/webhook/shipping/methods/fedex');
const { getUpsShippingMethod } = require('../../../../../actions/commerce/webhook/shipping/methods/ups');
const { webhookErrorResponseWithException, webhookVerify } = require('../../../../../lib/adobe-commerce');
const { HTTP_OK } = require('../../../../../lib/http');

jest.mock('@adobe/aio-sdk');
jest.mock('../../../../../actions/commerce/webhook/shipping/validation');
jest.mock('../../../../../actions/commerce/webhook/shipping/methods/usps');
jest.mock('../../../../../actions/commerce/webhook/shipping/methods/carrier');
jest.mock('../../../../../actions/commerce/webhook/shipping/methods/warehouse');
jest.mock('../../../../../actions/commerce/webhook/shipping/methods/fedex');
jest.mock('../../../../../actions/commerce/webhook/shipping/methods/ups');
jest.mock('../../../../../lib/adobe-commerce');
jest.mock('../../../../../actions/utils');

describe('shipping-method main function', () => {
  let logger;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };
    Core.Logger.mockReturnValue(logger);
    jest.clearAllMocks();
  });

  it('should return success with shipping methods when all methods are retrieved successfully', async () => {
    const params = {
      LOG_LEVEL: 'info',
      __ow_body: btoa(JSON.stringify({ rateRequest: { customer: { id: '123' } } })),
    };

    webhookVerify.mockReturnValue({ success: true });
    validateShippingRestrictions.mockResolvedValue();
    getUspsShippingMethod.mockReturnValue([{ method: 'USPS' }]);
    getWarehouseShippingMethod.mockReturnValue([{ method: 'Warehouse' }]);
    getFedExShippingMethods.mockResolvedValue([{ method: 'FedEx' }]);
    getCarrierShippingMethod.mockResolvedValue([{ method: 'Carrier' }]);
    getUpsShippingMethod.mockResolvedValue([{ method: 'UPS' }]);

    const result = await main(params);

    expect(result).toEqual({
      statusCode: HTTP_OK,
      body: JSON.stringify([
        { method: 'USPS' },
        { method: 'Warehouse' },
        { method: 'FedEx' },
        { method: 'Carrier' },
        { method: 'UPS' },
      ]),
    });
    expect(logger.info).toHaveBeenCalledWith('Calling the usps shipping method validation');
  });

  it('should return error response if webhook signature is invalid', async () => {
    const params = {
      LOG_LEVEL: 'info',
      __ow_body: btoa(JSON.stringify({ rateRequest: {} })),
    };

    webhookVerify.mockReturnValue({ success: false, error: 'Invalid signature' });

    const result = await main(params);

    expect(result).toEqual(
      webhookErrorResponseWithException(
        'Webhook signature Error: Please try again later or contact our customer support team for assistance.'
      )
    );
    expect(logger.error).toHaveBeenCalledWith('Failed to verify the webhook signature: Invalid signature');
  });

  it('should return error response if validateShippingRestrictions throws an error', async () => {
    const params = {
      LOG_LEVEL: 'info',
      __ow_body: btoa(JSON.stringify({ rateRequest: {} })),
    };

    webhookVerify.mockReturnValue({ success: true });
    validateShippingRestrictions.mockRejectedValue(new Error('Validation error'));

    const result = await main(params);

    expect(result).toEqual(webhookErrorResponseWithException('Validation error'));
    expect(logger.error).toHaveBeenCalledWith('Error calling shipping method: Validation error');
  });

  it('should return success with no operations if no shipping methods are available', async () => {
    const params = {
      LOG_LEVEL: 'info',
      __ow_body: btoa(JSON.stringify({ rateRequest: {} })),
    };

    webhookVerify.mockReturnValue({ success: true });
    validateShippingRestrictions.mockResolvedValue();
    getUspsShippingMethod.mockReturnValue([]);
    getWarehouseShippingMethod.mockReturnValue([]);
    getFedExShippingMethods.mockResolvedValue([]);
    getCarrierShippingMethod.mockResolvedValue([]);
    getUpsShippingMethod.mockResolvedValue([]);

    const result = await main(params);

    expect(result).toEqual({
      statusCode: HTTP_OK,
      body: {
        op: 'success',
      },
    });
  });

  it('should handle unexpected errors gracefully', async () => {
    const params = {
      LOG_LEVEL: 'info',
      __ow_body: btoa(JSON.stringify({ rateRequest: {} })),
    };

    webhookVerify.mockReturnValue({ success: true });
    validateShippingRestrictions.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const result = await main(params);

    expect(result).toEqual(webhookErrorResponseWithException('Unexpected error'));
    expect(logger.error).toHaveBeenCalledWith('Error calling shipping method: Unexpected error');
  });
});
