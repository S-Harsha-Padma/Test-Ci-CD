/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { Core } = require('@adobe/aio-sdk');
// eslint-disable-next-line
const { HTTP_INTERNAL_ERROR, HTTP_OK, HTTP_UNAUTHORIZED, HTTP_BAD_REQUEST } = require('./http');
const { resolveCredentials } = require('./adobe-auth');
const got = require('got');
const Oauth1a = require('oauth-1.0a');
const crypto = require('crypto');
const { createShipment } = require('../actions/commerce/events/order/status/services/shipment');
const { createInvoice } = require('../actions/commerce/events/order/status/services/invoice');

const FILTERED_ORDER_STATUSES = ['complete', 'canceled', 'closed'];

/**
 * Provides an instance of the Commerce HTTP client
 *
 * @param {string} commerceUrl Base URL of the Commerce API
 * @param {object} options Configuration options for the client
 * @param {object} [options.integrationOptions] Integration options for OAuth1.0a
 * @param {object} [options.imsOptions] IMS options for bearer token authentication
 * @param {object} options.logger Logger instance for logging requests
 * @returns {object} Promise<Got> Configured Got instance for making HTTP requests
 */
async function getCommerceHttpClient(commerceUrl, { integrationOptions, imsOptions, logger }) {
  if (!commerceUrl) {
    throw new Error('Commerce URL must be provided');
  }
  if ((imsOptions && integrationOptions) || (!imsOptions && !integrationOptions)) {
    throw new Error('Either IMS options or integration options must be provided');
  }

  const commerceGot = got.extend({
    http2: true,
    responseType: 'json',
    prefixUrl: commerceUrl,
    headers: {
      'Content-Type': 'application/json',
    },
    hooks: {
      beforeRequest: [(options) => logger.debug(`Request [${options.method}] ${options.url}`)],
      beforeRetry: [
        (options, error, retryCount) =>
          logger.debug(
            `Retrying request [${options.method}] ${options.url} - count: ${retryCount} - error: ${error.code} - ${error.message}`
          ),
      ],
      beforeError: [
        (error) => {
          const { response } = error;
          if (response && response.body) {
            error.responseBody = response.body;
          }
          return error;
        },
      ],
      afterResponse: [
        (response) => {
          logger.debug(
            `Response [${response.request.options.method}] ${response.request.options.url} - ${response.statusCode} ${response.statusMessage}`
          );
          return response;
        },
      ],
    },
  });

  if (integrationOptions) {
    logger.debug('Using Commerce client with integration options');
    const oauth1aHeaders = oauth1aHeadersProvider(integrationOptions);

    return commerceGot.extend({
      handlers: [
        (options, next) => {
          options.headers = {
            ...options.headers,
            ...oauth1aHeaders(options.url.toString(), options.method),
          };
          return next(options);
        },
      ],
    });
  }

  logger.debug('Using Commerce client with IMS options');
  return commerceGot.extend({
    headers: {
      'x-ims-org-id': imsOptions.imsOrgId,
      'x-api-key': imsOptions.apiKey,
      Authorization: `Bearer ${imsOptions.accessToken}`,
    },
  });
}

/**
 * Generates OAuth1.0a headers for the given integration options
 *
 * @param {object} integrationOptions Options for OAuth1.0a
 * @returns {Function} Function that returns OAuth1.0a headers for a given URL and method
 */
function oauth1aHeadersProvider(integrationOptions) {
  const oauth = Oauth1a({
    consumer: {
      key: integrationOptions.consumerKey,
      secret: integrationOptions.consumerSecret,
    },
    signature_method: 'HMAC-SHA256',
    hash_function: (baseString, key) => crypto.createHmac('sha256', key).update(baseString).digest('base64'),
  });

  const oauthToken = {
    key: integrationOptions.accessToken,
    secret: integrationOptions.accessTokenSecret,
  };

  return (url, method) => oauth.toHeader(oauth.authorize({ url, method }, oauthToken));
}

/**
 * Initializes the Commerce client according to the given params
 *
 * @param {object} params to initialize the client
 * @returns {object} the available api calls
 */
