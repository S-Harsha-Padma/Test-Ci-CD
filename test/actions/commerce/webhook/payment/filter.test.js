const { main } = require('../../../../../actions/commerce/webhook/payment/filter');
const { Core } = require('@adobe/aio-sdk');
const { HTTP_OK } = require('../../../../../lib/http');
const { getCustomerGroupById } = require('../../../../../lib/aio-state');
const { webhookErrorResponseWithException, webhookVerify } = require('../../../../../lib/adobe-commerce');

jest.mock('@adobe/aio-sdk');
jest.mock('../../../../../lib/aio-state');
jest.mock('../../../../../lib/adobe-commerce');

describe('filter-payment main function', () => {
  let logger;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    };
    Core.Logger.mockReturnValue(logger);
    jest.clearAllMocks();
  });

  it('should return success operation if signature is valid and customer group ID matches', async () => {
    const params = {
      LOG_LEVEL: 'info',
      __ow_headers: { 'x-adobe-commerce-webhook-signature': 'valid-signature' },
      __ow_body: btoa(JSON.stringify({ payload: { customer: { group_id: '4' } } })),
      PUBLIC_KEY: 'public-key',
      CUSTOMER_GROUP_CODE: 'Purchase Order Eligible,CBRE Personnel',
    };

    webhookVerify.mockReturnValue({ success: true });
    getCustomerGroupById.mockResolvedValue('Purchase Order Eligible');

    const result = await main(params);

    expect(result).toEqual({
      statusCode: HTTP_OK,
      body: {
        op: 'success',
      },
    });

    expect(logger.info).toHaveBeenCalledWith('Received payload: ', params);
    expect(logger.info).toHaveBeenCalledWith('Payload Customer Group Code : ', 'Purchase Order Eligible');
  });

  it('should return error response if signature is invalid', async () => {
    const params = {
      LOG_LEVEL: 'info',
      __ow_headers: { 'x-adobe-commerce-webhook-signature': 'invalid-signature' },
      __ow_body: btoa(JSON.stringify({ payload: { customer: { group_id: '123' } } })),
      PUBLIC_KEY: 'public-key',
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

  it('should return remove payment method operation if customer group ID does not match', async () => {
    const params = {
      LOG_LEVEL: 'info',
      __ow_headers: { 'x-adobe-commerce-webhook-signature': 'valid-signature' },
      __ow_body: btoa(JSON.stringify({ payload: { customer: { group_id: '456' } } })),
      PUBLIC_KEY: 'public-key',
    };

    webhookVerify.mockReturnValue({ success: true });
    getCustomerGroupById.mockResolvedValue('456');

    const result = await main(params);

    expect(result).toEqual({
      statusCode: HTTP_OK,
      body: JSON.stringify([{ op: 'add', path: 'result', value: { code: 'purchaseorder' } }]),
    });
    expect(logger.info).toHaveBeenCalledWith('Received payload: ', params);
    expect(logger.info).toHaveBeenCalledWith('Payload Customer Group Code : ', '456');
  });

  it('should return remove payment method operation on exception', async () => {
    const params = {
      LOG_LEVEL: 'info',
      __ow_headers: { 'x-adobe-commerce-webhook-signature': 'valid-signature' },
      __ow_body: btoa(JSON.stringify({ payload: { customer: { group_id: '123' } } })),
      PUBLIC_KEY: 'public-key',
    };

    webhookVerify.mockReturnValue({ success: true });
    getCustomerGroupById.mockRejectedValue(new Error('Test error'));

    const result = await main(params);

    expect(result).toEqual({
      statusCode: HTTP_OK,
      body: JSON.stringify([{ op: 'add', path: 'result', value: { code: 'purchaseorder' } }]),
    });
    expect(logger.error).toHaveBeenCalledWith('Server error: Test error');
  });
});
