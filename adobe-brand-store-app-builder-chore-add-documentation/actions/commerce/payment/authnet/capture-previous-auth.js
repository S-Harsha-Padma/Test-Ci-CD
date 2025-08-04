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
const { APIContracts, APIControllers } = require('authorizenet');

/**
 * Capture the transaction amount that was previously authorized
 *
 * @param {object} transactionId the request parameters
 * @param {object} params API credentials
 * @param {object} logger logger instance
 * @returns {object} the response
 */
async function capturePreviouslyAuthorizedAmount(transactionId, params, logger) {
  try {
    logger.info(`Capture the transaction ${transactionId} in Authorize.Net`);
    const merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(params.API_LOGIN_ID);
    merchantAuthenticationType.setTransactionKey(params.TRANSACTION_KEY);

    const transactionRequestType = new APIContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(APIContracts.TransactionTypeEnum.PRIORAUTHCAPTURETRANSACTION);
    transactionRequestType.setRefTransId(transactionId);

    const createRequest = new APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);
    // logger.debug('Get Request Payload:', JSON.stringify(createRequest.getJSON(), null, 2));

    return new Promise((resolve, reject) => {
      const controller = new APIControllers.CreateTransactionController(createRequest.getJSON());
      controller.execute(() => {
        const apiResponse = controller.getResponse();
        if (!apiResponse) {
          logger.debug(`Null response from Authorize.Net for the transactionID: ${transactionId}`);
          return resolve({
            success: false,
            message: 'There was a problem processing your payment. Please try again with a different payment method.',
          });
        }

        const response = new APIContracts.CreateTransactionResponse(apiResponse);
        logger.debug('Transaction Response:', JSON.stringify(response, null, 2));
        let errMsg = 'There was a problem processing your payment. Please try again with a different payment method.';
        if (response != null) {
          if (
            response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK &&
            [1, '1'].includes(response.getTransactionResponse().getResponseCode())
          ) {
            return resolve({ success: true });
          }
          errMsg = response?.getMessages()?.getMessage()[0]?.getText();
        }
        return resolve({
          success: false,
          message: errMsg,
        });
      });
    });
  } catch (error) {
    logger.debug(`An error occurred while capture the payment transaction: ${transactionId}`);
    logger.error(`Error while capture the transaction: ${error.message}`);
    return {
      success: false,
      message: 'There was a problem processing your payment. Please try again with a different payment method.',
    };
  }
}

module.exports = { capturePreviouslyAuthorizedAmount };