async function getAdobeCommerceClient(params) {
  const logger = Core.Logger('adobe-commerce-client', {
    level: params.LOG_LEVEL ?? 'info',
  });

  const options = { logger };

  if (params.COMMERCE_CONSUMER_KEY) {
    options.integrationOptions = {
      consumerKey: params.COMMERCE_CONSUMER_KEY,
      consumerSecret: params.COMMERCE_CONSUMER_SECRET,
      accessToken: params.COMMERCE_ACCESS_TOKEN,
      accessTokenSecret: params.COMMERCE_ACCESS_TOKEN_SECRET,
    };
  } else if (params.OAUTH_CLIENT_ID) {
    options.imsOptions = await resolveCredentials(params);
  }

  const commerceGot = await getCommerceHttpClient(params.COMMERCE_BASE_URL ?? process.env.COMMERCE_BASE_URL, options);

  const wrapper = async (callable) => {
    try {
      const message = await callable();
      return { success: true, message };
    } catch (e) {
      if (e.code === 'ERR_GOT_REQUEST_ERROR') {
        logger.error('Error while calling Commerce API', e);
        return {
          success: false,
          statusCode: HTTP_INTERNAL_ERROR,
          message: `Unexpected error, check logs. Original error "${e.message}"`,
        };
      }
      return {
        success: false,
        statusCode: e.response?.statusCode || HTTP_INTERNAL_ERROR,
        message: e.message,
        body: e.responseBody,
      };
    }
  };

  return {
    // Refer to README.md for the available OOPE endpoints
    createOopePaymentMethod: async (paymentMethod) =>
      wrapper(() =>
        commerceGot(`V1/oope_payment_method/`, {
          method: 'POST',
          json: paymentMethod,
        }).json()
      ),
    getOopePaymentMethod: async (paymentMethodCode) =>
      wrapper(() =>
        commerceGot(`V1/oope_payment_method/${paymentMethodCode}`, {
          method: 'GET',
        }).json()
      ),
    getOopePaymentMethods: async () =>
      wrapper(() =>
        commerceGot(`V1/oope_payment_method/`, {
          method: 'GET',
        }).json()
      ),
    // Commerce Rest API: https://developer.adobe.com/commerce/webapi/rest/quick-reference/
    getOrderByMaskedCartId: (cartId) =>
      wrapper(() =>
        commerceGot(
          `rest/all/V1/orders?searchCriteria[filter_groups][0][filters][0][field]=masked_quote_id&searchCriteria[filter_groups][0][filters][0][value]=${cartId}&searchCriteria[filter_groups][0][filters][0][condition_type]=eq`
        ).json()
      ),
    // Invoice Order API: https://developer.adobe.com/commerce/webapi/rest/tutorials/orders/order-create-invoice/
    invoiceOrder: async (orderId) =>
      wrapper(() =>
        commerceGot(`V1/order/${orderId}/invoice`, {
          method: 'POST',
          json: { capture: true },
        }).json()
      ),
    // Refund Invoice API: https://developer.adobe.com/commerce/webapi/rest/order-management/order-management-api/order-management-api-invoice-refund/
    refundInvoice: (invoiceId) =>
      wrapper(() =>
        commerceGot(`rest/all/V1/invoice/${invoiceId}/refund`, {
          method: 'POST',
        }).json()
      ),
    // Shipment Order API: https://developer.adobe.com/commerce/webapi/rest/tutorials/orders/order-create-shipment/
    shipmentOrder: async (orderId, requestBody) =>
      wrapper(() =>
        commerceGot(`V1/order/${orderId}/ship`, {
          method: 'POST',
          json: requestBody,
        }).json()
      ),
    // Commerce Eventing API: https://developer.adobe.com/commerce/extensibility/events/api/
    configureEventing: (providerId, instanceId, merchantId, environmentId, workspaceConfig) =>
      wrapper(() =>
        commerceGot('rest/all/V1/eventing/updateConfiguration', {
          method: 'PUT',
          json: {
            config: {
              enabled: true,
              merchant_id: merchantId,
              environment_id: environmentId,
              provider_id: providerId,
              instance_id: instanceId,
              workspace_configuration: JSON.stringify(workspaceConfig),
            },
          },
        }).json()
      ),
    getEventProviders: async () =>
      wrapper(() =>
        commerceGot('rest/all/V1/eventing/getEventProviders', {
          method: 'GET',
        }).json()
      ),
    subscribeEvent: async (subscription) =>
      wrapper(() =>
        commerceGot('rest/all/V1/eventing/eventSubscribe', {
          method: 'POST',
          json: subscription,
        }).json()
      ),
    // Get customer token
    getCustomerToken: () =>
      wrapper(() =>
        commerceGot(`rest/all/V1/integration/customer/token`, {
          method: 'POST',
          json: { capture: true },
        }).json()
      ),
    getCustomer: (customerEmail) =>
      wrapper(() =>
        commerceGot(
          `V1/customers/search?searchCriteria[filterGroups][0][filters][0][field]=email&searchCriteria[filterGroups][0][filters][0][value]=${customerEmail}`
        ).json()
      ),
    updateCustomer: (customerId, requestBody) =>
      wrapper(() =>
        commerceGot(`V1/customers/${customerId}`, {
          method: 'PUT',
          json: requestBody,
        }).json()
      ),
    getCustomerGroup: (uid) => wrapper(() => commerceGot(`V1/customerGroups/${uid}`).json()),
    getProductsBySku: (skuList) =>
      wrapper(() =>
        commerceGot(
          `V1/products?searchCriteria[filterGroups][0][filters][0][field]=sku&searchCriteria[filterGroups][0][filters][0][value]=${skuList}&searchCriteria[filterGroups][0][filters][0][conditionType]=in`,
          {
            method: 'GET',
          }
        ).json()
      ),
    getAttributeByCode: (attrCode) =>
      wrapper(() =>
        commerceGot(`V1/products/attributes/${attrCode}`, {
          method: 'GET',
        }).json()
      ),
    getOrders: (pageSize) =>
      wrapper(() =>
        commerceGot(
          `V1/orders?searchCriteria[filter_groups][0][filters][0][condition_type]=nin&searchCriteria[filter_groups][0][filters][0][field]=status&searchCriteria[filter_groups][0][filters][0][value]=${FILTERED_ORDER_STATUSES.join(
            ','
          )}&searchCriteria[filter_groups][0][filters][0][condition_type]=nin&searchCriteria[filter_groups][0][filters][0][field]=state&searchCriteria[filter_groups][0][filters][0][value]=${FILTERED_ORDER_STATUSES.join(
            ','
          )}&searchCriteria[pageSize]=${pageSize}&searchCriteria[sortOrders][0][field]=entity_id&searchCriteria[sortOrders][0][direction]=asc`
        ).json()
      ),
    orderStatusUpdate: (requestBody) =>
      wrapper(() =>
        commerceGot(`V1/orders`, {
          method: 'POST',
          json: requestBody,
        }).json()
      ),
    orderCommentUpdate: (id, requestBody) =>
      wrapper(() =>
        commerceGot(`V1/orders/${id}/comments`, {
          method: 'POST',
          json: requestBody,
        }).json()
      ),
    getProductSalableQuantity: (sku) =>
      wrapper(() =>
        commerceGot(`V1/inventory/get-product-salable-quantity/${sku}/1`, {
          method: 'GET',
        }).json()
      ),
    getCustomerGroupIdByCode: (code) =>
      wrapper(() =>
        commerceGot(
          `V1/customerGroups/search?searchCriteria[filter_groups][0][filters][0][condition_type]=in&searchCriteria[filter_groups][0][filters][0][field]=code&searchCriteria[filter_groups][0][filters][0][value]=${code}`
        ).json()
      ),
    getCustomerGroupList: () =>
      wrapper(() =>
        commerceGot(
          `V1/customerGroups/search?searchCriteria[sortOrders][0][field]=code&searchCriteria[sortOrders][0][direction]=ASC`
        ).json()
      ),
    createOopeShippingCarrier: async (shippingCarrier) =>
      wrapper(() =>
        commerceGot(`V1/oope_shipping_carrier`, {
          method: 'POST',
          json: shippingCarrier,
        }).json()
      ),
    updateInventorySourceItems: async (inventoryData) =>
      wrapper(() =>
        commerceGot(`V1/inventory/source-items`, {
          method: 'POST',
          json: inventoryData,
        }).json()
      ),
    getOrdersByIncrementId: (incrementId) =>
      wrapper(() =>
        commerceGot(
          `V1/orders?searchCriteria[filter_groups][0][filters][0][field]=increment_id&searchCriteria[filter_groups][0][filters][0][value]=${incrementId}&fields=items[increment_id,extension_attributes[gift_message[gift_message_id,sender,recipient,message]]]`
        ).json()
      ),
    getCart: (cartId) =>
      wrapper(() =>
        commerceGot(`V1/carts/${cartId}?fields=id,customer[group_id],customer_is_guest`, {
          method: 'GET',
        }).json()
      ),
    removeCoupon: (cartId) =>
      wrapper(() =>
        commerceGot(`V1/carts/${cartId}/coupons`, {
          method: 'DELETE',
        }).json()
      ),
    removeGiftCard: (cartId, code) =>
      wrapper(() =>
        commerceGot(`V1/carts/${cartId}/giftCards/${code}`, {
          method: 'DELETE',
        }).json()
      ),
    getBundleChildProductSalableQuantity: (childSku) =>
      wrapper(() =>
        commerceGot(
          `V1/inventory/source-items?searchCriteria[filterGroups][0][filters][0][field]=sku&searchCriteria[filterGroups][0][filters][0][value]=${childSku}&searchCriteria[filterGroups][0][filters][0][condition_type]=in`,
          {
            method: 'GET',
          }
        ).json()
      ),
  };
}

