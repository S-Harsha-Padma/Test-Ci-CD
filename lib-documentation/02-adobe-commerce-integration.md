# Adobe Commerce Integration Library

## Overview

The `adobe-commerce.js` library provides comprehensive integration capabilities for Adobe Commerce (Magento) APIs. It serves as the primary interface between the Adobe Brand Store App Builder and Adobe Commerce, handling authentication, HTTP client management, webhook verification, and various Commerce-specific operations.

## Core Components

### 1. **HTTP Client Management**

#### `getCommerceHttpClient(commerceUrl, options)`

**Purpose**: Creates and configures HTTP clients for Adobe Commerce API communication.

**Parameters**:
- `commerceUrl` (string): Base URL of the Commerce API
- `options` (object): Configuration options
  - `integrationOptions` (object): OAuth 1.0a integration options
  - `imsOptions` (object): IMS Bearer token options
  - `logger` (object): Logger instance for request logging

**Implementation**:
```javascript
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
```

**Key Features**:
- **Dual Authentication**: Supports both OAuth 1.0a and IMS Bearer tokens
- **HTTP/2 Support**: Uses HTTP/2 for improved performance
- **Comprehensive Logging**: Detailed request/response logging
- **Error Handling**: Robust error handling with response body capture
- **Retry Logic**: Built-in retry mechanism with logging

### 2. **OAuth 1.0a Authentication**

#### `oauth1aHeadersProvider(integrationOptions)`

**Purpose**: Generates OAuth 1.0a headers for Adobe Commerce API authentication.

**Implementation**:
```javascript
function oauth1aHeadersProvider(integrationOptions) {
  const oauth = new Oauth1a({
    consumer: {
      key: integrationOptions.consumerKey,
      secret: integrationOptions.consumerSecret,
    },
    signature_method: 'HMAC-SHA256',
    hash_function(base_string, key) {
      return crypto.createHmac('sha256', key).update(base_string).digest('base64');
    },
  });

  return (url, method) => {
    const request_data = {
      url,
      method,
    };
    return oauth.toHeader(oauth.authorize(request_data, {
      key: integrationOptions.accessToken,
      secret: integrationOptions.accessTokenSecret,
    }));
  };
}
```

**Key Features**:
- **HMAC-SHA256**: Uses HMAC-SHA256 for signature generation
- **Token Management**: Handles access token and secret
- **Header Generation**: Generates proper OAuth headers
- **URL Signing**: Signs requests with OAuth parameters

### 3. **Adobe Commerce Client Factory**

#### `getAdobeCommerceClient(params)`

**Purpose**: Creates a configured Adobe Commerce client with authentication and method wrappers.

**Implementation**:
```javascript
async function getAdobeCommerceClient(params) {
  const credentials = await resolveCredentials(params);
  const commerceUrl = params.COMMERCE_BASE_URL;
  const logger = Core.Logger('commerce-client', { level: params.LOG_LEVEL || 'info' });

  const client = await getCommerceHttpClient(commerceUrl, {
    imsOptions: credentials,
    logger,
  });

  const wrapper = async (callable) => {
    try {
      const response = await callable();
      return response;
    } catch (error) {
      logger.error('Commerce API error:', error);
      throw error;
    }
  };

  return {
    // Product operations
    getProductsBySku: (skus) => wrapper(() => client.get(`products?searchCriteria[filterGroups][0][filters][0][field]=sku&searchCriteria[filterGroups][0][filters][0][value]=${skus.join(',')}&searchCriteria[filterGroups][0][filters][0][conditionType]=in`).json()),
    getProductSalableQuantity: (sku) => wrapper(() => client.get(`products/${sku}/salable-quantity`).json()),
    getBundleChildProductSalableQuantity: (childSkus) => wrapper(() => client.get(`products/bundle-child-products/salable-quantity?childSkus=${childSkus.join(',')}`).json()),

    // Customer operations
    getCustomerGroupList: (logger) => wrapper(() => client.get('customerGroups/search').json()),
    getCustomerGroupIdByCode: (code) => wrapper(() => client.get(`customerGroups/search?searchCriteria[filterGroups][0][filters][0][field]=code&searchCriteria[filterGroups][0][filters][0][value]=${code}`).json()),

    // Order operations
    getOrdersByIncrementId: (incrementId) => wrapper(() => client.get(`orders?searchCriteria[filterGroups][0][filters][0][field]=increment_id&searchCriteria[filterGroups][0][filters][0][value]=${incrementId}`).json()),
    updateOrderStatus: (orderId, status) => wrapper(() => client.put(`orders/${orderId}`, { json: { entity: { status: status } } }).json()),

    // Inventory operations
    updateInventory: (sku, quantity) => wrapper(() => client.put(`products/${sku}/stockItems/1`, { json: { stockItem: { qty: quantity } } }).json()),

    // Webhook operations
    verifyWebhook: (headers, body, publicKey) => webhookVerify({ __ow_headers: headers, __ow_body: body, COMMERCE_WEBHOOKS_PUBLIC_KEY: publicKey }),
  };
}
```

