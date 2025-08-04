# Request-Response Schema Mapping

## Overview

This document covers the relationship between request and response schemas in the Adobe Brand Store App Builder. It explains how these schemas work together to provide type safety, validation, and consistent API contracts across the GraphQL interface.

## Schema Pairs

### 1. **SSO Authentication**

**Request Schema**: `requestSchema/sso-request-schema.json`
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

**Response Schema**: `responseSchema/sso-response-schema.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SSO Response Schema",
  "type": "object",
  "properties": {
    "message": {
      "type": "object",
      "properties": {
        "token": { "type": "string" },
        "username": { "type": "string" }
      },
      "required": ["token", "username"]
    },
    "success": { "type": "boolean" }
  },
  "required": ["message", "success"]
}
```

**API Mesh Configuration**:
```json
{
  "name": "ssov2",
  "handler": {
    "JsonSchema": {
      "baseUrl": "https://runtime-url/api/v1/web/account",
      "operations": [
        {
          "type": "Mutation",
          "field": "ssov2",
          "path": "/consumer",
          "method": "POST",
          "requestSchema": "./requestSchema/sso-request-schema.json",
          "responseSchema": "./responseSchema/sso-response-schema.json"
        }
      ]
    }
  }
}
```

**GraphQL Usage**:
```graphql
mutation SSOAuthentication($data: SSOInput!) {
  ssov2(data: $data) {
    message {
      token
      username
    }
    success
  }
}
```

### 2. **Customer Group Management**

**Request Schema**: `requestSchema/cust-req-schema.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Customer Group Request Schema",
  "type": "object",
  "properties": {
    "customer_group": {
      "type": "string"
    }
  },
  "required": ["customer_group"]
}
```

**Response Schema**: `responseSchema/cust-res-schema.json`
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

**API Mesh Configuration**:
```json
{
  "name": "customerGroup",
  "handler": {
    "JsonSchema": {
      "baseUrl": "https://runtime-url/api/v1/web/customer",
      "operations": [
        {
          "type": "Mutation",
          "field": "customerGroup",
          "path": "/group",
          "method": "POST",
          "requestSchema": "./requestSchema/cust-req-schema.json",
          "responseSchema": "./responseSchema/cust-res-schema.json"
        }
      ]
    }
  }
}
```

### 3. **Customer Group Name Retrieval**

**Request Schema**: `requestSchema/get-customer-group.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Get Customer Group Request Schema",
  "type": "object",
  "properties": {
    "customer_id": {
      "type": "string"
    }
  },
  "required": ["customer_id"]
}
```

**Response Schema**: `responseSchema/get-customer-group.json`
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

**API Mesh Configuration**:
```json
{
  "operations": [
    {
      "type": "Mutation",
      "field": "customerGroupName",
      "path": "/get-group-name",
      "method": "POST",
      "requestSchema": "./requestSchema/get-customer-group.json",
      "responseSchema": "./responseSchema/get-customer-group.json"
    }
  ]
}
```

### 4. **Contact Us Form**

**Request Schema**: `requestSchema/contactus-req-schema.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Contact Us Request Schema",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "email": { "type": "string" },
    "message": { "type": "string" },
    "subject": { "type": "string" }
  },
  "required": ["name", "email", "message"]
}
```

**Response Schema**: `responseSchema/contactus-res-schema.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Contact Us Response Schema",
  "type": "object",
  "properties": {
    "message": { "type": "string" },
    "success": { "type": "boolean" }
  },
  "required": ["message", "success"]
}
```

**API Mesh Configuration**:
```json
{
  "name": "contactUs",
  "handler": {
    "JsonSchema": {
      "baseUrl": "https://runtime-url/api/v1/web/customer",
      "operations": [
        {
          "type": "Mutation",
          "field": "contactUs",
          "path": "/contact-us",
          "method": "POST",
          "requestSchema": "./requestSchema/contactus-req-schema.json",
          "responseSchema": "./responseSchema/contactus-res-schema.json"
        }
      ]
    }
  }
}
```

### 5. **Address Validation**

