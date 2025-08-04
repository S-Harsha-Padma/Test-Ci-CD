# Utilities & Shared Components - Detailed Documentation

## Overview

The utilities and shared components provide common functionality used across the entire Adobe Brand Store App Builder application. These include utility functions, shared libraries, and common patterns that support the various action modules.

## Key Utility Files

### 1. Action Utilities (`actions/utils.js`)

#### `actions/utils.js`
**Purpose**: Common utility functions used across all action modules

**Key Features**:
- **String Parameter Handling**: Utilities for processing string parameters
- **Data Validation**: Common validation functions
- **Error Handling**: Standardized error handling utilities
- **Logging Utilities**: Common logging functions
- **Data Transformation**: Data formatting and transformation utilities

**Core Functions**:

**`stringParameters(params)`**:
- Converts parameters object to string for logging
- Filters sensitive information (passwords, tokens)
- Formats parameters for readable logging
- Handles nested objects and arrays

**`errorResponse(statusCode, message, logger)`**:
- Creates standardized error responses
- Logs error information
- Formats error messages consistently
- Handles different error types

**`validateRequiredFields(data, requiredFields)`**:
- Validates presence of required fields
- Returns validation results with error messages
- Supports nested field validation
- Handles array and object validation

**`formatResponse(data, success = true)`**:
- Standardizes response format across all actions
- Handles success and error responses
- Formats data consistently
- Adds metadata to responses

### 2. Commerce State Management (`actions/commerce/aio-state.js`)

#### `actions/commerce/aio-state.js`
**Purpose**: State management utilities for Adobe Commerce operations

**Key Features**:
- **Region Data Management**: Caches and manages region/country data
- **Tax Class Management**: Handles tax class information
- **HTS Code Management**: Manages Harmonized Tariff Schedule codes
- **State Management**: Uses Adobe I/O State for data persistence
- **Caching**: Implements intelligent caching strategies

**Core Functions**:

**`getStateCode(countryCode, regionId, graphqlUrl, logger)`**:
- Retrieves state/region codes from cached data
- Fetches region data from Adobe Commerce if not cached
- Caches region data for 1 year
- Handles region lookup errors gracefully

**`getTaxClass(params, logger)`**:
- Retrieves tax class information
- Caches tax class data for performance
- Handles tax class mapping
- Supports multiple tax class types

**`getHtsCodesFromCommerce(skus, params, logger)`**:
- Fetches HTS codes for product SKUs
- Manages HTS code caching
- Handles bulk SKU processing
- Supports international trade requirements

**State Management Features**:
- **TTL Management**: Configurable time-to-live for cached data
- **Error Recovery**: Graceful handling of state operation failures
- **Data Validation**: Validates cached data integrity
- **Cache Invalidation**: Intelligent cache invalidation strategies

## Shared Libraries

### 1. Adobe Commerce Integration (`lib/adobe-commerce.js`)

#### `lib/adobe-commerce.js`
**Purpose**: Core Adobe Commerce integration utilities

**Key Features**:
- **HTTP Client Management**: Manages HTTP clients for Adobe Commerce
- **OAuth Authentication**: Handles OAuth 1.0a authentication
- **IMS Integration**: Integrates with Adobe Identity Management Service
- **Webhook Management**: Handles webhook verification and responses
- **Error Handling**: Comprehensive error handling for Commerce operations

**Core Functions**:

**`getCommerceHttpClient(commerceUrl, options)`**:
- Creates configured HTTP client for Adobe Commerce
- Supports both OAuth and IMS authentication
- Implements request/response logging
- Handles retry logic and error recovery

**`getAdobeCommerceClient(params)`**:
- Creates authenticated Adobe Commerce client
- Handles credential resolution
- Supports different authentication methods
- Provides wrapper for Commerce API calls

**`webhookVerify(params)`**:
- Verifies webhook signatures for security
- Validates webhook authenticity
- Handles signature verification errors
- Supports multiple webhook types

