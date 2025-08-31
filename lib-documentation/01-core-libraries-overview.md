# Core Libraries Documentation

## Overview

This document covers the core library files in the `/lib/` directory. These JavaScript modules provide essential utilities, authentication, state management, and integration capabilities for the Adobe Brand Store App Builder. They serve as the foundation for all action modules and provide reusable functionality across the application.

## Library Files

### 1. `http.js` - HTTP Constants and Utilities

**Purpose**: Provides HTTP status codes and constants used throughout the application.

**Key Features**:
- **HTTP Status Codes**: Standard HTTP response codes (200, 400, 401, 404, 500)
- **Event Constants**: Constants for event processing
- **Provider Keys**: Backoffice provider identification

**Exported Constants**:
```javascript
module.exports = {
  HTTP_BAD_REQUEST: 400,
  HTTP_INTERNAL_ERROR: 500,
  HTTP_NOT_FOUND: 404,
  HTTP_OK: 200,
  HTTP_UNAUTHORIZED: 401,
  BACKOFFICE_PROVIDER_KEY: 'backoffice',
  PUBLISH_EVENT_SUCCESS: 'OK',
};
```

**Usage**: Used across all action modules for consistent HTTP response handling.

**Key Benefits**:
- **Consistency**: Standardized HTTP status codes across the application
- **Maintainability**: Centralized constants for easy updates
- **Type Safety**: Prevents typos in status codes
- **Documentation**: Clear naming for HTTP responses

### 2. `env.js` - Environment Variable Management

**Purpose**: Provides utilities for managing environment variables in `.env` files.

**Key Functions**:
- **`replaceEnvVar(filePath, key, value)`**: Replaces or creates environment variables in `.env` files

**Implementation**:
```javascript
function replaceEnvVar(filePath, key, value) {
  const envPath = path.resolve(filePath);
  const envFile = fs.readFileSync(envPath, 'utf8');
  const envLines = envFile.split('\n');

  const formattedValue = value.includes(' ') ? `"${value}"` : value;
  let keyExists = false;

  const updatedLines = envLines.map((line) => {
    if (line.trim().startsWith('#') || !line.includes('=')) {
      return line;
    }
    const [currentKey] = line.split('=');
    if (currentKey === key) {
      keyExists = true;
      return `${key}=${formattedValue}`;
    }
    return line;
  });

  if (!keyExists) {
    updatedLines.push(`${key}=${formattedValue}`);
  }

  fs.writeFileSync(envPath, updatedLines.join('\n'), 'utf8');
}
```

**Usage**: Used by configuration scripts to update environment variables.

**Key Features**:
- **Safe Updates**: Preserves existing environment variables
- **Value Formatting**: Handles values with spaces correctly
- **Comment Preservation**: Maintains comments in `.env` files
- **Error Handling**: Graceful handling of file operations

### 3. `key-values.js` - Key-Value Encoding Utilities

**Purpose**: Provides utilities for encoding and decoding objects to/from key-value string format.

**Key Functions**:
- **`encode(object, pairDelimiter, keyValueDelimiter)`**: Encodes objects to key-value strings
- **`decode(str, pairDelimiter, keyValueDelimiter)`**: Decodes key-value strings to objects

**Implementation**:
```javascript
function encode(object, pairDelimiter = ',', keyValueDelimiter = ':') {
  if (typeof object !== 'object') {
    return '';
  }

  return Object.entries(object)
    .map(([key, value]) => `${key}${keyValueDelimiter}${value}`)
    .join(pairDelimiter);
}

function decode(str, pairDelimiter = ',', keyValueDelimiter = ':') {
  if (typeof str !== 'string') {
    return {};
  }

  return str
    .split(pairDelimiter)
    .map((pair) => pair.split(keyValueDelimiter))
    .reduce((decoded, keyValue) => {
      if (keyValue.length !== 2) {
        throw new Error(`Can't decode the key value '${keyValue}'`);
      }
      decoded[keyValue[0]] = keyValue[1];
      return decoded;
    }, {});
}
```

**Usage Examples**:
```javascript
// Encoding
const obj = { foo: 'bar', baz: 'qux' };
const encoded = encode(obj); // 'foo:bar,baz:qux'

// Decoding
const decoded = decode('foo:bar,baz:qux'); // { foo: 'bar', baz: 'qux' }
```

**Key Features**:
- **Flexible Delimiters**: Customizable delimiters for different formats
- **Error Handling**: Validates input and provides meaningful errors
- **Type Safety**: Handles different input types gracefully
- **Bidirectional**: Supports both encoding and decoding

### 4. `adobe-auth.js` - Adobe Authentication Utilities

**Purpose**: Provides authentication utilities for Adobe services using OAuth and IMS.

**Key Functions**:
- **`getAdobeAccessToken(params)`**: Generates access tokens for Adobe services
- **`resolveCredentials(params)`**: Resolves complete credentials for Adobe services

**Implementation**:
```javascript
async function getAdobeAccessToken(params) {
  const config = {
    client_id: params.OAUTH_CLIENT_ID,
    client_secrets: JSON.parse(params.OAUTH_CLIENT_SECRETS),
    technical_account_id: params.OAUTH_TECHNICAL_ACCOUNT_ID,
    technical_account_email: params.OAUTH_TECHNICAL_ACCOUNT_EMAIL,
    ims_org_id: params.OAUTH_IMS_ORG_ID,
    scopes: JSON.parse(params.OAUTH_SCOPES),
    env: params.AIO_CLI_ENV ?? 'prod',
  };
  await context.set('commerce-starter-kit-creds', config);
  return getToken('commerce-starter-kit-creds', {});
}

