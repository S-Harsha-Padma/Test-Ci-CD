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

const { createInvoice } = require('../../../../../../../actions/commerce/events/order/status/services/invoice');

describe('createInvoice', () => {
  let logger;
  let client;

  beforeEach(() => {
    // Setup logger mock
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    // Setup commerce client mock
    client = {
      invoiceOrder: jest.fn(),
    };
  });

  test('should successfully create invoice', async () => {
    // Setup test data
    const orderId = '12345';
    const response = {};

    // Mock successful response
    client.invoiceOrder.mockResolvedValue({
      status: 'success',
      message: 'Invoice created successfully',
    });

    // Execute the function
    const result = await createInvoice(orderId, response, client, logger);

    // Assertions
    expect(result).toBe(true);
    expect(client.invoiceOrder).toHaveBeenCalledWith(orderId);
    expect(logger.info).toHaveBeenCalledWith(`Creating invoice for order ${orderId}`);
    expect(logger.info).toHaveBeenCalledWith('Invoice created successfully for order', orderId);
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('should handle error during invoice creation', async () => {
    // Setup test data
    const orderId = '12345';
    const response = {};

    // Mock error response
    client.invoiceOrder.mockRejectedValue(new Error('Failed to create invoice'));

    // Execute the function
    const result = await createInvoice(orderId, response, client, logger);

    // Assertions
    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      `Error updating order status for ${orderId}:`,
      'Failed to create invoice'
    );
  });

  test('should handle null response', async () => {
    // Setup test data
    const orderId = '12345';
    const response = null;

    // Mock successful response
    client.invoiceOrder.mockResolvedValue({
      status: 'success',
      message: 'Invoice created successfully',
    });

    // Execute the function
    const result = await createInvoice(orderId, response, client, logger);

    // Assertions
    expect(result).toBe(true);
    expect(client.invoiceOrder).toHaveBeenCalledWith(orderId);
    expect(logger.info).toHaveBeenCalledWith(`Creating invoice for order ${orderId}`);
    expect(logger.info).toHaveBeenCalledWith('Invoice created successfully for order', orderId);
  });

  test('should handle empty response', async () => {
    // Setup test data
    const orderId = '12345';
    const response = {};

    // Mock successful response
    client.invoiceOrder.mockResolvedValue({
      status: 'success',
      message: 'Invoice created successfully',
    });

    // Execute the function
    const result = await createInvoice(orderId, response, client, logger);

    // Assertions
    expect(result).toBe(true);
    expect(client.invoiceOrder).toHaveBeenCalledWith(orderId);
    expect(logger.info).toHaveBeenCalledWith(`Creating invoice for order ${orderId}`);
    expect(logger.info).toHaveBeenCalledWith('Invoice created successfully for order', orderId);
  });
});
