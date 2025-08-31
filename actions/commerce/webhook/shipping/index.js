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
const { validateShippingRestrictions } = require('./validation');

const { getUspsShippingMethod } = require('./methods/usps');
const { getCarrierShippingMethod } = require('./methods/carrier');
const { getWarehouseShippingMethod } = require('./methods/warehouse');
const { getFedExShippingMethods } = require('./methods/fedex');
const { getUpsShippingMethod } = require('./methods/ups');
const { webhookErrorResponseWithException, webhookVerify } = require('../../../../lib/adobe-commerce');
const { stringParameters } = require('../../../utils');
const { HTTP_OK } = require('../../../../lib/http');

/**
 * Shipping method
 *
 * @param {object} params the request parameters
 * @returns {string} the response
 */
async function main(params) {
  const logger = Core.Logger('shipping-method', { level: params.LOG_LEVEL || 'info' });

  try {
    const { success, error } = webhookVerify(params);
    if (!success) {
      logger.error(`Failed to verify the webhook signature: ${error}`);
      return webhookErrorResponseWithException(
        'Webhook signature Error: Please try again later or contact our customer support team for assistance.'
      );
    }
    params.rateRequest = JSON.parse(atob(params.__ow_body)).rateRequest;

    const request = params.rateRequest || {};
    const { customer: Customer = {} } = request;

    logger.info('Calling the usps shipping method validation');
    logger.debug(stringParameters(params));

    /* Validate shipping restrictions for products */
    await validateShippingRestrictions(params, logger);

    const result = {
      statusCode: HTTP_OK,
      body: {
        op: 'success',
      },
    };

    const UspsShippingMethods = getUspsShippingMethod(params);
    const WarehouseShippingMethods = getWarehouseShippingMethod(params);
    const FedExShippingMethods = await getFedExShippingMethods(params, Customer, logger);
    const CarrierShippingMethods = await getCarrierShippingMethod(params, Customer, logger);
    const upsShippingMethods = await getUpsShippingMethod(params, logger);

    const operations = [
      ...UspsShippingMethods,
      ...WarehouseShippingMethods,
      ...FedExShippingMethods,
      ...CarrierShippingMethods,
      ...upsShippingMethods,
    ];

    if (operations.length !== 0) {
      result.body = JSON.stringify(operations);
    }

    return result;
  } catch (error) {
    logger.error(`Error calling shipping method: ${error.message}`);
    return webhookErrorResponseWithException(`${error.message}`);
  }
}

exports.main = main;
