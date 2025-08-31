# Response Schema Documentation

## Overview

This document covers the response schema files in the `/responseSchema/` directory. These JSON Schema files define the structure and validation rules for API responses in the Adobe API Mesh configuration. They ensure type safety, data validation, and consistent response formats across all GraphQL operations.

## Schema Files

### 1. `pro-stock-res-schema.json` - Product Stock Response Schema

**Purpose**: Defines the response structure for product stock information queries.

**Schema Structure**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Product Stock Response Schema",
  "type": "object",
  "properties": {
    "qty": {
      "type": "number"
    }
  },
  "required": ["qty"]
}
```

**Key Features**:
- **Quantity Field**: Returns stock quantity as a number
- **Required Field**: `qty` is mandatory in all responses
- **Type Safety**: Ensures quantity is always a numeric value

**Usage**: Used by the `productStock` service in API Mesh for real-time stock queries.

**GraphQL Integration**: 
- **Service**: `productStock`
- **Field**: `productStock`
- **Type**: Query
- **Path**: `/stock?sku={args.sku}&product_type={args.product_type}&child_sku={args.child_sku}`

### 2. `sso-response-schema.json` - SSO Response Schema

**Purpose**: Defines the response structure for Single Sign-On authentication operations.

**Schema Structure**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SSO Response Schema",
  "type": "object",
  "properties": {
    "message": {
      "type": "object",
      "properties": {
        "token": {
          "type": "string"
        },
        "username": {
          "type": "string"
        }
      },
      "required": ["token", "username"]
    },
    "success": {
      "type": "boolean"
    }
  },
  "required": ["message", "success"]
}
```

**Key Features**:
- **Authentication Token**: Returns JWT or session token
- **User Information**: Includes authenticated username
- **Success Status**: Boolean flag indicating operation success
- **Nested Structure**: Message object contains authentication details

**Usage**: Used by the `ssov2` service for Adobe identity-based authentication.

**GraphQL Integration**:
- **Service**: `ssov2`
- **Field**: `ssov2`
- **Type**: Mutation
- **Path**: `/consumer`

### 3. `get-customer-group.json` - Customer Group Response Schema

**Purpose**: Defines the response structure for customer group name retrieval operations.

**Schema Structure**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Customer Group Response Schema",
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string" }
  },
  "required": ["id", "name"]
}
```

**Key Features**:
- **Group ID**: Unique identifier for the customer group
- **Group Name**: Human-readable name of the customer group
- **Required Fields**: Both ID and name are mandatory

**Usage**: Used by the `customerGroup` service for retrieving customer group information.

**GraphQL Integration**:
- **Service**: `customerGroup`
- **Field**: `customerGroupName`
- **Type**: Mutation
- **Path**: `/get-group-name`

### 4. `cust-res-schema.json` - Customer Group Response Schema

**Purpose**: Defines the response structure for customer group operations.

**Schema Structure**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Customer Group Response Schema",
  "type": "object",
  "properties": {
    "customer_group": {
      "type": "string"
    }
  },
  "required": ["customer_group"]
}
```

**Key Features**:
- **Customer Group**: Returns the customer group identifier as a string
- **Simple Structure**: Single field response for group operations
- **Required Field**: Customer group is mandatory

**Usage**: Used by the `customerGroup` service for customer group management operations.

**GraphQL Integration**:
- **Service**: `customerGroup`
- **Field**: `customerGroup`
- **Type**: Mutation
- **Path**: `/group`

### 5. `contactus-res-schema.json` - Contact Us Response Schema

**Purpose**: Defines the response structure for contact form submission operations.

