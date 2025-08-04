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
const { stringParameters } = require('../../../../utils');
const { HTTP_INTERNAL_ERROR } = require('../../../../../lib/http');
const {
  getAdobeCommerceClient,
  actionErrorResponse,
  actionSuccessResponse,
} = require('../../../../../lib/adobe-commerce');
const { handleInvoiceAndComment } = require('./create');

/**
 * Action : create invoice
 *
 * @param {object} params - The parameters for the cron job
 * @returns {object} the response
 */
async function main(params) {
  const logger = Core.Logger('main', { level: 'info' });

  try {
    logger.info('Calling the invoice action');
    logger.debug(stringParameters(params));
    const authorizeMethodCode = params.AUTHORIZENET_PAYMENT_METHOD || '';
    const { value } = params.data;
    const { entity_id: orderId, payment: paymentInfo = {} } = value.order;

    const paymentMethods = params.PAYMENT_METHODS_FOR_INVOICE_CREATION.split(',')
      .map((method) => method.trim())
      .filter((method) => method !== '');

    if (paymentMethods.includes(paymentInfo.method)) {
      if (!orderId) {
        logger.error('Order ID is missing');
        return actionErrorResponse(HTTP_INTERNAL_ERROR, 'Order ID is missing');
      }

      const commerceClient = await getAdobeCommerceClient(params);
      return await handleInvoiceAndComment(commerceClient, orderId, paymentInfo, authorizeMethodCode, logger);
    }

    return actionSuccessResponse('Payment Methods for invoice creation not matched');
  } catch (error) {
    logger.error(error);
    return actionErrorResponse(error.statusCode, error);
  }
}

exports.main = main;
