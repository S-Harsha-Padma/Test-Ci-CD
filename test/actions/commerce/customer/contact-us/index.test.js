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
const { main } = require('../../../../../actions/commerce/customer/contact-us/index');
const { sendEmail } = require('../../../../../actions/commerce/customer/contact-us/service/mailer');
const { actionSuccessResponse, actionErrorResponse } = require('../../../../../lib/adobe-commerce');

jest.mock('@adobe/aio-sdk');
jest.mock('../../../../../actions/commerce/customer/contact-us/service/mailer');
jest.mock('../../../../../lib/adobe-commerce');

describe('main function', () => {
  let logger;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };
    Core.Logger.mockReturnValue(logger);

    jest.clearAllMocks();
  });

  test('should send email successfully', async () => {
    // Mock sendEmail to resolve successfully
    sendEmail.mockResolvedValue(true);
    actionSuccessResponse.mockReturnValue({ statusCode: 200, body: { message: 'Email sent successfully' } });

    const params = { LOG_LEVEL: 'debug', email: 'test@example.com' };
    const result = await main(params);

    expect(logger.info).toHaveBeenCalledWith('Calling the contact-us main action');
    expect(sendEmail).toHaveBeenCalledWith(params, logger);
    expect(actionSuccessResponse).toHaveBeenCalledWith('Email sent successfully');
    expect(result).toEqual({ statusCode: 200, body: { message: 'Email sent successfully' } });
  });

  test('should handle email sending failure', async () => {
    // Mock sendEmail to resolve with false
    sendEmail.mockResolvedValue(false);
    actionErrorResponse.mockReturnValue({ statusCode: 500, body: { error: 'Email sending failed' } });

    const params = { LOG_LEVEL: 'debug', email: 'test@example.com' };
    const result = await main(params);

    // Assertions
    expect(logger.info).toHaveBeenCalledWith('Calling the contact-us main action');
    expect(sendEmail).toHaveBeenCalledWith(params, logger);
    expect(actionErrorResponse).toHaveBeenCalledWith(500, 'Email sending failed', logger);
    expect(result).toEqual({ statusCode: 500, body: { error: 'Email sending failed' } });
  });

  test('should handle errors during execution', async () => {
    // Mock sendEmail to throw an error
    const error = new Error('Unexpected error');
    sendEmail.mockRejectedValue(error);
    actionErrorResponse.mockReturnValue({ statusCode: 500, body: { error: 'Email sending failed' } });

    const params = { LOG_LEVEL: 'debug', email: 'test@example.com' };
    const result = await main(params);

    expect(logger.info).toHaveBeenCalledWith('Calling the contact-us main action');
    expect(sendEmail).toHaveBeenCalledWith(params, logger);
    expect(logger.error).toHaveBeenCalledWith(error);
    expect(actionErrorResponse).toHaveBeenCalledWith(500, 'Email sending failed', logger);
    expect(result).toEqual({ statusCode: 500, body: { error: 'Email sending failed' } });
  });
});
