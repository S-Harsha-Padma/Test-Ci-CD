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
const { errorResponse, stringParameters } = require('../../utils');
const { getAccessToken, validateAddress } = require('./../http/client');
const stateLib = require('@adobe/aio-lib-state');
const { HTTP_BAD_REQUEST, HTTP_UNAUTHORIZED, HTTP_INTERNAL_ERROR } = require('../../../lib/http');

/**
 * Validate address
 *
 * @param {object} params the request parameters
 * @returns {string} the response
 */
async function main(params) {
  const logger = Core.Logger('ups-address-validation', { level: params.LOG_LEVEL || 'info' });

  try {
    logger.info('Calling the UPS address validation action');
    logger.debug(stringParameters(params.address));

    // Check for required credentials
    if (!params.CLIENT_ID || !params.CLIENT_SECRET || !params.SERVICE_DOMAIN) {
      return errorResponse(HTTP_BAD_REQUEST, 'Something went wrong. Client requires configuration.', logger);
    }

    const state = await stateLib.init();
    const storedTokenData = await state.get('ups_token');

    let accessToken;
    if (storedTokenData?.value) {
      accessToken = storedTokenData.value;
      logger.info('Using cached UPS access token.');
    } else {
      logger.info('Fetching new UPS access token.');
      const tokenResponse = await getAccessToken(params);
      if (!tokenResponse || !tokenResponse.access_token) {
        return errorResponse(HTTP_UNAUTHORIZED, 'Failed to get access token', logger);
      }
      accessToken = tokenResponse.access_token;

      const bufferTimeInSeconds = 60 * 5; // 5-minute buffer before expiration
      const ttlWithBuffer = parseInt(tokenResponse.expires_in) - bufferTimeInSeconds;
      // Store token with expiration time
      await state.put('ups_token', accessToken, { ttl: ttlWithBuffer });
    }

    // Calling address validation api
    return await validateAddress(params, accessToken);
  } catch (error) {
    return errorResponse(
      HTTP_INTERNAL_ERROR,
      'There is a problem calling address validation api. Please try later.',
      logger
    );
  }
}

exports.main = main;
