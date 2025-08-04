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
const { HTTP_OK } = require('../../../../lib/http');
const { getCustomerGroupById } = require('../../../../lib/aio-state');
const { webhookErrorResponseWithException, webhookVerify } = require('../../../../lib/adobe-commerce');

/**
 * This action returns the list of out-of-process payment method codes
 * that needs to be filtered out from the list of available payment methods.
 * It has to be configured as Commerce Webhook in the Adobe Commerce Admin.
 *
 * @param {object} params the input parameters
 * @returns {Promise<object>} the response object
 * @see https://developer.adobe.com/commerce/extensibility/webhooks
 */
async function main(params) {
  const logger = Core.Logger('filter-payment', { level: params.LOG_LEVEL || 'info' });
  const { success, error } = webhookVerify(params);
  if (!success) {
    logger.error(`Failed to verify the webhook signature: ${error}`);
    return webhookErrorResponseWithException(
      'Webhook signature Error: Please try again later or contact our customer support team for assistance.'
    );
  }

  try {
    const { customer: Customer = {} } = JSON.parse(atob(params.__ow_body)).payload;
    const allowedGroupCodes = (params.CUSTOMER_GROUP_CODE || '')
      .split(',')
      .map((code) => code.trim().replace(/^'+|'+$/g, ''));

    if (
      Customer !== null &&
      typeof Customer === 'object' &&
      Object.prototype.hasOwnProperty.call(Customer, 'group_id')
    ) {
      const customerGroupCode = await getCustomerGroupById(params, logger, Customer?.group_id);
      logger.info('Received payload: ', params);
      logger.info('Payload Customer Group Code : ', customerGroupCode);

      if (allowedGroupCodes.includes(customerGroupCode)) {
        return {
          statusCode: HTTP_OK,
          body: {
            op: 'success',
          },
        };
      }
    }
  } catch (error) {
    logger.error(`Server error: ${error.message}`);
  }

  return {
    statusCode: HTTP_OK,
    body: JSON.stringify([removePaymentMethodOperation('purchaseorder')]),
  };
}

/**
 * Remove a payment method from the list of available payment methods.
 *
 * @param {string} paymentCode - The code of the payment method that needs to be filtered out
 * @returns {object} The payment removal operation object
 */
function removePaymentMethodOperation(paymentCode) {
  return {
    op: 'add',
    path: 'result',
    value: {
      code: paymentCode,
    },
  };
}

exports.main = main;
