const { Core } = require('@adobe/aio-sdk');
const { main } = require('../../../../../actions/commerce/webhook/payment/validate');
const {
  webhookSuccessResponse,
  webhookVerify,
  webhookErrorResponseWithException,
} = require('../../../../../lib/adobe-commerce');
const { stringParameters } = require('../../../../../actions/utils');
const {
  createAnAcceptPaymentTransaction,
} = require('../../../../../actions/commerce/payment/authnet/accept-payment-transaction-client');

const HTTP_OK = 200;
jest.mock('@adobe/aio-sdk');
jest.mock('../../../../../lib/adobe-commerce', () => ({
  webhookSuccessResponse: jest.fn(),
  webhookVerify: jest.fn(),
  webhookErrorResponseWithException: jest.fn(),
}));
jest.mock('../../../../../actions/utils', () => ({
  stringParameters: jest.fn(),
}));
jest.mock('../../../../../actions/commerce/payment/authnet/accept-payment-transaction-client', () => ({
  createAnAcceptPaymentTransaction: jest.fn(),
}));

describe('validate-payment action', () => {
  let logger;
  const VALID_SIGNATURE = 'valid-signature';
  const INVALID_SIGNATURE = 'invalid-signature';
  const PUBLIC_KEY = 'public-key';

  const NON_AUTHNET_ORDER = {
    order: {
      payment: {
        method: 'paypal',
      },
    },
  };

  const AUTHNET_ORDER_WITHOUT_TRANSACTION = {
    order: {
      payment: {
        method: 'authorizenet',
        additional_information: {},
      },
    },
  };

  const AUTHNET_ORDER_WITH_TRANSACTION = {
    order: {
      shipping_incl_tax: 20,
      grand_total: 30,
      customer_email: 'test@gmail.com',
      items: [
        {
          sku: 'ADB309',
          qty_ordered: 1,
          name: 'backpack',
          price: 60,
        },
      ],
      addresses: [
        {
          firstname: 'Test',
          lastname: 'R',
          city: 'Midway',
          region: 'California',
          region_id: '12',
          postcode: '92656',
          country_id: 'US',
          street: '23511 ALISO CREEK RD',
        },
      ],
      payment: {
        method: 'authorizenet',
        additional_information: {
          payment_nonce: 'xxxtest',
        },
      },
    },
  };

  const createParams = (orderData, logLevel = 'info', signature = VALID_SIGNATURE) => ({
    LOG_LEVEL: logLevel,
    AUTHORIZENET_PAYMENT_METHOD: 'authorizenet',
    PUBLIC_KEY: 'public-key',
    __ow_headers: { 'x-adobe-commerce-webhook-signature': signature },
    __ow_body: btoa(JSON.stringify(orderData)),
  });

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };
    Core.Logger.mockReturnValue(logger);
    stringParameters.mockImplementation((params) => JSON.stringify(params));
    webhookSuccessResponse.mockReturnValue('success');
    webhookErrorResponseWithException.mockReturnValue('error with exception');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should handle webhook signature verification failure', async () => {
    const params = createParams(NON_AUTHNET_ORDER, 'info', INVALID_SIGNATURE);
    webhookVerify.mockReturnValue({ success: false, error: 'Invalid signature' });

    const response = await main(params);

    expect(webhookVerify).toHaveBeenCalledWith(params);
    expect(logger.error).toHaveBeenCalledWith('Failed to verify the webhook signature: Invalid signature');
    expect(webhookErrorResponseWithException).toHaveBeenCalledWith(
      'Webhook signature Error: Please try again later or contact our customer support team for assistance.'
    );
    expect(response).toEqual('error with exception');
  });

  test('should validate and process non-authorizenet payment method', async () => {
    const params = createParams(NON_AUTHNET_ORDER);
    webhookVerify.mockReturnValue({ success: true });

    const response = await main(params);

    expect(webhookVerify).toHaveBeenCalledWith(params);
    expect(logger.info).toHaveBeenCalledWith('Calling the validate-payment action');
    expect(logger.debug).toHaveBeenCalledWith(JSON.stringify(params));
    expect(createAnAcceptPaymentTransaction).not.toHaveBeenCalled();
    expect(webhookSuccessResponse).toHaveBeenCalled();
    expect(response).toEqual('success');
  });

  test('should return an error when transaction_id is missing for authorizenet payment', async () => {
    const params = createParams(AUTHNET_ORDER_WITHOUT_TRANSACTION);
    webhookVerify.mockReturnValue({ success: true });
    webhookErrorResponseWithException.mockReturnValue('error: missing transaction_id');

    const response = await main(params);

    expect(webhookVerify).toHaveBeenCalledWith(params);
    expect(webhookErrorResponseWithException).toHaveBeenCalledWith(
      'Please retry the authorize.net payment. Missing payment nonce.'
    );
    expect(response).toEqual('error: missing transaction_id');
  });

  test('should return an error when accept transaction fails for authorizenet payment', async () => {
    const params = createParams(AUTHNET_ORDER_WITH_TRANSACTION);
    const result = { success: false, message: 'Invalid transaction' };

    webhookVerify.mockReturnValue({ success: true });
    createAnAcceptPaymentTransaction.mockResolvedValue(result);
    webhookErrorResponseWithException.mockReturnValue('error: invalid transaction');

    const response = await main(params);

    expect(webhookVerify).toHaveBeenCalledWith(params);
    expect(createAnAcceptPaymentTransaction).toHaveBeenCalledWith(params, AUTHNET_ORDER_WITH_TRANSACTION.order, logger);
    expect(logger.debug).toHaveBeenCalledWith(`payment capture response: [object Object]`);
    expect(webhookErrorResponseWithException).toHaveBeenCalledWith('Invalid transaction');
    expect(response).toEqual('error: invalid transaction');
  });

  test('should return success when accept transaction succeeds for authorizenet payment', async () => {
    const params = createParams(AUTHNET_ORDER_WITH_TRANSACTION);
    const result = { success: true, transactionId: 'txn_123456' };

    webhookVerify.mockReturnValue({ success: true });
    createAnAcceptPaymentTransaction.mockResolvedValue(result);

    const response = await main(params);

    expect(webhookVerify).toHaveBeenCalledWith(params);
    expect(createAnAcceptPaymentTransaction).toHaveBeenCalledWith(params, AUTHNET_ORDER_WITH_TRANSACTION.order, logger);
    expect(logger.debug).toHaveBeenCalledWith(`payment capture response: [object Object]`);
    expect(webhookSuccessResponse).not.toHaveBeenCalled();
    expect(response).toEqual({
      statusCode: HTTP_OK,
      body: [
        {
          op: 'add',
          path: 'order/status_histories',
          value: {
            data: {
              comment: 'Authorize.net Transaction Id: txn_123456',
            },
          },
          instance: '\\Magento\\Sales\\Api\\Data\\OrderStatusHistoryInterface',
        },
        {
          op: 'add',
          path: 'order/payment/additional_information/transaction_id',
          value: 'txn_123456',
        },
      ],
    });
  });

  test('should handle unexpected errors during payment validation', async () => {
    const params = createParams(AUTHNET_ORDER_WITH_TRANSACTION);
    const errorMessage = 'Unexpected validation error';
    webhookVerify.mockReturnValue({ success: true });
    createAnAcceptPaymentTransaction.mockImplementation(() => {
      throw new Error(errorMessage);
    });
    webhookErrorResponseWithException.mockReturnValue('error: unexpected error');

    const response = await main(params);

    expect(webhookVerify).toHaveBeenCalledWith(params);
    expect(logger.error).toHaveBeenCalledWith(expect.any(Error));
    expect(webhookErrorResponseWithException).toHaveBeenCalledWith(errorMessage);
    expect(response).toEqual('error: unexpected error');
  });

  test('should set default log level if not provided', async () => {
    const params = {
      __ow_headers: { 'x-adobe-commerce-webhook-signature': VALID_SIGNATURE },
      __ow_body: btoa(JSON.stringify(NON_AUTHNET_ORDER)),
      PUBLIC_KEY,
    };
    webhookVerify.mockReturnValue({ success: true });

    await main(params);

    expect(Core.Logger).toHaveBeenCalledWith('validate-payment', { level: 'info' });
  });
});
