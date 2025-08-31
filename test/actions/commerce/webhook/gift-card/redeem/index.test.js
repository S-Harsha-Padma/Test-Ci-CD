const { Core } = require('@adobe/aio-sdk');
const { main } = require('../../../../../../actions/commerce/webhook/gift-card/redeem/index');
const {
  getAdobeCommerceClient,
  webhookErrorResponseWithException,
  webhookVerify,
  webhookSuccessResponse,
} = require('../../../../../../lib/adobe-commerce');
const { getCustomerGroupById } = require('../../../../../../lib/aio-state');

jest.mock('@adobe/aio-sdk');
jest.mock('../../../../../../lib/adobe-commerce');
jest.mock('../../../../../../lib/aio-state');

describe('Gift Card Redeem Webhook', () => {
  let logger;

  beforeEach(() => {
    // Mock logger
    logger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };
    Core.Logger.mockReturnValue(logger);

    // Reset mocks
    jest.clearAllMocks();
  });

  test('should return success response for guest user', async () => {
    webhookVerify.mockReturnValue({ success: true });
    const params = { __ow_body: btoa(JSON.stringify({ giftCard: { cartId: '123' } })) };
    const cartResult = { success: true, message: { customer_is_guest: true } };
    getAdobeCommerceClient.mockResolvedValue({
      getCart: jest.fn().mockResolvedValue(cartResult),
    });

    const result = await main(params);

    expect(webhookVerify).toHaveBeenCalledWith(params);
    expect(logger.info).toHaveBeenCalledWith('Calling the main action for gift card redeem');
    expect(webhookSuccessResponse).toHaveBeenCalled();
    expect(result).toEqual(webhookSuccessResponse());
  });

  test('should return error response for missing cart ID', async () => {
    webhookVerify.mockReturnValue({ success: true });
    const params = { __ow_body: btoa(JSON.stringify({ giftCard: {} })) };

    const result = await main(params);

    expect(webhookVerify).toHaveBeenCalledWith(params);
    expect(webhookErrorResponseWithException).toHaveBeenCalledWith('Cart ID is required');
    expect(result).toEqual(webhookErrorResponseWithException('Cart ID is required'));
  });

  test('should return success response for CBRE Personnel customer group', async () => {
    webhookVerify.mockReturnValue({ success: true });
    const params = { __ow_body: btoa(JSON.stringify({ giftCard: { cartId: '123' } })) };
    const cartResult = { success: true, message: { customer_is_guest: false, customer: { group_id: '1' } } };
    getAdobeCommerceClient.mockResolvedValue({
      getCart: jest.fn().mockResolvedValue(cartResult),
    });
    getCustomerGroupById.mockResolvedValue('CBRE Personnel');

    const result = await main(params);

    expect(webhookVerify).toHaveBeenCalledWith(params);
    expect(getCustomerGroupById).toHaveBeenCalledWith(params, logger, '1');
    expect(result).toEqual(
      webhookErrorResponseWithException('CBRE Personnel are not authorized to redeem gift cards.')
    );
  });

  test('should return error response for unauthorized customer group', async () => {
    webhookVerify.mockReturnValue({ success: true });
    const params = { __ow_body: btoa(JSON.stringify({ giftCard: { cartId: '123' } })) };
    const cartResult = { success: true, message: { customer_is_guest: false, customer: { group_id: '1' } } };
    getAdobeCommerceClient.mockResolvedValue({
      getCart: jest.fn().mockResolvedValue(cartResult),
    });
    getCustomerGroupById.mockResolvedValue('CBRE Personnel');

    const result = await main(params);

    expect(webhookVerify).toHaveBeenCalledWith(params);
    expect(getCustomerGroupById).toHaveBeenCalledWith(params, logger, '1');
    expect(webhookErrorResponseWithException).toHaveBeenCalledWith(
      'CBRE Personnel are not authorized to redeem gift cards.'
    );
    expect(result).toEqual(
      webhookErrorResponseWithException('CBRE Personnel are not authorized to redeem gift cards.')
    );
  });

  test('should return error response for failed webhook verification', async () => {
    webhookVerify.mockReturnValue({ success: false, error: 'Invalid signature' });
    const params = {};

    const result = await main(params);

    expect(webhookVerify).toHaveBeenCalledWith(params);
    expect(logger.error).toHaveBeenCalledWith('Failed to verify the webhook signature: Invalid signature');
    expect(webhookErrorResponseWithException).toHaveBeenCalledWith(
      'Webhook signature Error: Please try again later or contact our customer support team for assistance.'
    );
    expect(result).toEqual(
      webhookErrorResponseWithException(
        'Webhook signature Error: Please try again later or contact our customer support team for assistance.'
      )
    );
  });

  test('should handle unexpected errors gracefully', async () => {
    webhookVerify.mockReturnValue({ success: true });
    const params = { __ow_body: btoa(JSON.stringify({ giftCard: { cartId: '123' } })) };
    const error = new Error('Unexpected error');
    getAdobeCommerceClient.mockRejectedValue(error);

    const result = await main(params);

    expect(webhookVerify).toHaveBeenCalledWith(params);
    expect(logger.error).toHaveBeenCalledWith('Unexpected error:', error);
    expect(webhookErrorResponseWithException).toHaveBeenCalledWith(
      'An unexpected error occurred while validating the gift card code.'
    );
    expect(result).toEqual(
      webhookErrorResponseWithException('An unexpected error occurred while validating the gift card code.')
    );
  });
});
