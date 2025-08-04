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
const { HTTP_BAD_REQUEST } = require('../../lib/http');
const { validateData } = require('./validator');
const { stringParameters } = require('../utils');
const { getAdobeCommerceClientSSO } = require('../../lib/adobe-commerce');

/**
 * Calling Commerce end points
 */
const { actionErrorResponse, webhookErrorResponse } = require('../../lib/adobe-commerce');

/**
 * This web action is used to regsiter customer from
 *
 * @param {object} params - method params includes environment and request data
 * @returns {object} - response with success status and result
 */
async function main(params) {
  const logger = Core.Logger('customer creation', { level: params.LOG_LEVEL || 'info' });
  logger.info('Start processing request');
  logger.debug(`Received params: ${stringParameters(params)}`);
  let callCustomerGraphQL;
  try {
    /**
     * Validate requested data params
     */
    logger.debug(`Validate data: ${JSON.stringify(params)}`);
    const validation = validateData(params);
    if (!validation.success) {
      logger.error(`Validation failed with error: ${validation.message}`);
      return actionErrorResponse(HTTP_BAD_REQUEST, validation.message);
    }

    callCustomerGraphQL = await getAdobeCommerceClientSSO(params);
    return callCustomerGraphQL;
  } catch (error) {
    logger.error(`Server error: ${error.message}`, error);
    logger.error(`Error processing the request: ${error}`);
    return webhookErrorResponse(`Sorry, we are not able to process your request at the moment.`);
  }
}

exports.main = main;