**`webhookSuccessResponse()`**:
- Creates standardized webhook success responses
- Formats responses consistently
- Handles different response types
- Provides proper HTTP status codes

**`webhookErrorResponse(message)`**:
- Creates standardized webhook error responses
- Formats error messages consistently
- Handles different error types
- Provides proper HTTP status codes

### 2. Adobe Authentication (`lib/adobe-auth.js`)

#### `lib/adobe-auth.js`
**Purpose**: Adobe authentication and credential management

**Key Features**:
- **Credential Resolution**: Resolves authentication credentials
- **Token Management**: Manages authentication tokens
- **IMS Integration**: Integrates with Adobe Identity Management Service
- **OAuth Support**: Supports OAuth authentication flows
- **Security**: Secure credential handling

**Core Functions**:

**`resolveCredentials(env)`**:
- Resolves authentication credentials from environment
- Supports multiple authentication methods
- Handles credential validation
- Provides fallback authentication options

**`getAccessToken(credentials)`**:
- Retrieves access tokens for Adobe services
- Handles token refresh
- Manages token expiration
- Supports different token types

### 3. HTTP Utilities (`lib/http.js`)

#### `lib/http.js`
**Purpose**: HTTP response constants and utilities

**Key Features**:
- **HTTP Status Codes**: Standard HTTP status code constants
- **Response Utilities**: Common response formatting utilities
- **Error Handling**: Standardized error response handling
- **Content Types**: Common content type constants

**Constants**:
- `HTTP_OK`: 200 OK
- `HTTP_BAD_REQUEST`: 400 Bad Request
- `HTTP_UNAUTHORIZED`: 401 Unauthorized
- `HTTP_NOT_FOUND`: 404 Not Found
- `HTTP_INTERNAL_ERROR`: 500 Internal Server Error

### 4. Environment Management (`lib/env.js`)

#### `lib/env.js`
**Purpose**: Environment variable management and validation

**Key Features**:
- **Environment Validation**: Validates required environment variables
- **Default Values**: Provides default values for optional variables
- **Type Conversion**: Converts environment variables to appropriate types
- **Validation Rules**: Applies validation rules to environment variables

**Core Functions**:

**`validateEnvironment()`**:
- Validates all required environment variables
- Checks for missing or invalid variables
- Provides detailed error messages
- Supports different validation rules

**`getEnvironmentVariable(key, defaultValue)`**:
- Retrieves environment variable with default value
- Handles type conversion
- Validates variable format
- Provides fallback values

### 5. Key-Value Utilities (`lib/key-values.js`)

#### `lib/key-values.js`
**Purpose**: Key-value pair encoding and decoding utilities

**Key Features**:
- **Base64 Encoding**: Encodes/decodes base64 strings
- **JSON Handling**: Handles JSON encoding and decoding
- **Data Validation**: Validates encoded/decoded data
- **Error Handling**: Handles encoding/decoding errors

**Core Functions**:

**`encode(data)`**:
- Encodes data to base64 string
- Handles JSON serialization
- Validates input data
- Provides error handling

**`decode(encodedData)`**:
- Decodes base64 string to data
- Handles JSON deserialization
- Validates decoded data
- Provides error handling

## Common Patterns

### 1. Error Handling Pattern

**Standardized Error Response**:
```javascript
function handleError(error, logger) {
  logger.error('Error occurred:', error);
  return {
    statusCode: HTTP_INTERNAL_ERROR,
    body: {
      success: false,
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      }
    }
  };
}
```

**Webhook Error Handling**:
```javascript
function handleWebhookError(error, logger) {
  logger.error('Webhook error:', error);
  return webhookErrorResponseWithException(error.message);
}
```

### 2. Logging Pattern

**Structured Logging**:
```javascript
const logger = Core.Logger('action-name', { level: params.LOG_LEVEL || 'info' });

logger.info('Starting operation');
logger.debug('Parameters:', stringParameters(params));
logger.error('Error occurred:', error);
```

