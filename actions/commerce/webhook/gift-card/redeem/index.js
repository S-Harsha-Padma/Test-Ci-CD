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

const {
  getAdobeCommerceClient,
  webhookErrorResponseWithException,
  webhookVerify,
  webhookSuccessResponse,
} = require('../../../../../lib/adobe-commerce');

/**
 * Main function that will be executed by Adobe I/O Runtime
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

    logger.info('Calling the main action for gift card redeem');
    const body = JSON.parse(atob(params.__ow_body));
    const giftCardRequest = body.giftCard || {};

    logger.debug('giftCardRequest', giftCardRequest);

    const cartId = giftCardRequest.cartId;
    if (!cartId) {
      return webhookErrorResponseWithException('Cart ID is required');
    }

    const cartResult = await getCommerceCart(cartId, params);
    logger.debug('cartResult', cartResult);
    if (!cartResult.success) {
      return webhookErrorResponseWithException('Failed to retrieve cart information');
    }

    const isGuest = cartResult.message.customer_is_guest;
    if (isGuest) {
      return webhookSuccessResponse();
    }

    const groupId = cartResult.message.customer.group_id;
    const customerGroup = await getCustomerGroupById(params, logger, groupId);

    if (customerGroup === 'CBRE Personnel' || customerGroup === 'Purchase Order Eligible') {
      return webhookErrorResponseWithException('CBRE Personnel are not authorized to redeem gift cards.');
    }

    return webhookSuccessResponse();
  } catch (error) {
    logger.error('Unexpected error:', error);
    return webhookErrorResponseWithException('An unexpected error occurred while validating the gift card code.');
  }
}

/**
 * Get the Commerce Cart
 *
 * @param {string} cartId - The ID of the cart to retrieve
 * @param {object} params - The parameters for the request
 * @returns {object} the Commerce Cart
 */
async function getCommerceCart(cartId, params) {
  const client = await getAdobeCommerceClient(params);
  return client.getCart(cartId);
}

exports.main = main;
