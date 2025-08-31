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
const stateLib = require('@adobe/aio-lib-state');
const { HTTP_NOT_FOUND } = require('../lib/http');
const { getAdobeCommerceClient } = require('../lib/adobe-commerce');

/**
 * Get Product By Sku
 *
 * @param {object} params - params.
 * @param {string} sku - Sku
 * @param {object} logger - logger.
 * @returns {object} product object | Null.
 */
async function getProductBySku(params, sku, logger) {
  try {
    const state = await stateLib.init();
    const sanitizedSku = sku.replace(/\s+/g, '-');
    const cachedProduct = await state.get(sanitizedSku);
    let items;
    if (cachedProduct?.value) {
      items = JSON.parse(cachedProduct.value);
    } else {
      const client = await getAdobeCommerceClient(params);
      const product = await client.getProductsBySku([sku]);
      items = product.message.items[0];
      await state.put(sanitizedSku, JSON.stringify(items), { ttl: 86400 });
    }
    if (!items) {
      logger.info(`Customer Group ID ${sku} not found`);
      return null;
    }
    return items;
  } catch (error) {
    logger.error('Error fetching customer group list:', error);
  }
  return null;
}

/**
 * Get Customer Group list
 *
 * @param {object} params - Description of params.
 * @param {object} logger - Description of logger.
 * @param {string} customerGroupId - customerGroupId.
 * @returns {object} Description of the return value.
 */
async function getCustomerGroupById(params, logger, customerGroupId) {
  try {
    const state = await stateLib.init();
    const cachedCustomerGroupList = await state.get('customer_group_list');
    let items;
    if (cachedCustomerGroupList?.value) {
      items = JSON.parse(cachedCustomerGroupList.value);
    } else {
      const client = await getAdobeCommerceClient(params);
      const customerGroupList = await client.getCustomerGroupList(logger);
      items = customerGroupList?.message?.items || [];
      await state.put('customer_group_list', JSON.stringify(items), { ttl: 86400 });
    }
    const result = items.find((item) => parseInt(item.id) === parseInt(customerGroupId));
    if (!result) {
      logger.info(`Customer Group ID ${customerGroupId} not found`);
      return null;
    }
    return result.code;
  } catch (error) {
    logger.error('Error fetching customer group list:', error);
  }
  return null;
}

/**
 * Get Customer Group Id from Code
 *
 * @param {object} params - Description of params.
 * @param {object} logger - Description of logger.
 * @returns {object} Description of the return value.
 */
async function getCustomerGroupIdFromCode(params, logger) {
  const reqCustomerGroupId = params?.CUSTOMER_GROUP_CODE?.replace(/\s+/g, '');
  if (!params?.CUSTOMER_GROUP_CODE) {
    logger.error('CUSTOMER_GROUP_CODE is required in params');
    throw new Error('CUSTOMER_GROUP_CODE is required');
  }

  try {
    const state = await stateLib.init();
    logger.info('State initialized');
    const cachedCustomerGroupId = await state.get(reqCustomerGroupId);

    // Check if we have a valid cached value
    if (cachedCustomerGroupId && cachedCustomerGroupId.value) {
      logger.info('Cached customer group object:', JSON.stringify(cachedCustomerGroupId));

      logger.debug('Cached customer group object:', JSON.stringify(cachedCustomerGroupId));
      logger.debug('Customer group ID fetched from cache:', cachedCustomerGroupId.value);
      return String(cachedCustomerGroupId.value);
    }

    // No valid cache, fetch from API
    logger.info('Cache miss, fetching from API');
    const client = await getAdobeCommerceClient(params);
    const customerDetailsResult = await client.getCustomerGroupIdByCode(params.CUSTOMER_GROUP_CODE);
    logger.debug(`Get Customer Group details API Response: ${JSON.stringify(customerDetailsResult)}`);

    if (!customerDetailsResult?.message?.items?.length) {
      throw new Error('Customer group not found');
    }

    const customerGroupId = customerDetailsResult.message.items[0].id;
    logger.debug(`Customer Group Id from API: ${customerGroupId}`);

    // Store in cache
    const ttlInSeconds = 365 * 24 * 60 * 60;
    await state.put(reqCustomerGroupId, String(customerGroupId), { ttl: ttlInSeconds });
    logger.info(`Stored Customer Group ID in cache for ${ttlInSeconds} seconds.`);

    return String(customerGroupId);
  } catch (error) {
    logger.error(`Error fetching customer group ID: ${error.message}`);
    return {
      statusCode: HTTP_NOT_FOUND,
      body: {
        success: false,
        message: 'Customer group not found',
      },
    };
  }
}

/**
 * Get Order Gift Message from API and cache the result
 *
 * @param {object} params - Description of params.
 * @param {object} logger - Description of logger.
 * @returns {object} Description of the return value.
 */
async function getOrderGiftMessage(params, logger) {
  const incrementId = params.data.value.order.increment_id;
  logger.info('incrementId', incrementId);
  if (!incrementId) {
    logger.error('ORDER_ID is required in params');
    throw new Error('ORDER_ID is required');
  }

  try {
    const state = await stateLib.init();
    logger.info('State initialized');
    await state.delete(incrementId);
    const cachedOrderGiftMessage = await state.get(incrementId);

    // Check if we have a valid cached value
    if (cachedOrderGiftMessage && cachedOrderGiftMessage.value) {
      logger.info('Cached order gift message object:', cachedOrderGiftMessage);
      logger.info('Cached message value is ', String(cachedOrderGiftMessage.value));
      try {
        return typeof cachedOrderGiftMessage.value === 'string'
          ? JSON.parse(cachedOrderGiftMessage.value)
          : cachedOrderGiftMessage.value;
      } catch (error) {
        logger.error('Error parsing cached gift message:', error);
        return cachedOrderGiftMessage.value;
      }
    }

    // No valid cache, fetch from API
    logger.info('Cache miss, fetching from API');
    const client = await getAdobeCommerceClient(params);
    const orderDetailsResult = await client.getOrdersByIncrementId(incrementId);

    logger.debug(`Get Order details API Response: ${JSON.stringify(orderDetailsResult)}`);

    if (!orderDetailsResult?.message?.items?.length) {
      throw new Error('Order not found');
    }

    const giftMessage = {};
    giftMessage.message = orderDetailsResult.message.items[0].extension_attributes.gift_message.message;
    giftMessage.from = orderDetailsResult.message.items[0].extension_attributes.gift_message.recipient;
    giftMessage.to = orderDetailsResult.message.items[0].extension_attributes.gift_message.sender;

    logger.debug(`Gift Message from API: ${JSON.stringify(giftMessage)}`);

    // Store in cache
    const ttlInSeconds = 365 * 24 * 60 * 60;
    await state.put(incrementId, JSON.stringify(giftMessage), { ttl: ttlInSeconds });
    logger.info(`Stored Order Gift Message in cache for ${ttlInSeconds} seconds.`);

    return giftMessage;
  } catch (error) {
    logger.error(`Error fetching order gift message: ${error.message}`);
    return {
      statusCode: HTTP_NOT_FOUND,
      body: {
        success: false,
        message: 'Order not found',
      },
    };
  }
}

module.exports = {
  getProductBySku,
  getCustomerGroupIdFromCode,
  getCustomerGroupById,
  getOrderGiftMessage,
};