**Parameter Logging**:
```javascript
logger.debug('Request parameters:', stringParameters(params));
logger.debug('Response data:', JSON.stringify(responseData));
```

### 3. Validation Pattern

**Input Validation**:
```javascript
function validateInput(params) {
  const requiredFields = ['field1', 'field2'];
  const validation = validateRequiredFields(params, requiredFields);
  
  if (!validation.success) {
    return {
      success: false,
      error: validation.message
    };
  }
  
  return { success: true };
}
```

**Data Validation**:
```javascript
function validateData(data, schema) {
  try {
    // Validate against schema
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

### 4. Response Pattern

**Success Response**:
```javascript
function createSuccessResponse(data) {
  return {
    statusCode: HTTP_OK,
    body: {
      success: true,
      data: data
    }
  };
}
```

**Error Response**:
```javascript
function createErrorResponse(message, statusCode = HTTP_BAD_REQUEST) {
  return {
    statusCode: statusCode,
    body: {
      success: false,
      error: {
        message: message
      }
    }
  };
}
```

## Performance Optimization

### 1. Caching Strategies

**State-Based Caching**:
- Uses Adobe I/O State for persistent caching
- Configurable TTL for different data types
- Intelligent cache invalidation
- Memory-efficient caching

**Response Caching**:
- Caches common API responses
- Implements cache headers
- Supports conditional requests
- Optimizes cache hit rates

### 2. Request Optimization

**HTTP Client Optimization**:
- Connection pooling
- Request batching
- Parallel processing
- Response compression

**Data Processing**:
- Efficient data transformation
- Minimal data copying
- Optimized algorithms
- Memory management

## Security Features

### 1. Data Protection

**Credential Security**:
- Secure credential storage
- Encrypted communication
- Token management
- Access control

**Input Validation**:
- Input sanitization
- Data validation
- XSS prevention
- SQL injection protection

### 2. Error Handling

**Secure Error Messages**:
- No sensitive data in error messages
- Generic error messages for security
- Detailed logging for debugging
- Error classification

## Testing Support

### 1. Mock Utilities

**Mock Services**:
- Mock HTTP clients
- Mock authentication
- Mock state management
- Mock external services

**Test Data**:
- Test data generators
- Mock responses
- Test scenarios
- Validation test cases

### 2. Testing Patterns

**Unit Testing**:
- Individual function testing
- Mock dependency injection
- Error scenario testing
- Performance testing

**Integration Testing**:
- End-to-end testing
- Service integration testing
- Error handling testing
- Load testing

## Configuration Management

### 1. Environment Configuration

**Environment Variables**:
- Required vs optional variables
- Default values
- Validation rules
- Type conversion

**Feature Flags**:
- Feature enablement
- A/B testing support
- Gradual rollout
- Configuration validation

### 2. Dynamic Configuration

**Runtime Configuration**:
- Dynamic parameter updates
- Configuration validation
- Hot reloading
- Configuration monitoring

## Monitoring and Observability

### 1. Logging

**Structured Logging**:
- Consistent log format
- Log levels
- Context information
- Performance metrics

**Error Tracking**:
- Error classification
- Error patterns
- Error rates
- Error recovery

### 2. Metrics

**Performance Metrics**:
- Response times
- Throughput
- Resource usage
- Cache performance

**Business Metrics**:
- Success rates
- Error rates
- Usage patterns
- User behavior

## Future Enhancements

### 1. Advanced Features

**Enhanced Caching**:
- Distributed caching
- Cache warming
- Predictive caching
- Cache analytics

**Advanced Monitoring**:
- Real-time monitoring
- Predictive analytics
- Automated alerting
- Performance dashboards

### 2. Performance Improvements

**Scalability Enhancements**:
- Horizontal scaling
- Load balancing
- Database optimization
- Network optimization

**Security Enhancements**:
- Advanced authentication
- Enhanced encryption
- Security monitoring
- Compliance improvements 