/**
 * Returns webhook response error according to Adobe Commerce Webhooks spec.
 *
 * @param {string} message the error message.
 * @returns {object} the response object
 * @see https://developer.adobe.com/commerce/extensibility/webhooks/responses/#responses
 */
function webhookErrorResponse(message) {
  return {
    statusCode: HTTP_OK,
    body: {
      op: 'exception',
      message,
    },
  };
}

/**
 * Returns webhook response success according to Adobe Commerce Webhooks spec.
 *
 * @returns {object} the response object
 * @see https://developer.adobe.com/commerce/extensibility/webhooks/responses/#responses
 */
function webhookSuccessResponse() {
  return {
    statusCode: HTTP_OK,
    body: {
      op: 'success',
    },
  };
}

/**
 * Verifies the signature of the webhook request.
 * @param {object} params the input parameters
 * @param {object} params.__ow_headers request headers
 * @param {string} params.__ow_body request body, requires the following annotation in the action `raw-http: true`
 * @param {string} params.COMMERCE_WEBHOOKS_PUBLIC_KEY the public key to verify the signature configured in the Commerce instance
 * @returns {{success: boolean}|{success: boolean, error: string}} weather the signature is valid or not
 * @see https://developer.adobe.com/commerce/extensibility/webhooks/signature-verification
 */
