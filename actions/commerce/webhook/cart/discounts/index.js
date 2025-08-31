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
const { getCustomerGroupById } = require('../../../../../lib/aio-state');
const { HTTP_OK } = require('../../../../../lib/http');

const {
  webhookErrorResponseWithException,
  webhookVerify,
  webhookSuccessResponse,
} = require('../../../../../lib/adobe-commerce');

/**
 * Remove the discount for specific customer groups
 *
 * @param {object} params the request parameters
 * @returns {string} the response
 */
async function main(params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' });

  try {
    const { success, error } = webhookVerify(params);
    if (!success) {
      logger.error(`Failed to verify the webhook signature: ${error}`);
      return webhookErrorResponseWithException(
        'Webhook signature Error: Please try again later or contact our customer support team for assistance.'
      );
    }
    logger.debug('Quote merge body payload', params);
    logger.info('Calling the main action for gift card and coupon removal after quote merge.');
    const body = JSON.parse(atob(params.__ow_body));

    const quote = body.data?.quote || {};
    logger.debug('Quote merge body payload', quote);

    const { customer_group_id: CustomerGroupId } = quote;

    const customerGroup = await getCustomerGroupById(params, logger, CustomerGroupId);
    logger.debug('Identified customer group', customerGroup);

    const operations = [];
    if (['CBRE Personnel', 'Purchase Order Eligible'].includes(customerGroup)) {
      // Remove gift cards
      operations.push({
        op: 'replace',
        path: 'data/quote/gift_cards',
        value: null,
      });
      // Remove coupon code
      operations.push({
        op: 'replace',
        path: 'data/quote/coupon_code',
        value: null,
      });
      return {
        statusCode: HTTP_OK,
        body: JSON.stringify(operations),
      };
    }
    return webhookSuccessResponse();
  } catch (error) {
    logger.error('Unexpected error:', error);
    return webhookErrorResponseWithException('An unexpected error occurred while removing coupon and gift card.');
  }
}

exports.main = main;
