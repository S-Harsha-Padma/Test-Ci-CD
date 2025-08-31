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

/**
 * Action : add cost center comment to order
 *
 * @param {object} params - The parameters for the action
 * @returns {object} the response
 */
async function main(params) {
  const logger = Core.Logger('main', { level: 'info' });

  try {
    logger.info('Calling the order comment update action for cost center');
    logger.debug(stringParameters(params));

    const fedExMethods = JSON.parse(params.FEDEX_METHODS || '{}');
    const { value } = params.data;
    const { entity_id: orderId, shipping_method: shippingMethod, payment = {} } = value.order;
    const { additional_information: paymentInfo = {} } = payment;

    if (!orderId) {
      logger.error('Order ID is missing');
      return actionErrorResponse(HTTP_INTERNAL_ERROR, 'Order ID is missing');
    }

    const allFedExMethods = [
      ...(fedExMethods.FEDEX || []).map((m) => `${params.FEDEX_CODE}_${m.method_code}`),
      ...(fedExMethods.FEDEX_INTL || []).map((m) => `${params.FEDEX_CODE}_${m.method_code}`),
    ];

    if (!allFedExMethods.includes(shippingMethod)) {
      return actionSuccessResponse('Shipping method not in FedEx list. No comment added.');
    }
    const costCenter = paymentInfo?.ext_shipping_info;
    if (!costCenter) {
      return actionSuccessResponse('Cost center number not available. No comment added.');
    }

    const commerceClient = await getAdobeCommerceClient(params);
    const requestBody = {
      statusHistory: {
        comment: `Cost Center Number: ${costCenter}`,
        is_customer_notified: 0,
        is_visible_on_front: 0,
        parent_id: orderId,
      },
    };

    const statusResponse = await commerceClient.orderCommentUpdate(orderId, requestBody);
    if (!statusResponse.success) {
      logger.error('Unexpected error adding cost center comment', { statusResponse, orderId });
      return actionErrorResponse(HTTP_INTERNAL_ERROR, 'Failed to add cost center comment');
    }

    return actionSuccessResponse('Cost center comment added successfully');
  } catch (error) {
    logger.error(error);
    return actionErrorResponse(error.statusCode || HTTP_INTERNAL_ERROR, error);
  }
}

exports.main = main;
