# Request Schema Documentation

## Overview

This document covers the request schema files in the `/requestSchema/` directory. These JSON Schema files define the structure and validation rules for API requests in the Adobe API Mesh configuration. They ensure type safety, input validation, and consistent request formats across all GraphQL operations.

## Schema Files

### 1. `sso-request-schema.json` - SSO Request Schema

**Purpose**: Defines the request structure for Single Sign-On authentication operations.

**Schema Structure**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SSO Request Schema",
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "auth": {
          "type": "string"
        }
      },
      "required": ["auth"]
    }
  },
  "required": ["data"]
}
```

**Key Features**:
- **Authentication Data**: Nested object structure for authentication information
- **Auth Token**: String field for authentication token or credentials
- **Required Fields**: Both `data` and `auth` are mandatory
- **Nested Validation**: Validates nested object structure

**Usage**: Used by the `ssov2` service for Adobe identity-based authentication.

**GraphQL Integration**:
- **Service**: `ssov2`
- **Field**: `ssov2`
- **Type**: Mutation
- **Path**: `/consumer`

### 2. `add-req-schema.json` - Address Validation Request Schema

**Purpose**: Defines the request structure for UPS address validation operations.

**Schema Structure**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Address Schema",
  "type": "object",
  "properties": {
    "address": {
      "type": "object",
      "properties": {
        "firstname": { "type": "string" },
        "lastname": { "type": "string" },
        "company": { "type": "string" },
        "street_line": {
          "type": "array",
          "items": { "type": "string" }
        },
        "postcode": { "type": "string" },
        "city": { "type": "string" },
        "region_code": { "type": "string" },
        "country_code": { "type": "string" }
      },
      "required": ["firstname", "lastname", "street_line", "postcode", "city", "region_code", "country_code"]
    }
  },
  "required": ["address"]
}
```

**Key Features**:
- **Complete Address Structure**: Comprehensive address information
- **Personal Information**: First name, last name, and company fields
- **Address Components**: Street lines, postal code, city, region, and country
- **Array Support**: Street lines as array for multi-line addresses
- **Required Fields**: All essential address components are mandatory

**Usage**: Used by the `upsAddressValidation` service for UPS address validation.

**GraphQL Integration**:
- **Service**: `upsAddressValidation`
- **Field**: `upsAddressValidation`
- **Type**: Mutation
- **Path**: `/validate-address`

### 3. `contactus-req-schema.json` - Contact Us Request Schema

**Purpose**: Defines the request structure for contact form submission operations.

**Schema Structure**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Contact Us Request Schema",
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "firstname": { "type": "string" },
        "lastname": { "type": "string" },
        "email": {
          "type": "string",
          "format": "email"
        },
        "message": { "type": "string" }
      },
      "required": ["firstname", "lastname", "email", "message"]
    }
  },
  "required": ["data"]
}
```

**Key Features**:
- **Contact Information**: Personal details (first name, last name)
- **Email Validation**: Email field with format validation
- **Message Content**: Text field for contact message
- **Required Fields**: All contact information is mandatory
- **Format Validation**: Email format is validated

**Usage**: Used by the `contactUs` service for customer support form processing.

**GraphQL Integration**:
- **Service**: `contactUs`
- **Field**: `contactUs`
- **Type**: Mutation
- **Path**: `/contact-us`

### 4. `cust-req-schema.json` - Customer Group Request Schema

**Purpose**: Defines the request structure for customer group operations.

**Schema Structure**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Customer Group Request Schema",
  "type": "object",
  "properties": {
    "email": {
      "type": "string",
      "format": "email"
    }
  },
  "required": ["email"]
}
```

**Key Features**:
- **Email-Based Lookup**: Uses email for customer identification
- **Email Validation**: Email field with format validation
- **Simple Structure**: Single field request for group operations
- **Required Field**: Email is mandatory for group operations

**Usage**: Used by the `customerGroup` service for customer group management operations.

**GraphQL Integration**:
- **Service**: `customerGroup`
- **Field**: `customerGroup`
- **Type**: Mutation
- **Path**: `/group`

### 5. `get-customer-group.json` - Get Customer Group Request Schema

**Purpose**: Defines the request structure for customer group name retrieval operations.

**Schema Structure**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "Get Customer Group",
  "properties": {
    "customer": {
      "type": "object",
      "properties": {
        "uid": {
          "type": "string"
        }
      },
      "required": ["uid"]
    }
  },
  "required": ["customer"]
}
```

**Key Features**:
- **Customer Identification**: Uses customer UID for identification
- **Nested Structure**: Customer object containing UID
- **Required Fields**: Both `customer` and `uid` are mandatory
- **UID-Based Lookup**: Uses unique customer identifier

**Usage**: Used by the `customerGroup` service for retrieving customer group information.

**GraphQL Integration**:
- **Service**: `customerGroup`
- **Field**: `customerGroupName`
- **Type**: Mutation
- **Path**: `/get-group-name`

### 6. `pro-stock-req-schema.json` - Product Stock Request Schema

**Purpose**: Defines the request structure for product stock information queries.

**Schema Structure**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Product Stock Request Schema",
  "type": "object",
  "properties": {
    "sku": {
      "type": "string"
    }
  },
  "required": ["sku"]
}
```

**Key Features**:
- **SKU-Based Lookup**: Uses product SKU for stock queries
- **Simple Structure**: Single field request for stock information
- **Required Field**: SKU is mandatory for stock queries
- **String Validation**: SKU must be a string value

**Usage**: Used by the `productStock` service for real-time stock queries.

