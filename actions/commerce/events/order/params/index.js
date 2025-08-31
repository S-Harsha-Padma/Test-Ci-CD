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
const { errorResponse } = require('../../../../utils');
const { HTTP_INTERNAL_ERROR, HTTP_OK } = require('../../../../../lib/http');
const stateLib = require('@adobe/aio-lib-state');

/**
 * Read cached order parameters
 *
 * @param {object} orderId - The order ID
 * @param {object} logger - The logger instance
 * @returns {Promise<object>} - The cached parameters or null if not found
 */
async function readCachedOrderParams(orderId, logger) {
  try {
    const state = await stateLib.init();
    logger.info('State initialized for reading cached order params');

    const cachedParams = await state.get(`halo-pushed-param-${orderId}`);

    if (!cachedParams?.value) {
      logger.info('No cached order parameters found');
      return null;
    }

    try {
      const cachedParams = await state.get(`halo-pushed-param-${orderId}`);
      const cachedXml = await state.get(`halo-pushed-xml-${orderId}`);

      const parsedParams = {
        params: cachedParams?.value ? JSON.parse(cachedParams.value) : null,
        xml: cachedXml?.value || null,
      };
      return parsedParams;
    } catch (parseError) {
      logger.error('Error parsing cached parameters:', parseError);
      return null;
    }
  } catch (error) {
    logger.error('Error reading cached order parameters:', error);
    return null;
  }
}

/**
 * Method main triggered by Adobe I/O Runtime.
 *
 * @param {object} params - The parameters for the method
 * @returns {Promise<object>} - A promise that resolves with the result object
 */
async function main(params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' });
  try {
    logger.info('Calling the ERP Method to read cached order parameters');
    logger.debug('params', params);

    // Read cached parameters
    const cachedParams = await readCachedOrderParams(params.data.ORDER_INCREMENT_ID_PARAM, logger);

    if (!cachedParams) {
      return {
        statusCode: HTTP_INTERNAL_ERROR,
        body: {
          success: false,
          message: 'No cached order parameters found',
        },
      };
    }

    logger.debug('Cached parameters:', cachedParams);

    return {
      statusCode: HTTP_OK,
      body: {
        success: true,
        params: cachedParams,
        message: 'Successfully retrieved cached order parameters',
      },
    };
  } catch (error) {
    logger.error(error);
    return errorResponse(HTTP_INTERNAL_ERROR, 'Error processing order', logger);
  }
}

exports.main = main;