function webhookVerify({ __ow_headers: headers = {}, __ow_body: body, COMMERCE_WEBHOOKS_PUBLIC_KEY: publicKey }) {
  const signature = headers['x-adobe-commerce-webhook-signature'];
  if (!signature) {
    return {
      success: false,
      error:
        'Header `x-adobe-commerce-webhook-signature` not found. Make sure Webhooks signature is enabled in the Commerce instance.',
    };
  }
  if (!body) {
    return {
      success: false,
      error: 'Request body not found. Make sure the the action is configured with `raw-http: true`.',
    };
  }
  if (!publicKey) {
    return {
      success: false,
      error:
        'Public key not found. Make sure the the action is configured with the input `COMMERCE_WEBHOOKS_PUBLIC_KEY` and it is defined in .env file.',
    };
  }

  const verifier = crypto.createVerify('SHA256');
  verifier.update(body);
  const success = verifier.verify(publicKey, signature, 'base64');
  return { success, ...(!success && { error: 'Signature verification failed.' }) };
}

/**
 *
 * Returns a success response object, this method should be called on the handlers actions
 *
 * @param {string} message a descriptive message of the result
 *        e.g. 'missing xyz parameter'
 * @returns {object} the response object, ready to be returned from the action main's function.
 */
function actionSuccessResponse(message) {
  return {
    statusCode: HTTP_OK,
    body: {
      success: true,
      message,
    },
  };
}

/**
 *
 * Returns a success response object, this method should be called on the handlers actions
 *
 * @param {number} statusCode the status code.
 *        e.g. 400
 *        e.g. 'missing xyz parameter'
 * @param {object} error response error object.
 * @returns {object} the response object, ready to be returned from the action main's function.
 */
function actionErrorResponse(statusCode, error) {
  return {
    statusCode,
    body: {
      success: false,
      error,
    },
  };
}

/**
 * Creates a customer token in Adobe Commerce.
 *
 * @param {string} email - The customer's email.
 * @param {string} dummyPassword - The dummy password for authentication.
 * @param {string} graphQlUrl - The GraphQL API URL.
 * @param {object} logger - Logger instance for logging.
 * @param {string} firstname - The first name of the customer.
 * @returns {Promise<{success: boolean, error: string}>} - Returns the customer token if found, otherwise null.
 */