**GraphQL Integration**:
- **Service**: `productStock`
- **Field**: `productStock`
- **Type**: Query
- **Path**: `/stock?sku={args.sku}&product_type={args.product_type}&child_sku={args.child_sku}`

## Common Patterns and Best Practices

### 1. **Schema Structure Patterns**

**Simple Field Pattern**:
```json
{
  "type": "object",
  "properties": {
    "field": { "type": "string" }
  },
  "required": ["field"]
}
```

**Nested Object Pattern**:
```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "field": { "type": "string" }
      },
      "required": ["field"]
    }
  },
  "required": ["data"]
}
```

**Complex Object Pattern**:
```json
{
  "type": "object",
  "properties": {
    "object": {
      "type": "object",
      "properties": {
        "field1": { "type": "string" },
        "field2": { "type": "number" },
        "field3": {
          "type": "array",
          "items": { "type": "string" }
        }
      },
      "required": ["field1", "field2"]
    }
  },
  "required": ["object"]
}
```

### 2. **Validation Rules**

**Required Fields**: Always specify required fields for critical data
**Type Safety**: Use appropriate data types (string, number, boolean, object, array)
**Format Validation**: Use format validation for emails, URLs, etc.
**Array Validation**: Specify item types for array validation

### 3. **Error Handling**

**Validation Errors**: Return specific validation error details
**Missing Fields**: Handle missing required fields gracefully
**Type Mismatches**: Handle data type mismatches
**Format Errors**: Handle format validation failures

## API Mesh Integration

### 1. **Configuration Structure**

**Service Definition**:
```json
{
  "name": "serviceName",
  "handler": {
    "JsonSchema": {
      "baseUrl": "https://runtime-url/api/v1/web/service",
      "operations": [
        {
          "type": "Mutation|Query",
          "field": "fieldName",
          "path": "/endpoint",
          "method": "POST|GET",
          "requestSchema": "./requestSchema/request-schema.json",
          "responseSchema": "./responseSchema/response-schema.json"
        }
      ]
    }
  }
}
```

### 2. **Schema Mapping**

**Request-Response Pairs**:
- `sso-request-schema.json` ↔ `sso-response-schema.json`
- `cust-req-schema.json` ↔ `cust-res-schema.json`
- `get-customer-group.json` ↔ `get-customer-group.json`
- `contactus-req-schema.json` ↔ `contactus-res-schema.json`
- `add-req-schema.json` ↔ `add-res-schema.json`
- `pro-stock-req-schema.json` ↔ `pro-stock-res-schema.json`

### 3. **GraphQL Type Generation**

**Automatic Type Generation**: API Mesh automatically generates GraphQL input types from request schemas
**Type Safety**: Ensures GraphQL input types match JSON schema definitions
**Validation**: Validates requests against schema definitions
**Documentation**: Generates GraphQL documentation from schema descriptions

## Performance and Optimization

### 1. **Schema Validation**

**Runtime Validation**: Validates requests at runtime
**Performance Impact**: Minimal performance overhead
**Error Detection**: Catches data structure errors early
**Type Safety**: Ensures consistent data types

### 2. **Caching Strategy**

**Schema Caching**: Cache schema definitions for performance
**Validation Caching**: Cache validation results
**Performance Optimization**: Reduce validation overhead

### 3. **Error Handling**

**Validation Errors**: Handle schema validation failures
**Type Mismatches**: Handle data type mismatches
**Missing Fields**: Handle missing required fields
**Invalid Data**: Handle malformed data structures

## Security Considerations

### 1. **Input Validation**

**Data Sanitization**: Validate and sanitize all input data
**Type Checking**: Ensure data types match schema definitions
**Size Limits**: Enforce reasonable data size limits
**Content Validation**: Validate content against expected patterns

### 2. **Error Information**

**Sensitive Data**: Avoid exposing sensitive data in error messages
**Debug Information**: Limit debug information in production
**Error Logging**: Log errors for debugging without exposing details
**User Messages**: Provide user-friendly error messages

### 3. **Schema Security**

**Schema Validation**: Validate schema files themselves
**Schema Versioning**: Use schema versioning for compatibility
**Backward Compatibility**: Maintain backward compatibility
**Schema Evolution**: Handle schema changes gracefully

## Testing and Validation

### 1. **Schema Testing**

**Unit Tests**: Test individual schema definitions
**Validation Tests**: Test schema validation logic
**Integration Tests**: Test schema integration with API Mesh
**End-to-End Tests**: Test complete request-response cycles

### 2. **Data Validation**

**Valid Data**: Test with valid data structures
**Invalid Data**: Test with invalid data structures
**Edge Cases**: Test edge cases and boundary conditions
**Error Scenarios**: Test error handling scenarios

### 3. **Performance Testing**

**Validation Performance**: Test schema validation performance
**Response Time**: Test impact on response times
**Memory Usage**: Test memory usage impact
**Scalability**: Test scalability under load

## Future Enhancements

### 1. **Schema Evolution**

**Versioning**: Implement schema versioning
**Migration**: Add schema migration tools
**Compatibility**: Maintain backward compatibility
**Documentation**: Auto-generate schema documentation

### 2. **Advanced Validation**

**Custom Validators**: Add custom validation rules
**Conditional Validation**: Implement conditional validation
**Cross-Field Validation**: Add cross-field validation rules
**Business Logic**: Integrate business logic validation

### 3. **Monitoring and Observability**

**Validation Metrics**: Collect validation metrics
**Error Tracking**: Track validation errors
**Performance Monitoring**: Monitor validation performance
**Health Checks**: Add schema health checks

This documentation provides comprehensive coverage of the request schema files and their role in the Adobe Brand Store App Builder API Mesh configuration. 