async function resolveCredentials(params) {
  return {
    accessToken: await getAdobeAccessToken(params),
    imsOrgId: params.OAUTH_IMS_ORG_ID,
    apiKey: params.OAUTH_CLIENT_ID,
  };
}
```

**Usage**: Used by Adobe Commerce integration for authentication.

**Key Features**:
- **OAuth Integration**: Supports OAuth 1.0a authentication
- **IMS Integration**: Integrates with Adobe Identity Management Service
- **Token Management**: Handles access token generation and management
- **Credential Resolution**: Provides complete credential objects

### 5. `aio-state.js` - Adobe I/O State Management

**Purpose**: Provides state management utilities using Adobe I/O State for caching and data persistence.

**Key Functions**:
- **`getProductBySku(params, sku, logger)`**: Retrieves and caches product information
- **`getCustomerGroupById(params, logger, customerGroupId)`**: Retrieves and caches customer group information
- **`getCustomerGroupIdFromCode(params, logger)`**: Retrieves customer group ID from code with caching
- **`getOrderGiftMessage(params, logger)`**: Retrieves and caches order gift messages

**Implementation Example**:
```javascript
async function getProductBySku(params, sku, logger) {
  try {
    const state = await stateLib.init();
    const sanitizedSku = sku.replace(/\s+/g, '-');
    const cachedProduct = await state.get(sanitizedSku);
    let items;
    
    if (cachedProduct?.value) {
      items = JSON.parse(cachedProduct.value);
    } else {
      const client = await getAdobeCommerceClient(params);
      const product = await client.getProductsBySku([sku]);
      items = product.message.items[0];
      await state.put(sanitizedSku, JSON.stringify(items), { ttl: 86400 });
    }
    
    if (!items) {
      logger.info(`Product ${sku} not found`);
      return null;
    }
    return items;
  } catch (error) {
    logger.error('Error fetching product:', error);
  }
  return null;
}
```

**Usage**: Used across action modules for caching frequently accessed data.

**Key Features**:
- **Intelligent Caching**: Caches data with configurable TTL
- **Cache Invalidation**: Handles cache misses and updates
- **Error Handling**: Graceful error handling with logging
- **Data Serialization**: Handles JSON serialization/deserialization

### 6. `adobe-commerce.js` - Adobe Commerce Integration

**Purpose**: Provides comprehensive integration utilities for Adobe Commerce (Magento) APIs.

**Key Functions**:
- **`getCommerceHttpClient(commerceUrl, options)`**: Creates configured HTTP clients
- **`getAdobeCommerceClient(params)`**: Creates Adobe Commerce client instances
- **`webhookVerify(headers, body, publicKey)`**: Verifies webhook signatures
- **`getCustomerToken(email, password, graphQlUrl, logger, firstname)`**: Generates customer tokens
- **`updateOrderStatus(params)`**: Updates order statuses
- **`processSSOAuthentication(params, ssoUrl, logger)`**: Handles SSO authentication

**Implementation Highlights**:
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
      // ... additional hooks
    },
  });

  // Configure authentication based on options
  if (integrationOptions) {
    // OAuth 1.0a configuration
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

  // IMS Bearer token configuration
  return commerceGot.extend({
    headers: {
      'x-ims-org-id': imsOptions.imsOrgId,
      'x-api-key': imsOptions.apiKey,
      Authorization: `Bearer ${imsOptions.accessToken}`,
    },
  });
}
```

**Usage**: Used by all Adobe Commerce-related action modules.

**Key Features**:
- **Dual Authentication**: Supports both OAuth 1.0a and IMS Bearer tokens
- **HTTP/2 Support**: Uses HTTP/2 for improved performance
- **Request Logging**: Comprehensive request/response logging
- **Error Handling**: Robust error handling with retry logic
- **Webhook Verification**: Secure webhook signature verification

### 7. `region-codes.js` - Geographic Region Codes

**Purpose**: Provides comprehensive geographic region codes for US, Canada, Germany, and other countries.

**Key Features**:
- **US States**: All 50 US states plus territories and military regions
- **Canadian Provinces**: All Canadian provinces and territories
- **German States**: All German federal states
- **International Support**: Additional countries and regions

**Data Structure**:
```javascript
const REGION_CODES = [
  ['US', 'AL', 'Alabama'],
  ['US', 'AK', 'Alaska'],
  ['US', 'CA', 'California'],
  ['CA', 'AB', 'Alberta'],
  ['CA', 'BC', 'British Columbia'],
  ['DE', 'NDS', 'Niedersachsen'],
  ['DE', 'BAW', 'Baden-Württemberg'],
  // ... additional regions
];
```

