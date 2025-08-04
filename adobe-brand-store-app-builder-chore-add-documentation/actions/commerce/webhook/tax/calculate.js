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
const got = require('got');
const { stringParameters } = require('../../../utils');
const {
  generateVertexSoapRequest,
  parseVertexResponse,
  parseVertexErrorResponse,
} = require('./vertex/http/client/soap');
const {
  webhookSuccessResponse,
  webhookErrorResponseWithException,
  webhookVerify,
} = require('../../../../lib/adobe-commerce');
const { HTTP_OK } = require('../../../../lib/http');
const { getZonosResponse } = require('./zonos/index');

/**
 * Calculate tax for the given quote details
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
    params.oopQuote = JSON.parse(atob(params.__ow_body)).oopQuote;

    logger.info('Calling the tax calculate action');
    logger.debug(stringParameters(params));

    const quoteDetails = params.oopQuote;

    // Tax Exempt Class Verification
    const exemptList = params.TAX_EXEMPT_CLASSES?.split(',').map((item) => item.trim()) || [];
    const customerClass = quoteDetails.customer_tax_class?.trim();
    if (exemptList.includes(customerClass)) {
      return webhookSuccessResponse();
    }

    // Perform tax calculation if the country is set
    const countryCode = quoteDetails.ship_to_address?.country;
    let subTotal = 0;
    let quoteGwIncluded = false;
    let printedCardGwIncluded = false;
    quoteDetails.items = quoteDetails.items
      .map((item) => {
        // Set tax class for specific gift card SKU
        if (item.type === 'product' && item.sku === 'gift-card') {
          item.tax_class = 'Gift Certificates/Cards';
        }
        return item;
      })
      .filter((item) => {
        // Keep only the first printed_card_gw item
        if (item.type === 'printed_card_gw') {
          if (printedCardGwIncluded) {
            return false;
          }
          printedCardGwIncluded = true;
        }
        // Keep only the first quote_gw item
        if (item.type === 'quote_gw') {
          if (quoteGwIncluded) {
            return false;
          }
          quoteGwIncluded = true;
        }
        subTotal += item.unit_price * item.quantity;
        return true;
      });
    // Country-specific tax calculation logic
    let operations = {};
    if (countryCode && subTotal !== 0 && quoteDetails?.shipping?.shipping_method != null) {
      if (countryCode !== 'US') {
        operations = await getZonosResponse(params, quoteDetails, logger);
      } else {
        const soapRequest = await generateVertexSoapRequest(params, quoteDetails);
        const response = await got.post(params.VERTEX_SERVICE_URL, {
          body: soapRequest,
          headers: {
            'Content-Type': 'text/xml',
            SOAPAction: 'CalculateTax90',
          },
          responseType: 'text',
        });

        operations = await parseVertexResponse(response.body);
      }
      logger.debug('Tax calculation operation:', operations);

      if (operations.length > 0) {
        return {
          statusCode: HTTP_OK,
          body: JSON.stringify(operations),
        };
      }
      return webhookErrorResponseWithException(
        'Something went wrong with tax calculation. Please retry or contact customer support.'
      );
    }

    return webhookSuccessResponse();
  } catch (error) {
    logger.error(error);
    if (error?.response) {
      console.error('Error response body:', error.response?.body);
      const contentType = error.response?.headers['content-type'] || '';
      if (contentType.includes('xml')) {
        const message = await parseVertexErrorResponse(error.response?.body);
        return webhookErrorResponseWithException(`Tax Error: ${message}`);
      }
    }
    return webhookErrorResponseWithException(`Tax Error: ${error.message}`);
  }
}

exports.main = main;