async function getCustomerToken(email, dummyPassword, graphQlUrl, logger, firstname) {
  const requestBody = {
    query: `mutation {
      generateCustomerToken(email: "${email}", password: "${dummyPassword}") {
        token
      } 
    }`,
  };
  logger.debug(`Token API Request: ${JSON.stringify(requestBody)}`);
  try {
    const response = await fetch(graphQlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log(data);
    logger.debug(`Token API Response: ${JSON.stringify(data)}`);

    if (data?.data?.generateCustomerToken?.token) {
      logger.info(data.data.generateCustomerToken.token);
      logger.info(`firstname: ${firstname}`);
      const token = data.data.generateCustomerToken.token;
      const username = firstname;
      return actionSuccessResponse({ token, username });
    }

    return { success: false, error: 'Token generation failed. Invalid credentials or missing account.' };
  } catch (error) {
    logger.error('Error fetching customer token:', error);
    return {
      success: false,
      statusCode: error.response?.statusCode || HTTP_INTERNAL_ERROR,
      message: 'Internal server error occurred.',
    };
  }
}

/**
 * Initializes the Adobe Commerce SSO client.
 *
 * @param {object} params - The parameters required for initialization.
 * @returns {Promise<object>} - The available API calls.
 */
async function getAdobeCommerceClientSSO(params) {
  const logger = Core.Logger('adobe-commerce-client', {
    level: params.LOG_LEVEL ?? 'info',
  });

  let dummyPassword = params.CREATE_CUSTOMER_PASSWORD;

  logger.debug(`Dummy Password: ${dummyPassword}`);
  const graphQlUrl = params.COMMERCE_GRAPHQL_BASE_URL;
  console.info(graphQlUrl);
  try {
    // Validate and process SSO data
    const ssoResult = await processSSOAuthentication(params, params.SSO_USERINFO_URL, logger);
    if (!ssoResult.success) {
      return actionErrorResponse(HTTP_UNAUTHORIZED, 'SSO authentication failed');
    }

    // Set user data from SSO response
    const firstname = ssoResult.data.given_name;
    const lastname = ssoResult.data.family_name;
    const email = ssoResult.data.email;
    const sub = ssoResult.data.sub;
    logger.debug(`ssoResult: ${JSON.stringify(ssoResult)}`);
    logger.debug(`firstname: ${firstname}`);
    logger.debug(`lastname: ${lastname}`);
    logger.debug(`email: ${email}`);
    logger.debug(`sub: ${sub}`);
    /**
     * Password hasing using crypto
     */
    if (ssoResult.data.sub) {
      const firstLetter = firstname ? firstname.charAt(0).toUpperCase() : 'U';
      dummyPassword = crypto.createHash('sha256').update(ssoResult.data.sub).digest('hex') + firstLetter + '@';
      console.log('Hashed Password:', dummyPassword);
    }

    // Step 1: Try to get a customer token
    let token = await getCustomerToken(email, dummyPassword, graphQlUrl, logger, firstname);
    if (!token?.body?.success) {
      logger.info('Customer not found, attempting to create a new one...');

      const createCustomerBody = {
        query: `mutation {
          createCustomerV2(
            input: {
              firstname: "${firstname}",
              lastname: "${lastname}",
              email: "${email}",
              password: "${dummyPassword}"
            }
          ) {
            customer {
              firstname
              lastname
              email
            }
          }
        }`,
      };
      logger.debug(`Create Customer Payload: ${JSON.stringify(createCustomerBody)}`);
      const customerResult = await fetch(graphQlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createCustomerBody),
      });
      const customerResultData = await customerResult.json();
      logger.debug(`Create Customer Response: ${JSON.stringify(customerResultData)}`);

      // Step 3: If customer creation is successful, retry fetching the token
      if (customerResultData?.data?.createCustomerV2) {
        logger.info('Customer created successfully, retrying token request...');

        // get customer entity id
        const customerEmail = customerResultData.data.createCustomerV2.customer.email;
        const encodedEmail = encodeURIComponent(customerEmail);

        /**
         * Initiate commerce client
         */
        const client = await getAdobeCommerceClient(params);

        /**
         * Get customer details from email
         */
        const customerDetailsResult = await client.getCustomer(encodedEmail);
        logger.debug(`Get Customer Details API Response: ${JSON.stringify(customerDetailsResult)}`);
        console.log(customerDetailsResult.message.items);

        if (customerDetailsResult.success) {
          console.info(`${customerDetailsResult.message.items[0].email} fetched customer id successfully`);
          const customerId =
            customerDetailsResult.message.items.length > 0 ? customerDetailsResult.message.items[0].id : null;
          if (customerDetailsResult.message.items.length > 0) {
            const customerId = customerDetailsResult.message.items[0].id;
            console.log(`${customerId} fetched customer id`);
          }
          console.info(`${customerDetailsResult.message.items[0].id} fetched customer id`);
          console.log(`customer id received from getCustomer rest API ${customerId}`);
          /**
           * Editing customer group
           * @type {number}
           */
          const updateCustomerRequestBody = {
            customer: {
              group_id: params.CUSTOMER_GROUP_ID,
              custom_attributes: [
                {
                  attribute_code: 'is_active:',
                  value: '1',
                },
              ],
            },
          };
          logger.debug(`Update Customer group API request : ${JSON.stringify(updateCustomerRequestBody)}`);

          const updateCustomerResult = await client.updateCustomer(customerId, updateCustomerRequestBody);
          logger.debug(`Update Customer group API response : ${JSON.stringify(updateCustomerResult)}`);
          console.log(updateCustomerResult);
          if (updateCustomerResult.success) {
            console.info(`${updateCustomerResult.message.email} updated successfully`);
            token = await getCustomerToken(email, dummyPassword, graphQlUrl, logger, firstname);
          } else {
            console.error(`Failed to updated customer` + updateCustomerResult.message);
          }
        } else {
          console.error(`Failed to updated customer`);
        }
      } else {
        logger.info('Customer already exists or failed to create.');
        token = await getCustomerToken(email, dummyPassword, graphQlUrl, logger, firstname);
      }
    }

    if (token?.body?.success) {
      logger.info('Successfully generated customer token.');
      return token;
    } else {
      logger.info('Failed to generate customer token now retrying...');
      // retry token generation
      for (let i = 0; i < 6; i++) {
        token = await getCustomerToken(email, dummyPassword, graphQlUrl, logger, firstname);
        if (token?.body?.success) break;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (token?.body?.success) {
        logger.info('Successfully generated customer token.');
        return token;
      }
    }

    logger.error('Failed to generate customer token.');
    return webhookErrorResponse('Token generation failed');
  } catch (error) {
    logger.error('Unexpected error:', error);
    return {
      success: false,
      statusCode: error.response?.statusCode || HTTP_INTERNAL_ERROR,
      message: error.message || 'An internal server error occurred.',
    };
  }
}

