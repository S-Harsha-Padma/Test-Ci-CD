/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const { Core } = require('@adobe/aio-sdk');
const { stringParameters } = require('../../../utils');
const {
  webhookSuccessResponse,
  webhookVerify,
  webhookErrorResponseWithException,
} = require('../../../../lib/adobe-commerce');
const { createAnAcceptPaymentTransaction } = require('../../payment/authnet/accept-payment-transaction-client');
const { HTTP_OK } = require('../../../../lib/http');

/**
 * Validate Payment
 *
 * @param {object} params the request parameters
 * @returns {string} the response
 */
async function main(params) {
  const logger = Core.Logger('validate-payment', { level: params.LOG_LEVEL || 'info' });

  try {
    const { success, error } = webhookVerify(params);
    if (!success) {
      logger.error(`Failed to verify the webhook signature: ${error}`);
      return webhookErrorResponseWithException(
        'Webhook signature Error: Please try again later or contact our customer support team for assistance.'
      );
    }
    const body = JSON.parse(atob(params.__ow_body));

    logger.info('Calling the validate-payment action');
    logger.debug(stringParameters(params));
    const { order } = body;
    const { payment: paymentInfo } = order;

    if (paymentInfo?.method === params.AUTHORIZENET_PAYMENT_METHOD) {
      const paymentNonce = paymentInfo?.additional_information?.payment_nonce;
      if (!paymentNonce) {
        return webhookErrorResponseWithException(`Please retry the authorize.net payment. Missing payment nonce.`);
      }
      // Authorize & Capture the authorize.net payment
      const result = await createAnAcceptPaymentTransaction(params, order, logger);
      logger.debug(`payment capture response: ${result}`);
      if (!result.success) {
        return webhookErrorResponseWithException(result?.message);
      }
      return {
        statusCode: HTTP_OK,
        body: [
          {
            op: 'add',
            path: 'order/status_histories',
            value: {
              data: {
                comment: `Authorize.net Transaction Id: ${result.transactionId || 'N/A'}`,
              },
            },
            instance: '\\Magento\\Sales\\Api\\Data\\OrderStatusHistoryInterface',
          },
          {
            op: 'add',
            path: 'order/payment/additional_information/transaction_id',
            value: result.transactionId,
          },
        ],
      };
    }
    return webhookSuccessResponse();
  } catch (error) {
    logger.error(error);
    return webhookErrorResponseWithException(error.message);
  }
}

exports.main = main;
