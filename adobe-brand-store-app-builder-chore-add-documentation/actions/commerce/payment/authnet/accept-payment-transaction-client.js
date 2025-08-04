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
const { APIContracts, APIControllers, Constants } = require('authorizenet');
const { HTTP_INTERNAL_ERROR } = require('../../../../lib/http');

/**
 * Authorize the payment transaction
 *
 * @param {object} params the request parameters
 * @param {object} order quote instance
 * @param {object} logger logger instance
 * @returns {object} the response
 */
async function createAnAcceptPaymentTransaction(params, order, logger) {
  try {
    logger.info('Creating an Authorize.Net payment transaction');
    const { payment: paymentInfo } = order;
    const billingAddressIndex = getBillingAddressIndex(order.addresses);
    const billingAddress = order.addresses[billingAddressIndex] || {};
    let shipping = {};

    const merchantAuth = new APIContracts.MerchantAuthenticationType();
    merchantAuth.setName(params.API_LOGIN_ID);
    merchantAuth.setTransactionKey(params.TRANSACTION_KEY);

    const opaqueData = new APIContracts.OpaqueDataType();
    opaqueData.setDataDescriptor('COMMON.ACCEPT.INAPP.PAYMENT');
    opaqueData.setDataValue(paymentInfo?.additional_information?.payment_nonce);

    const paymentType = new APIContracts.PaymentType();
    paymentType.setOpaqueData(opaqueData);

    const customer = new APIContracts.CustomerType();
    customer.setEmail(order?.customer_email);
    customer.setType(APIContracts.CustomerTypeEnum.INDIVIDUAL);

    const orderDetails = new APIContracts.OrderType();
    orderDetails.setInvoiceNumber(order?.increment_id.slice(-20));

    const transactionRequest = new APIContracts.TransactionRequestType();
    transactionRequest.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequest.setCustomerIP(order?.remote_ip);

    const billTo = new APIContracts.CustomerAddressType();
    if (billingAddress) {
      billTo.setFirstName(billingAddress?.firstname);
      billTo.setLastName(billingAddress?.lastname);
      billTo.setAddress(billingAddress?.street);
      billTo.setCity(billingAddress?.city);
      billTo.setState(billingAddress?.region_code || billingAddress?.region);
      billTo.setZip(billingAddress?.postcode);
      billTo.setCountry(billingAddress?.country_id);
      transactionRequest.setBillTo(billTo);
    }

    shipping = new APIContracts.ExtendedAmountType();
    if (order?.shipping_method) {
      shipping.setAmount(order?.shipping_incl_tax.toFixed(2));
      // shipping.setName(order?.shipping_method); // Accept only upto 31 characters
      transactionRequest.setShipping(shipping);
    }

    // Line Items
    const lineItems = new APIContracts.ArrayOfLineItem();
    lineItems.setLineItem(
      order.items?.map((item, index) => createLineItem(index + 1, item.sku, item.name, item.qty_ordered, item?.price))
    );

    transactionRequest.setPayment(paymentType);
    transactionRequest.setAmount(order?.grand_total);
    transactionRequest.setLineItems(lineItems);
    transactionRequest.setCustomer(customer);
    transactionRequest.setOrder(orderDetails);

    const createRequest = new APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuth);
    createRequest.setTransactionRequest(transactionRequest);

    // Clone and sanitize the request payload
    // const requestPayload = createRequest.getJSON();
    // const sanitizedPayload = JSON.parse(JSON.stringify(requestPayload));
    // if (sanitizedPayload.createTransactionRequest?.merchantAuthentication) {
    //   delete sanitizedPayload.createTransactionRequest.merchantAuthentication;
    // }
    // logger.debug('Transaction Request Payload:', JSON.stringify(sanitizedPayload, null, 2));

    return new Promise((resolve, reject) => {
      const controller = new APIControllers.CreateTransactionController(createRequest.getJSON());
      controller.setEnvironment(Constants.endpoint[params.TRANSACTION_ENVIRONMENT]);
      controller.execute(() => {
        const apiResponse = controller.getResponse();
        if (!apiResponse) {
          logger.error(`Null response from Authorize.Net, Please try again later`);
          return resolve({
            success: false,
            message: 'An error occurred while processing the payment transaction. Please try again later.',
          });
        }

        const response = new APIContracts.CreateTransactionResponse(apiResponse);
        // logger.debug('Transaction Response:', JSON.stringify(response, null, 2));

        if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
          return resolve(handleSuccessResponse(response));
        } else {
          return resolve(handleErrorResponse(response));
        }
      });
    });
  } catch (error) {
    logger.error(`Error processing the payment: ${error.message}`);
    return {
      success: false,
      statusCode: HTTP_INTERNAL_ERROR,
      message: 'An error occurred while processing the payment transaction. Please try again later.',
    };
  }
}

/**
 * Create line items
 *
 * @param {number} itemId - item id
 * @param {string} name - item name
 * @param {string} description - item description
 * @param {number} quantity - item quantity
 * @param {number} unitPrice - item unit price
 * @returns {object} line item object
 */
function createLineItem(itemId, name, description, quantity, unitPrice) {
  const lineItem = new APIContracts.LineItemType();
  lineItem.setItemId(itemId);
  lineItem.setName(name);
  lineItem.setDescription(description);
  lineItem.setQuantity(quantity);
  lineItem.setUnitPrice(unitPrice);
  return lineItem;
}

/**
 * Handle success response
 *
 * @param {object} response responseObject
 * @returns {object} response object
 */
function handleSuccessResponse(response) {
  const transactionResponse = response.getTransactionResponse();

  if (transactionResponse && transactionResponse.getMessages()) {
    return {
      success: true,
      transactionId: transactionResponse.getTransId(),
      message: transactionResponse.getMessages().getMessage()[0].getDescription(),
    };
  }
  let errMsg = 'Transaction failed: No messages received. Please retry';
  if (transactionResponse.getErrors() != null) {
    errMsg = transactionResponse.getErrors().getError()[0].getErrorText();
  }

  return {
    success: false,
    message: errMsg,
    errCode: transactionResponse?.getErrors()?.getError()[0]?.getErrorCode() || 'UNKNOWN_ERROR',
  };
}

/**
 * Handle error response
 *
 * @param {object} response responseObject
 * @returns {object} response object
 */
function handleErrorResponse(response) {
  return {
    success: false,
    message: response?.getMessages()?.getMessage()[0].getText(),
    errCode: response?.getMessages()?.getMessage()[0].getCode(),
  };
}

/**
 * Find the billing address index
 *
 * @param {object} addresses responseObject
 * @returns {number} index
 */
function getBillingAddressIndex(addresses) {
  let index = 0;
  for (const address of addresses) {
    if (address.address_type === 'billing') {
      break;
    }
    index++;
  }
  return index;
}

module.exports = { createAnAcceptPaymentTransaction };
