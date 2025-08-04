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
const { main } = require('../../../../../actions/commerce/customer/group-name/index');
const { errorResponse } = require('../../../../../actions/utils');
const { HTTP_OK, HTTP_NOT_FOUND, HTTP_INTERNAL_ERROR } = require('../../../../../lib/http');
const { getAdobeCommerceClient } = require('../../../../../lib/adobe-commerce');

jest.mock('@adobe/aio-sdk', () => ({
  Core: {
    Logger: jest.fn(() => ({
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    })),
  },
}));

jest.mock('../../../../../lib/adobe-commerce', () => ({
  getAdobeCommerceClient: jest.fn(),
}));

jest.mock('../../../../../actions/utils', () => ({
  errorResponse: jest.fn((code, message) => ({
    statusCode: code,
    body: { error: message },
  })),
  stringParameters: jest.fn(() => 'stringifiedParams'),
}));

describe('get-customer-group-name', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      getCustomerGroup: jest.fn(),
    };
    getAdobeCommerceClient.mockResolvedValue(mockClient);
    jest.clearAllMocks();
  });

  it('should return customer group details for a valid UID', async () => {
    const groupId = '3';
    const encodedUid = Buffer.from(groupId, 'utf-8').toString('base64');

    mockClient.getCustomerGroup.mockResolvedValue({
      success: true,
      message: {
        id: groupId,
        code: 'Wholesale',
      },
    });

    const response = await main({
      customer: { uid: encodedUid },
      LOG_LEVEL: 'debug',
    });

    expect(getAdobeCommerceClient).toHaveBeenCalled();
    expect(mockClient.getCustomerGroup).toHaveBeenCalledWith(groupId);
    expect(response).toEqual({
      statusCode: HTTP_OK,
      body: {
        id: groupId,
        name: 'Wholesale',
      },
    });
  });

  it('should return 404 if group not found', async () => {
    const groupId = '99';
    const encodedUid = Buffer.from(groupId, 'utf-8').toString('base64');

    mockClient.getCustomerGroup.mockResolvedValue({
      success: false,
      message: 'Group not found',
    });

    const response = await main({
      customer: { uid: encodedUid },
    });

    expect(response).toEqual({
      statusCode: HTTP_NOT_FOUND,
      body: { error: 'Customer group not found for provided uid.' },
    });
    expect(errorResponse).toHaveBeenCalledWith(
      HTTP_NOT_FOUND,
      'Customer group not found for provided uid.',
      expect.any(Object)
    );
  });

  it('should return 500 on exception', async () => {
    const encodedUid = Buffer.from('5', 'utf-8').toString('base64');
    getAdobeCommerceClient.mockRejectedValue(new Error('Connection error'));

    const response = await main({
      customer: { uid: encodedUid },
    });

    expect(response).toEqual({
      statusCode: HTTP_INTERNAL_ERROR,
      body: { error: 'Something went wrong while retrieving customer group info.' },
    });
    expect(errorResponse).toHaveBeenCalledWith(
      HTTP_INTERNAL_ERROR,
      'Something went wrong while retrieving customer group info.',
      expect.any(Object)
    );
  });
});