**Request Schema**: `requestSchema/add-req-schema.json`
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Address Validation Request Schema",
  "type": "object",
  "properties": {
    "AddressLine": {
      "type": "array",
      "items": { "type": "string" }
    },
    "City": { "type": "string" },
    "StateProvinceCode": { "type": "string" },
    "PostalCode": { "type": "string" },
    "CountryCode": { "type": "string" }
  },
  "required": ["AddressLine", "City", "StateProvinceCode", "PostalCode", "CountryCode"]
}
```

**Response Schema**: `responseSchema/add-res-schema.json`
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

**API Mesh Configuration**:
```json
{
  "name": "upsAddressValidation",
  "handler": {
    "JsonSchema": {
      "baseUrl": "https://runtime-url/api/v1/web/ups",
      "operations": [
        {
          "type": "Mutation",
          "field": "upsAddressValidation",
          "path": "/validate-address",
          "method": "POST",
          "requestSchema": "./requestSchema/add-req-schema.json",
          "responseSchema": "./responseSchema/add-res-schema.json"
        }
      ]
    }
  }
}
```

### 6. **Product Stock Information**

**Request Schema**: `requestSchema/pro-stock-req-schema.json`
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

**Response Schema**: `responseSchema/pro-stock-res-schema.json`
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

**API Mesh Configuration**:
```json
{
  "name": "productStock",
  "handler": {
    "JsonSchema": {
      "baseUrl": "https://runtime-url/api/v1/web/product",
      "operations": [
        {
          "type": "Query",
          "field": "productStock",
          "path": "/stock?sku={args.sku}&product_type={args.product_type}&child_sku={args.child_sku}",
          "method": "GET",
          "argTypeMap": {
            "sku": { "type": "string" },
            "product_type": { "type": "string" },
            "child_sku": {
              "type": "array",
              "items": { "type": "string" }
            }
          }
        }
      ]
    }
  }
}
```

## Common Patterns

### 1. **Request-Response Patterns**

**Simple Field Pattern**:
- **Request**: Single field input
- **Response**: Single field output
- **Example**: Product stock queries

**Object Pattern**:
- **Request**: Object with multiple fields
- **Response**: Object with multiple fields
- **Example**: Customer group operations

**Nested Object Pattern**:
- **Request**: Nested object structure
- **Response**: Nested object structure
- **Example**: SSO authentication

**Array Pattern**:
- **Request**: Array of objects
- **Response**: Array of objects
- **Example**: Address validation

### 2. **Validation Patterns**

**Required Fields**:
- Always specify required fields for critical data
- Use `required` array to enforce mandatory fields
- Provide clear error messages for missing fields

**Type Validation**:
- Use appropriate data types (string, number, boolean, object, array)
- Validate nested objects and arrays
- Ensure type consistency between request and response

**Content Validation**:
- Validate email formats for email fields
- Validate URL formats for URL fields
- Validate numeric ranges for numeric fields

### 3. **Error Handling Patterns**

**Standard Error Response**:
```json
{
  "message": "Error description",
  "success": false,
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error"
    }
  ]
}
```

**Validation Error Response**:
```json
{
  "message": "Validation failed",
  "success": false,
  "validationErrors": [
    {
      "path": "field.path",
      "message": "Validation error message"
    }
  ]
}
```

## API Mesh Integration

### 1. **Schema Loading**

**File Resolution**:
- API Mesh loads schemas from relative paths
- Schemas are validated at startup
- Invalid schemas cause configuration errors

**Schema Caching**:
- Schemas are cached for performance
- Changes require API Mesh restart
- Schema validation happens at runtime

### 2. **GraphQL Type Generation**

**Automatic Generation**:
- API Mesh generates GraphQL types from JSON schemas
- Input types are generated from request schemas
- Output types are generated from response schemas

**Type Mapping**:
- JSON Schema types map to GraphQL types
- Complex objects become GraphQL object types
- Arrays become GraphQL list types

### 3. **Validation Integration**

**Request Validation**:
- Incoming requests are validated against request schemas
- Invalid requests are rejected with error messages
- Validation errors are returned to clients

**Response Validation**:
- Outgoing responses are validated against response schemas
- Invalid responses are logged and handled
- Validation ensures data consistency

## Best Practices

### 1. **Schema Design**

**Consistency**:
- Use consistent naming conventions
- Follow standard JSON Schema patterns
- Maintain backward compatibility

**Documentation**:
- Add descriptive titles and descriptions
- Document field purposes and constraints
- Provide usage examples

**Validation**:
- Use appropriate validation rules
- Validate data types and formats
- Enforce business rules through schemas

### 2. **Error Handling**

**Clear Messages**:
- Provide meaningful error messages
- Include field-specific error details
- Use consistent error formats

**Graceful Degradation**:
- Handle validation failures gracefully
- Provide fallback values where appropriate
- Log errors for debugging

### 3. **Performance**

**Schema Optimization**:
- Keep schemas as simple as possible
- Avoid unnecessary nesting
- Use appropriate data types

**Caching Strategy**:
- Cache validated schemas
- Cache validation results
- Optimize schema loading

## Testing and Validation

### 1. **Schema Testing**

**Unit Tests**:
- Test individual schema definitions
- Validate schema syntax and structure
- Test schema validation logic

**Integration Tests**:
- Test schema integration with API Mesh
- Validate request-response cycles
- Test error handling scenarios

### 2. **Data Validation**

**Valid Data**:
- Test with valid data structures
- Verify successful validation
- Test edge cases and boundaries

**Invalid Data**:
- Test with invalid data structures
- Verify error handling
- Test missing required fields

### 3. **End-to-End Testing**

**Complete Workflows**:
- Test complete request-response cycles
- Validate GraphQL query execution
- Test error propagation

**Performance Testing**:
- Test schema validation performance
- Measure impact on response times
- Test scalability under load

This documentation provides comprehensive coverage of request-response schema mapping and their role in the Adobe Brand Store App Builder API Mesh configuration. 