**Key Functions**:
- **`getRegionCodeByName(regionName)`**: Retrieves region codes by name
- **Region Lookup**: Efficient region code lookup functionality

**Usage**: Used for address validation and geographic data processing.

**Key Features**:
- **Comprehensive Coverage**: Extensive geographic coverage
- **Standardized Codes**: Uses official region codes
- **Efficient Lookup**: Optimized for fast region lookups
- **International Support**: Multi-country region support

## Common Patterns and Best Practices

### 1. **Error Handling**

**Consistent Error Patterns**:
```javascript
try {
  // Operation logic
  return result;
} catch (error) {
  logger.error('Error description:', error);
  return null; // or appropriate error response
}
```

**HTTP Error Responses**:
```javascript
return {
  statusCode: HTTP_INTERNAL_ERROR,
  body: {
    success: false,
    message: 'Error description',
  },
};
```

### 2. **Logging Patterns**

**Structured Logging**:
```javascript
logger.info('Operation description:', { key: 'value' });
logger.debug('Debug information:', data);
logger.error('Error occurred:', error);
```

**Request/Response Logging**:
```javascript
logger.debug(`Request [${method}] ${url}`);
logger.debug(`Response [${method}] ${url} - ${statusCode}`);
```

### 3. **Caching Patterns**

**State Management**:
```javascript
const state = await stateLib.init();
const cached = await state.get(key);

if (cached?.value) {
  return JSON.parse(cached.value);
} else {
  const data = await fetchData();
  await state.put(key, JSON.stringify(data), { ttl: 86400 });
  return data;
}
```

### 4. **Authentication Patterns**

**Credential Resolution**:
```javascript
const credentials = await resolveCredentials(params);
const client = getCommerceHttpClient(url, {
  imsOptions: credentials,
  logger,
});
```

## Performance and Optimization

### 1. **Caching Strategy**

**TTL Configuration**:
- **Short-term Cache**: 1 hour (3600 seconds) for frequently changing data
- **Medium-term Cache**: 1 day (86400 seconds) for moderately stable data
- **Long-term Cache**: 1 year (31536000 seconds) for static data

**Cache Key Management**:
- **Sanitized Keys**: Remove special characters from cache keys
- **Namespaced Keys**: Use prefixes to avoid key collisions
- **Versioned Keys**: Include version information in cache keys

### 2. **HTTP Client Optimization**

**HTTP/2 Support**: Uses HTTP/2 for improved performance
**Connection Pooling**: Efficient connection management
**Request Batching**: Batch multiple requests when possible
**Retry Logic**: Intelligent retry with exponential backoff

### 3. **Memory Management**

**Object Serialization**: Efficient JSON serialization/deserialization
**Resource Cleanup**: Proper cleanup of resources and connections
**Memory Monitoring**: Monitor memory usage in production

## Security Considerations

### 1. **Authentication Security**

**Credential Management**: Secure handling of OAuth credentials
**Token Rotation**: Support for token rotation and refresh
**Scope Validation**: Validate required scopes for operations
**Access Control**: Implement proper access control mechanisms

### 2. **Data Security**

**Input Validation**: Validate all input data
**Output Sanitization**: Sanitize output data
**Encryption**: Use encryption for sensitive data
**Audit Logging**: Comprehensive audit logging

### 3. **API Security**

**Webhook Verification**: Secure webhook signature verification
**Rate Limiting**: Implement rate limiting for API calls
**Request Validation**: Validate all API requests
**Error Information**: Avoid exposing sensitive information in errors

## Testing and Validation

### 1. **Unit Testing**

**Function Testing**: Test individual functions in isolation
**Mock Services**: Use mock services for external dependencies
**Error Scenarios**: Test error handling scenarios
**Edge Cases**: Test edge cases and boundary conditions

### 2. **Integration Testing**

**Service Integration**: Test integration with external services
**End-to-End Testing**: Test complete workflows
**Performance Testing**: Test performance under load
**Security Testing**: Test security measures

### 3. **Validation Testing**

**Input Validation**: Test input validation logic
**Output Validation**: Test output validation logic
**Data Integrity**: Test data integrity measures
**Error Handling**: Test error handling mechanisms

## Future Enhancements

### 1. **Performance Improvements**

**Advanced Caching**: Implement more sophisticated caching strategies
**Connection Optimization**: Optimize HTTP connection management
**Request Optimization**: Implement request optimization techniques
**Memory Optimization**: Optimize memory usage patterns

### 2. **Feature Enhancements**

**Additional Authentication**: Support for additional authentication methods
**Enhanced Logging**: Implement structured logging with correlation IDs
**Monitoring Integration**: Integrate with monitoring and alerting systems
**Analytics Integration**: Add analytics and metrics collection

### 3. **Security Enhancements**

**Enhanced Encryption**: Implement additional encryption measures
**Access Control**: Implement more granular access control
**Audit Trail**: Enhance audit trail capabilities
**Compliance**: Ensure compliance with security standards

This documentation provides comprehensive coverage of the core libraries and their role in the Adobe Brand Store App Builder. 