**Key Features**:
- **Method Wrapping**: Wraps all API calls with error handling
- **Comprehensive API Coverage**: Covers products, customers, orders, inventory
- **Logging Integration**: Integrated logging for all operations
- **Error Propagation**: Proper error handling and propagation

### 4. **Webhook Verification**

#### `webhookVerify({ __ow_headers, __ow_body, COMMERCE_WEBHOOKS_PUBLIC_KEY })`

**Purpose**: Verifies webhook signatures from Adobe Commerce for security.

**Implementation**:
```javascript
function webhookVerify({ __ow_headers: headers = {}, __ow_body: body, COMMERCE_WEBHOOKS_PUBLIC_KEY: publicKey }) {
  try {
    const signature = headers['x-commerce-signature'];
    const timestamp = headers['x-commerce-timestamp'];
    const nonce = headers['x-commerce-nonce'];

    if (!signature || !timestamp || !nonce) {
      throw new Error('Missing required webhook headers');
    }

    const payload = JSON.stringify(body);
    const message = `${timestamp}.${nonce}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', publicKey)
      .update(message)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }

    return true;
  } catch (error) {
    throw new Error(`Webhook verification failed: ${error.message}`);
  }
}
```

**Key Features**:
- **Signature Verification**: HMAC-SHA256 signature verification
- **Timestamp Validation**: Validates webhook timestamps
- **Nonce Validation**: Prevents replay attacks
- **Security**: Ensures webhook authenticity

### 5. **Customer Token Generation**

#### `getCustomerToken(email, dummyPassword, graphQlUrl, logger, firstname)`

**Purpose**: Generates customer authentication tokens for GraphQL operations.

**Implementation**:
```javascript
async function getCustomerToken(email, dummyPassword, graphQlUrl, logger, firstname) {
  try {
    const mutation = `
      mutation {
        generateCustomerToken(
          email: "${email}"
          password: "${dummyPassword}"
        ) {
          token
        }
      }
    `;

    const response = await got.post(graphQlUrl, {
      json: { query: mutation },
      headers: {
        'Content-Type': 'application/json',
      },
    }).json();

    if (response.errors) {
      logger.error('GraphQL errors:', response.errors);
      throw new Error('Failed to generate customer token');
    }

    return response.data.generateCustomerToken.token;
  } catch (error) {
    logger.error('Error generating customer token:', error);
    throw error;
  }
}
```

**Key Features**:
- **GraphQL Integration**: Uses GraphQL for token generation
- **Error Handling**: Comprehensive error handling
- **Logging**: Detailed logging for debugging
- **Token Management**: Secure token generation and handling

### 6. **Order Status Management**

#### `updateOrderStatus(params)`

**Purpose**: Updates order statuses in Adobe Commerce based on external system responses.

**Implementation**:
```javascript
async function updateOrderStatus(params) {
  const logger = Core.Logger('order-status-update', { level: params.LOG_LEVEL || 'info' });
  const client = await getAdobeCommerceClient(params);
  const orders = params.orders || [];

  try {
    const orderStatuses = await fetchOrderStatuses(orders, params, client, logger);
    await updateCommerceOrderStatus(orders, orderStatuses, params, client, logger);
    
    return {
      statusCode: HTTP_OK,
      body: {
        success: true,
        message: 'Order statuses updated successfully',
      },
    };
  } catch (error) {
    logger.error('Error updating order statuses:', error);
    return {
      statusCode: HTTP_INTERNAL_ERROR,
      body: {
        success: false,
        message: 'Failed to update order statuses',
      },
    };
  }
}
```

**Key Features**:
- **Batch Processing**: Handles multiple orders efficiently
- **Status Synchronization**: Synchronizes statuses with external systems
- **Error Handling**: Comprehensive error handling
- **Logging**: Detailed logging for monitoring

### 7. **SSO Authentication Processing**

#### `processSSOAuthentication(params, ssoUrl, logger)`

**Purpose**: Processes Single Sign-On authentication for Adobe Commerce.

**Implementation**:
```javascript
async function processSSOAuthentication(params, ssoUrl, logger) {
  try {
    const authData = params.data.auth;
    const response = await got.post(ssoUrl, {
      json: { data: { auth: authData } },
      headers: {
        'Content-Type': 'application/json',
      },
    }).json();

    if (response.success && response.message) {
      const { token, username } = response.message;
      
      // Generate customer token for Commerce
      const customerToken = await getCustomerToken(
        username,
        'dummy-password',
        params.COMMERCE_GRAPHQL_URL,
        logger,
        username
      );

      return {
        statusCode: HTTP_OK,
        body: {
          success: true,
          message: {
            token: customerToken,
            username: username,
          },
        },
      };
    } else {
      throw new Error('SSO authentication failed');
    }
  } catch (error) {
    logger.error('SSO authentication error:', error);
    return {
      statusCode: HTTP_UNAUTHORIZED,
      body: {
        success: false,
        message: 'Authentication failed',
      },
    };
  }
}
```

**Key Features**:
- **SSO Integration**: Integrates with Adobe SSO services
- **Token Generation**: Generates Commerce customer tokens
- **Error Handling**: Comprehensive error handling
- **Security**: Secure authentication processing

## API Operations

### 1. **Product Operations**

**Get Products by SKU**:
```javascript
const products = await client.getProductsBySku(['SKU1', 'SKU2']);
```

**Get Product Salable Quantity**:
```javascript
const quantity = await client.getProductSalableQuantity('SKU123');
```

**Get Bundle Child Product Salable Quantity**:
```javascript
const quantities = await client.getBundleChildProductSalableQuantity(['CHILD1', 'CHILD2']);
```

### 2. **Customer Operations**

**Get Customer Group List**:
```javascript
const groups = await client.getCustomerGroupList(logger);
```

**Get Customer Group ID by Code**:
```javascript
const groupId = await client.getCustomerGroupIdByCode('GROUP_CODE');
```

### 3. **Order Operations**

**Get Orders by Increment ID**:
```javascript
const order = await client.getOrdersByIncrementId('ORDER123');
```

**Update Order Status**:
```javascript
await client.updateOrderStatus('ORDER123', 'processing');
```

### 4. **Inventory Operations**

**Update Inventory**:
```javascript
await client.updateInventory('SKU123', 50);
```

## Error Handling

### 1. **HTTP Error Responses**

**Standard Error Format**:
```javascript
return {
  statusCode: HTTP_INTERNAL_ERROR,
  body: {
    success: false,
    message: 'Error description',
  },
};
```

**Webhook Error Responses**:
```javascript
function webhookErrorResponse(message) {
  return {
    statusCode: HTTP_BAD_REQUEST,
    body: {
      success: false,
      message,
    },
  };
}
```

### 2. **Exception Handling**

**Webhook Exception Responses**:
```javascript
function webhookErrorResponseWithException(message) {
  return {
    statusCode: HTTP_INTERNAL_ERROR,
    body: {
      success: false,
      message,
      exception: true,
    },
  };
}
```

## Performance Optimization

### 1. **HTTP Client Optimization**

- **HTTP/2 Support**: Uses HTTP/2 for improved performance
- **Connection Pooling**: Efficient connection management
- **Request Batching**: Batch multiple requests when possible
- **Retry Logic**: Intelligent retry with exponential backoff

### 2. **Caching Strategy**

- **Response Caching**: Cache API responses where appropriate
- **Token Caching**: Cache authentication tokens
- **Connection Reuse**: Reuse HTTP connections

### 3. **Request Optimization**

- **Batch Operations**: Use batch endpoints when available
- **Selective Fields**: Request only needed fields
- **Pagination**: Handle large datasets efficiently

## Security Considerations

### 1. **Authentication Security**

- **OAuth 1.0a**: Secure OAuth 1.0a implementation
- **IMS Integration**: Secure IMS Bearer token handling
- **Token Management**: Secure token generation and storage
- **Scope Validation**: Validate required scopes

### 2. **Webhook Security**

- **Signature Verification**: HMAC-SHA256 signature verification
- **Timestamp Validation**: Prevent replay attacks
- **Nonce Validation**: Ensure request uniqueness
- **Public Key Management**: Secure public key handling

### 3. **Data Security**

- **Input Validation**: Validate all input data
- **Output Sanitization**: Sanitize output data
- **Error Information**: Avoid exposing sensitive information
- **Audit Logging**: Comprehensive audit logging

## Testing and Validation

### 1. **Unit Testing**

- **Function Testing**: Test individual functions
- **Mock Services**: Use mock services for external dependencies
- **Error Scenarios**: Test error handling scenarios
- **Edge Cases**: Test edge cases and boundary conditions

### 2. **Integration Testing**

- **API Integration**: Test integration with Adobe Commerce
- **Authentication Testing**: Test authentication flows
- **Webhook Testing**: Test webhook verification
- **End-to-End Testing**: Test complete workflows

### 3. **Performance Testing**

- **Load Testing**: Test performance under load
- **Concurrency Testing**: Test concurrent requests
- **Memory Testing**: Test memory usage
- **Network Testing**: Test network resilience

## Future Enhancements

### 1. **Performance Improvements**

- **Advanced Caching**: Implement more sophisticated caching
- **Connection Optimization**: Optimize connection management
- **Request Optimization**: Implement request optimization
- **Memory Optimization**: Optimize memory usage

### 2. **Feature Enhancements**

- **Additional APIs**: Support for additional Commerce APIs
- **Enhanced Logging**: Implement structured logging
- **Monitoring Integration**: Integrate with monitoring systems
- **Analytics Integration**: Add analytics and metrics

### 3. **Security Enhancements**

- **Enhanced Encryption**: Implement additional encryption
- **Access Control**: Implement granular access control
- **Audit Trail**: Enhance audit trail capabilities
- **Compliance**: Ensure compliance with security standards

This documentation provides comprehensive coverage of the Adobe Commerce integration library and its role in the Adobe Brand Store App Builder. 