/**
 * Method updateOrderStatus
 *
 * @param {object} params - The parameters for updating the order status
 * @returns {Promise<{statusCode: number, body: {message: string, summary: {totalOrders: number, successfulUpdates: number, failedUpdates: number}, details: {success: Array, failed: Array}}}>} - A promise that resolves to an object containing the status code and response body
 */
async function updateOrderStatus(params) {
  const logger = Core.Logger('adobe-commerce-client', {
    level: params.LOG_LEVEL ?? 'info',
  });

  /**
   * Initiate commerce client
   */
  const client = await getAdobeCommerceClient(params);
  /**
   * Step1 : fetch all commerce orders
   */
  // TODO this condition will change while deployment
  const pageSize = params.PAGE_SIZE ? params.PAGE_SIZE : 2;
  const getCommercecustomerOrders = await client.getOrders(pageSize);
  logger.debug('GetcustomerOrders response', getCommercecustomerOrders);
  // Loop through each orders
  return fetchOrderStatuses(getCommercecustomerOrders, params, client, logger);
}

/**
 * Method: FetchOrderStatuses
 *
 * @param {Array} orders - The list of orders to fetch statuses for
 * @param {object} params - Additional parameters for the request
 * @param {object} client - The client used to make the request
 * @param {object} logger - The logger instance for logging
 * @returns {Promise<{statusCode: number, body: {message: string, summary: {totalOrders: number, successfulUpdates: number, failedUpdates: number}, details: {success: Array, failed: Array}}}>} - A promise that resolves to an object containing the status code and response body
 */
