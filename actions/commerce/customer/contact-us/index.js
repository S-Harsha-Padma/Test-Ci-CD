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
const { stringParameters } = require('../../../utils');
const { sendEmail } = require('./service/mailer');
const { actionSuccessResponse, actionErrorResponse } = require('../../../../lib/adobe-commerce');

/**
 * Main function that will be executed by Adobe I/O Runtime
 * @param {object} params Action input parameters.
 * @returns {object} Success|Error message.
 */
async function main(params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' });

  try {
    // 'info' is the default level if not set
    logger.info('Calling the contact-us main action');
    logger.debug(stringParameters(params));
    const result = await sendEmail(params, logger);
    logger.info('Email sent:', result);
    if (result) {
      return actionSuccessResponse('Email sent successfully');
    } else {
      return actionErrorResponse(500, 'Email sending failed', logger);
    }
  } catch (error) {
    logger.error(error);
    return actionErrorResponse(500, 'Email sending failed', logger);
  }
}
exports.main = main;
