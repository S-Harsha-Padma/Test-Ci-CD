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
const { main } = require('../../../../actions/commerce/inventory/index');
const SFTPClient = require('ssh2-sftp-client');
const { updateInventory } = require('../../../../actions/commerce/inventory/update-inventory-service');
const { errorResponse } = require('../../../../actions/utils');
const { HTTP_OK, HTTP_BAD_REQUEST, HTTP_INTERNAL_ERROR } = require('../../../../lib/http');

jest.mock('ssh2-sftp-client');
jest.mock('@adobe/aio-sdk', () => ({
  Core: {
    Logger: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    })),
  },
}));
jest.mock('../../../../actions/commerce/inventory/update-inventory-service', () => ({
  updateInventory: jest.fn(),
}));
jest.mock('../../../../actions/utils', () => ({
  errorResponse: jest.fn(),
}));

describe('inventory-update main', () => {
  let sftpMock;

  beforeEach(() => {
    jest.clearAllMocks();
    sftpMock = {
      connect: jest.fn(),
      list: jest.fn(),
      get: jest.fn(),
      exists: jest.fn(),
    };
    SFTPClient.mockImplementation(() => sftpMock);
  });

  it('should return error if SFTP credentials or path are missing', async () => {
    const params = {};

    const mockedErrorResponse = { statusCode: HTTP_BAD_REQUEST, body: { success: false, message: 'error' } };
    errorResponse.mockResolvedValue(mockedErrorResponse);

    const result = await main(params);

    expect(errorResponse).toHaveBeenCalledWith(
      HTTP_BAD_REQUEST,
      'SFTP credentials and remote path missing.',
      expect.any(Object)
    );
    expect(result).toEqual(mockedErrorResponse);
  });
  it('should process inventory and call updateInventory', async () => {
    const params = {
      SFTP_USERNAME: 'user',
      SFTP_PASSWORD: 'pass',
      SFTP_HOST: 'example.com',
      FILE_NAME: 'inventory',
      SFTP_REMOTE_DIR: '/',
      LOG_LEVEL: 'debug',
    };

    const mockCsvData = `Program ID,Item Code,Description 1,Description 2,Obsolete,Qty On Hand,Committed Qty,Qty Available
      123,SKU001,desc1,desc2,N,5,0,5
      124,SKU002,desc3,desc4,N,-3,0,-3`;

    const mockFileBuffer = Buffer.from(mockCsvData);

    const mockFileList = [
      {
        name: 'inventory.csv',
        type: '-',
        modifyTime: new Date().getTime(),
      },
    ];

    sftpMock.connect.mockResolvedValue();
    sftpMock.list.mockResolvedValue(mockFileList);
    sftpMock.get.mockResolvedValue(mockFileBuffer);

    updateInventory.mockResolvedValue({
      statusCode: HTTP_OK,
      body: { success: true },
    });

    const result = await main(params);

    expect(sftpMock.connect).toHaveBeenCalledWith({
      host: 'example.com',
      port: 22,
      username: 'user',
      password: 'pass',
    });

    expect(sftpMock.list).toHaveBeenCalledWith('/');
    expect(sftpMock.get).toHaveBeenCalledWith('/inventory.csv');

    expect(updateInventory).toHaveBeenCalledWith(
      [
        { sku: 'SKU001', qty: 5 },
        { sku: 'SKU002', qty: -3 },
      ],
      params,
      expect.any(Object)
    );

    expect(result).toEqual({
      statusCode: HTTP_OK,
      body: { success: true },
    });
  });

  it('should handle empty inventory data', async () => {
    const params = {
      SFTP_USERNAME: 'user',
      SFTP_PASSWORD: 'pass',
      SFTP_HOST: 'example.com',
      FILE_NAME: 'inventory',
      SFTP_REMOTE_DIR: '/',
    };

    const mockCsvData = ``;
    const mockFileBuffer = Buffer.from(mockCsvData);

    const mockFileList = [
      {
        name: 'inventory.csv',
        type: '-',
        modifyTime: new Date().getTime(),
      },
    ];

    sftpMock.connect.mockResolvedValue();
    sftpMock.list.mockResolvedValue(mockFileList);
    sftpMock.get.mockResolvedValue(mockFileBuffer);

    const result = await main(params);

    expect(updateInventory).not.toHaveBeenCalled();

    expect(result).toEqual({
      statusCode: HTTP_OK,
      body: { success: false, message: 'File is empty.' },
    });
  });

  it('should handle unexpected errors and return errorResponse', async () => {
    const params = {
      SFTP_USERNAME: 'user',
      SFTP_PASSWORD: 'pass',
      SFTP_HOST: 'example.com',
      FILE_NAME: 'inventory',
      SFTP_REMOTE_DIR: '/',
    };

    const mockError = new Error('SFTP connection failed');
    sftpMock.connect.mockRejectedValue(mockError);

    const mockedErrorResponse = { statusCode: HTTP_INTERNAL_ERROR, body: { success: false, message: 'error' } };
    errorResponse.mockResolvedValue(mockedErrorResponse);

    const result = await main(params);

    expect(errorResponse).toHaveBeenCalledWith(HTTP_INTERNAL_ERROR, 'SFTP connection failed', expect.any(Object));
    expect(result).toEqual(mockedErrorResponse);
  });
});
