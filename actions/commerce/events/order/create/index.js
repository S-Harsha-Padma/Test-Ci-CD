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
const { errorResponse, stringParameters } = require('../../../../utils');
const { generateCrmXmlPayload, sendHaloErpSoapRequest, handleResponse } = require('../client/soap_client');
const { HTTP_INTERNAL_ERROR, HTTP_OK } = require('../../../../../lib/http');
const stateLib = require('@adobe/aio-lib-state');

/**
 * Method main triggered by Adobe I/O Runtime.
 *
 * @param {object} params - The parameters for the method
 * @returns {Promise<object>} - A promise that resolves with the result object
 */
async function main(params) {
  const data = JSON.parse(params.VERTEX_TAX_CLASS_MAPPING);
  const fed = JSON.parse(params.FEDEX_METHODS);
  return {
    statusCode: HTTP_OK,
      body: data,
      fedex: fed
  };
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' });
  try {
    logger.info('Calling the ERP main action');
    // params.data = getParams();
    if (params.ERP_LOG) {
      const orderId = params.data.value.order.increment_id;
      const state = await stateLib.init();
      const ttlInSeconds = 365 * 24 * 60 * 60;
      await state.put(`halo-pushed-param-${orderId}`, JSON.stringify(params), { ttl: ttlInSeconds });
    }
    logger.debug(stringParameters(params));

    // Process the order asynchronously
    processOrderAsync(params, logger).catch((error) => {
      logger.error('Error in async order processing:', error);
    });

    // Return success immediately
    return {
      statusCode: HTTP_OK,
      body: {
        success: true,
        message: 'ERP Order processing started successfully',
      },
    };
  } catch (error) {
    logger.error(error);
    return errorResponse(HTTP_INTERNAL_ERROR, 'Error processing order', logger);
  }
}

/**
 * @description Process the order asynchronously
 * @param {object} params - The parameters for the method
 * @param {object} logger - The logger instance
 * @returns {Promise<void>} - A promise that resolves with the result object
 */
async function processOrderAsync(params, logger) {
  try {
    const crmXmlPayload = await generateCrmXmlPayload(params, process, logger);
    logger.debug(crmXmlPayload);
    logger.info('Sending Erp SOAP request...');
    if (params.ERP_LOG) {
      const state = await stateLib.init();
      await state.put(`halo-pushed-xml-${params.data.value.order.increment_id}`, crmXmlPayload, {
        ttl: 365 * 24 * 60 * 60,
      });
    }
    const erpEndPoint = params.ERP_ENDPOINT;
    const responseText = await sendHaloErpSoapRequest(crmXmlPayload, erpEndPoint, logger);
    handleResponse(responseText, logger, params);
  } catch (error) {
    logger.error('Error in async order processing:', error);
    throw error;
  }
}

exports.main = main;