async function fetchOrderStatuses(orders, params, client, logger) {
  const baseUrl = params.ERP_ORDER_STATUS_ENDPOINT;
  const successDetails = [];
  const failedDetails = [];
  const totalOrders = orders.message.items.length;
  // Iterate over each order and make an API call
  for (const order of orders.message.items) {
    const orderId = `${order.increment_id}_${params.ORDER_ID_PREFIX}`; // Extract order ID
    const url = `${baseUrl}tracking/get?order_id=${orderId}`;
    logger.debug(`Fetching order status for order ${orderId} from ${url}`);
    try {
      const response = await got(url, {
        http2: true,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${params.ERP_AUTH_TOKEN}`,
        },
        responseType: 'json',
      }).json();

      // TODO: remove this after testing
      logger.debug(`Order ${orderId} status response:`, response);

      // Instead of response.ok, check response.success as using mock response temp
      if (!response.success) {
        logger.error(`Failed to fetch order status for ${response.order_id}`);
        failedDetails.push({
          orderId,
          error: 'Status fetch failed',
          message: `Failed to fetch order status for ${orderId}`,
        });
        continue;
      }
      logger.info(`Order ${response.order_id} status retrieved successfully!`);

      // Step 3: Update commerce order status
      const updateResponse = await updateCommerceOrderStatus(order, response, params, client, logger);
      if (updateResponse.success) {
        successDetails.push({
          orderId,
          status: response.status,
          message: `Order updated successfully.`,
        });
      } else {
        failedDetails.push({
          orderId,
          error: 'Status update failed',
          message: `Failed to update order ${orderId}: 'Status update failed'}`,
        });
      }
    } catch (error) {
      logger.error(`Error fetching status for order ${orderId}:`, error.message);
      failedDetails.push({
        orderId,
        error: error.message,
        message: `Failed to update order ${orderId} due to ${error.message}`,
      });
    }
  }

  const response = {
    statusCode: HTTP_OK,
    body: {
      message: 'Order status update process completed.',
      summary: {
        totalOrders,
        successfulUpdates: successDetails.length,
        failedUpdates: failedDetails.length,
      },
      details: {
        success: successDetails,
        failed: failedDetails,
      },
    },
  };
  logger.info('Order status update process completed successfully and response is', response);
  return response;
}

/**
 * Update CommerceOrderStatus
 *
 * @param {object} order - Order object
 * @param {object} response - The new status for the order
 * @param {object} params - Additional parameters for the update
 * @param {object} client - The client used to make the update request
 * @param {object} logger - The logger instance for logging
 * @returns {Promise<{success: boolean, orderId: string}>} - A promise that resolves to an object indicating success and the order ID
 */
async function updateCommerceOrderStatus(order, response, params, client, logger) {
  const currentDate = getCurrentTimeZoneDate(params.ORDER_TIME_ZONE);
  const HaloOrderStatus = response.tracking_details[0].order_status;
  const paymentMethodCode = order.payment.method;
  const currentOrderStatus = order.status;
  let orderStatus = '';

  switch (HaloOrderStatus) {
    case 'Posted':
      orderStatus = 'Shipped'; // state: complete
      break;
    case 'Shipped':
      orderStatus = 'Shipped'; // state: complete
      break;
    case 'Cancelled':
      orderStatus = 'Canceled'; // state: canceled
      break;
    case 'Active':
      orderStatus = 'Processing'; // state : processing
      break;
    case 'In Progress':
      orderStatus = 'Processing'; // state : processing
      break;
    default:
      break;
  }

  try {
    if (currentOrderStatus.toLowerCase() !== orderStatus.toLowerCase()) {
      const requestBody = {
        entity: {
          entity_id: order.entity_id,
          status: orderStatus.toLowerCase(),
          status_histories: [
            {
              comment: `Order ${order.entity_id} status changed from ${order.status} to ${orderStatus.toLowerCase()} in Commerce from Halo ERP at ${currentDate}`,
              created_at: currentDate,
            },
          ],
        },
      };

      /**
       * Step1 : Update Commerce Order
       */
      const updateOrders = await client.orderStatusUpdate(requestBody);
      logger.info('updateOrders response from commerceClient Obj', updateOrders);
      if (updateOrders.success === false) {
        logger.error(`Failed to update order status for ${order.entity_id}: ${updateOrders.statusText}`);
        return { success: false, orderId: order.entity_id };
      }

      logger.info(
        `Successfully updated commerce order status for order id ${order.entity_id}:`,
        updateOrders.message.status
      );
    }
    if (HaloOrderStatus === 'Shipped' || HaloOrderStatus === 'Posted') {
      const orderId = order.entity_id;

      // Handle purchase order payment method
      if (paymentMethodCode === 'purchaseorder') {
        logger.info(`Creating invoice and shipment for purchase order ${orderId}`);
        await Promise.all([
          createInvoice(orderId, response, client, logger),
          createShipment(orderId, response, client, logger),
        ]);
        return { success: true, orderId: order.entity_id };
      }

      // Handle processing order with authorize.net payment
      if (order.status === 'processing' && order.payment.method === 'authorizenet') {
        logger.info(`Creating shipment for authorize.net order ${orderId}`);
        await createShipment(orderId, response, client, logger);
        return { success: true, orderId: order.entity_id };
      }

      // Handle all other orders
      try {
        logger.info(`Creating invoice and shipment for order ${orderId}`);
        await Promise.all([
          createInvoice(orderId, response, client, logger),
          createShipment(orderId, response, client, logger),
        ]);
      } catch (error) {
        logger.error(`Failed to create shipment for order ${orderId}: ${error.message}`);
      }
    }
    return { success: true, orderId: order.entity_id };
  } catch (error) {
    logger.error(`Error updating order status for ${order.entity_id}:`, error.message);
    return { success: false, orderId: order.entity_id };
  }
}

/**
 * Creates a shipping operation
 *
 * @param {object} carrierData - The carrier data for the shipping operation
 * @returns {object} - The shipping operation object
 */
function createShippingOperation(carrierData) {
  return {
    op: 'add',
    path: 'result',
    value: carrierData,
  };
}

/**
 * Get current date in a specific time zone
 * @param {string} timeZone - The time zone to get the date in
 * @returns {string} - The current date in the specified time zone
 */
function getCurrentTimeZoneDate(timeZone) {
  return new Date().toLocaleString(timeZone, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Method: isErpOrderCreated
 *
 * @param {object} params - The parameters for the request
 * @returns {Promise<object>} - A promise that resolves with the result object
 */
async function isErpOrderCreated(params) {
  const logger = Core.Logger('adobe-commerce-client', {
    level: params.LOG_LEVEL ?? 'info',
  });
  logger.debug(`params object: ${params}`);
  logger.debug(`params: ${JSON.stringify(params)}`);
  // TODO: get order id from params items object
  const orderId = params.data.value.order.items[0].order_id;
  const incrementId = params.data.value.order.increment_id;
  const formattedOrderId = `${incrementId}_${params.ORDER_ID_PREFIX}`;
  const client = await getAdobeCommerceClient(params);
  const requestBody = {
    entity: {
      entity_id: orderId,
      status: params.ERP_ORDER_STATUS,
      status_histories: [
        {
          comment: `Order successfully processed and created in ERP system (Reference ID: ${formattedOrderId})`,
          created_at: getCurrentTimeZoneDate(params.ORDER_TIME_ZONE),
        },
      ],
    },
  };
  logger.debug(`requestBody: ${JSON.stringify(requestBody)}`);
  try {
    const order = await client.orderStatusUpdate(requestBody);
    logger.debug(`order status update response: ${JSON.stringify(order)}`);
  } catch (error) {
    console.error(`Error updating order status for erp order ${orderId}:`, error.message);
  }
}

/**
 * Get order gift wrapping message details
 *
 * @param {object} params - The parameters object containing order and configuration details
 * @returns {Promise<object>} - A promise that resolves with the order gift wrapping message details
 */
async function getOrderGWmessage(params) {
  const logger = Core.Logger('adobe-commerce-client', {
    level: params.LOG_LEVEL ?? 'info',
  });
  const incrementId = params.data.value.order.increment_id;
  const client = await getAdobeCommerceClient(params);
  try {
    const order = await client.getOrdersByIncrementId(incrementId);
    logger.debug(`Gift wrapping message details ${JSON.stringify(order)}`);
    return order;
  } catch (error) {
    logger.debug(`error to fetch gift wrapping message details`, error.message);
  }
}

/**
 * Returns webhook response error with exception type according to Adobe Commerce Webhooks spec.
 *
 * @param {string} message the error message.
 * @returns {object} the response object
 * @see https://developer.adobe.com/commerce/extensibility/webhooks/responses/#responses
 */
function webhookErrorResponseWithException(message) {
  return {
    statusCode: HTTP_OK,
    body: {
      op: 'exception',
      type: '\\Magento\\Framework\\GraphQl\\Exception\\GraphQlInputException',
      message,
    },
  };
}

/**
 * Process SSO authentication
 *
 * @param {object} params - The parameters object containing SSO data
 * @param {string} ssoUrl - The SSO URL for fetching user info
 * @param {object} logger - The logger instance for logging
 * @returns {Promise<object>} - A promise that resolves with the SSO authentication result
 */
async function processSSOAuthentication(params, ssoUrl, logger) {
  const auth = params.data.auth;
  logger.debug(`auth: ${auth}`);
  logger.debug(`ssoUrl: ${ssoUrl}`);
  // Call SSO mutation endpoint
  try {
    const ssoResponse = await fetch(ssoUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth}`,
      },
    });

    if (!ssoResponse.ok) {
      logger.error(`SSO response failed with status: ${ssoResponse.status}`);
      return actionErrorResponse(HTTP_BAD_REQUEST, 'Failed to get SSO response');
    }
    let ssoResult;
    try {
      ssoResult = await ssoResponse.json();
    } catch (err) {
      logger.error('Failed to parse SSO response:', err);
      return actionErrorResponse(HTTP_BAD_REQUEST, 'Invalid SSO response format');
    }
    logger.debug(`ssoResponse: ${JSON.stringify(ssoResult)}`);

    logger.debug(`ssoResponse.email_verified: ${ssoResult.email_verified}`);
    if (!ssoResult?.email_verified) {
      return actionErrorResponse(HTTP_BAD_REQUEST, 'Email verification failed.');
    }
    // Validate SSO response data
    if (!ssoResult.sub || !ssoResult.email || !ssoResult.given_name || !ssoResult.family_name) {
      logger.error('Missing required user info from SSO response');
      return actionErrorResponse(HTTP_BAD_REQUEST, 'Invalid SSO response data');
    }
    return { success: true, data: ssoResult };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

module.exports = {
  getAdobeCommerceClient,
  webhookErrorResponse,
  webhookSuccessResponse,
  webhookVerify,
  actionSuccessResponse,
  actionErrorResponse,
  getAdobeCommerceClientSSO,
  updateOrderStatus,
  createShippingOperation,
  isErpOrderCreated,
  webhookErrorResponseWithException,
  getOrderGWmessage,
};