**Schema Structure**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Contact Us Response Schema",
  "type": "object",
  "properties": {
    "message": {
      "type": "string"
    },
    "success": {
      "type": "boolean"
    }
  },
  "required": ["message", "success"]
}
```

**Key Features**:
- **Response Message**: Human-readable response message
- **Success Status**: Boolean flag indicating operation success
- **Required Fields**: Both message and success status are mandatory

**Usage**: Used by the `contactUs` service for customer support form processing.

**GraphQL Integration**:
- **Service**: `contactUs`
- **Field**: `contactUs`
- **Type**: Mutation
- **Path**: `/contact-us`

### 6. `add-res-schema.json` - Address Validation Response Schema

**Purpose**: Defines the response structure for UPS address validation operations.

**Schema Structure**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Address Validation Response Schema",
  "type": "object",
  "properties": {
    "candidates": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "AddressClassification": {
            "type": "object",
            "properties": {
              "Code": { "type": "string" },
              "Description": { "type": "string" }
            },
            "required": ["Code", "Description"]
          },
          "AddressKeyFormat": {
            "type": "object",
            "properties": {
              "AddressLine": {
                "type": "array",
                "items": { "type": "string" }
              },
              "CountryCode": { "type": "string" },
              "PoliticalDivision1": { "type": "string" },
              "PoliticalDivision2": { "type": "string" },
              "PostcodeExtendedLow": { "type": "string" },
              "PostcodePrimaryLow": { "type": "string" },
              "Region": { "type": "string" }
            },
            "required": ["CountryCode"]
          }
        },
        "required": ["AddressKeyFormat"]
      }
    },
    "responseStatus": {
      "type": "object",
      "properties": {
        "Code": { "type": "string" },
        "Description": { "type": "string" }
      },
      "required": ["Code", "Description"]
    }
  },
  "required": ["responseStatus"]
}
```

**Key Features**:
- **Address Candidates**: Array of validated address suggestions
- **Address Classification**: Type and description of address classification
- **Address Format**: Standardized address format with all components
- **Response Status**: Operation status with code and description
- **Complex Structure**: Most complex schema with nested objects and arrays

**Usage**: Used by the `upsAddressValidation` service for UPS address validation.

**GraphQL Integration**:
- **Service**: `upsAddressValidation`
- **Field**: `upsAddressValidation`
- **Type**: Mutation
- **Path**: `/validate-address`

## Common Patterns and Best Practices

### 1. **Schema Structure Patterns**

**Standard Response Pattern**:
```json
{
  "type": "object",
  "properties": {
    "message": { "type": "string" },
    "success": { "type": "boolean" }
  },
  "required": ["message", "success"]
}
```

**Data-Only Response Pattern**:
```json
{
  "type": "object",
  "properties": {
    "data": { "type": "object" }
  },
  "required": ["data"]
}
```

**Simple Field Response Pattern**:
```json
{
  "type": "object",
  "properties": {
    "field": { "type": "string" }
  },
  "required": ["field"]
}
```

### 2. **Validation Rules**

**Required Fields**: Always specify required fields for critical data
**Type Safety**: Use appropriate data types (string, number, boolean, object, array)
**Nested Validation**: Validate nested objects and arrays
**Array Validation**: Specify item types for array validation

### 3. **Error Handling**

**Consistent Error Format**: Use standard error response structure
**Status Codes**: Include appropriate HTTP status codes
**Error Messages**: Provide meaningful error messages
**Validation Errors**: Return specific validation error details

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

### 3. **GraphQL Type Generation**

**Automatic Type Generation**: API Mesh automatically generates GraphQL types from JSON schemas
**Type Safety**: Ensures GraphQL types match JSON schema definitions
**Validation**: Validates responses against schema definitions
**Documentation**: Generates GraphQL documentation from schema descriptions

## Performance and Optimization

### 1. **Schema Validation**

**Runtime Validation**: Validates responses at runtime
**Performance Impact**: Minimal performance overhead
**Error Detection**: Catches data structure errors early
**Type Safety**: Ensures consistent data types

### 2. **Caching Strategy**

**Response Caching**: Cache validated responses
**Schema Caching**: Cache schema definitions
**Validation Caching**: Cache validation results
**Performance Optimization**: Reduce validation overhead

### 3. **Error Handling**

**Validation Errors**: Handle schema validation failures
**Type Mismatches**: Handle data type mismatches
**Missing Fields**: Handle missing required fields
**Invalid Data**: Handle malformed data structures

## Security Considerations

### 1. **Data Validation**

**Input Sanitization**: Validate and sanitize all input data
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

This documentation provides comprehensive coverage of the response schema files and their role in the Adobe Brand Store App Builder API Mesh configuration. 
