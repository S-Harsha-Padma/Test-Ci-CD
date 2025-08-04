# Input Validation Patterns

## Overview

This document covers input validation patterns and best practices used in the request schemas of the Adobe Brand Store App Builder. It explains how to implement effective validation strategies, handle different data types, and ensure data integrity across the GraphQL interface.

## Validation Patterns

### 1. **Type Validation**

**String Validation**:
```json
{
  "type": "string",
  "minLength": 1,
  "maxLength": 255
}
```

**Number Validation**:
```json
{
  "type": "number",
  "minimum": 0,
  "maximum": 999999
}
```

**Boolean Validation**:
```json
{
  "type": "boolean"
}
```

**Array Validation**:
```json
{
  "type": "array",
  "items": {
    "type": "string"
  },
  "minItems": 1,
  "maxItems": 10
}
```

### 2. **Format Validation**

**Email Format**:
```json
{
  "type": "string",
  "format": "email"
}
```

**URL Format**:
```json
{
  "type": "string",
  "format": "uri"
}
```

**Date Format**:
```json
{
  "type": "string",
  "format": "date"
}
```

**DateTime Format**:
```json
{
  "type": "string",
  "format": "date-time"
}
```

### 3. **Pattern Validation**

**SKU Pattern**:
```json
{
  "type": "string",
  "pattern": "^[A-Z0-9-_]+$",
  "minLength": 3,
  "maxLength": 50
}
```

**Postal Code Pattern**:
```json
{
  "type": "string",
  "pattern": "^[0-9]{5}(-[0-9]{4})?$"
}
```

**Phone Number Pattern**:
```json
{
  "type": "string",
  "pattern": "^\\+?[1-9]\\d{1,14}$"
}
```

## Schema-Specific Validation

### 1. **SSO Authentication Validation**

**Schema**: `sso-request-schema.json`
```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "auth": {
          "type": "string",
          "minLength": 1
        }
      },
      "required": ["auth"]
    }
  },
  "required": ["data"]
}
```

**Validation Features**:
- **Nested Object Validation**: Validates nested data structure
- **Required Field Validation**: Ensures auth token is provided
- **String Validation**: Validates auth token as non-empty string

**Common Issues**:
- Missing `data` object
- Missing `auth` field within data
- Empty auth token

### 2. **Address Validation**

**Schema**: `add-req-schema.json`
```json
{
  "type": "object",
  "properties": {
    "address": {
      "type": "object",
      "properties": {
        "firstname": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "lastname": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "company": {
          "type": "string",
          "maxLength": 200
        },
        "street_line": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 100
          },
          "minItems": 1,
          "maxItems": 3
        },
        "postcode": {
          "type": "string",
          "minLength": 3,
          "maxLength": 20
        },
        "city": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "region_code": {
          "type": "string",
          "minLength": 2,
          "maxLength": 10
        },
        "country_code": {
          "type": "string",
          "minLength": 2,
          "maxLength": 3
        }
      },
      "required": ["firstname", "lastname", "street_line", "postcode", "city", "region_code", "country_code"]
    }
  },
  "required": ["address"]
}
```

**Validation Features**:
- **Length Validation**: Appropriate length limits for each field
- **Array Validation**: Street lines as array with item validation
- **Required Fields**: All essential address components mandatory
- **Optional Fields**: Company field is optional

**Common Issues**:
- Missing required address fields
- Invalid field lengths
- Empty street line arrays
- Invalid country/region codes

### 3. **Contact Form Validation**

**Schema**: `contactus-req-schema.json`
```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "firstname": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "lastname": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100
        },
        "email": {
          "type": "string",
          "format": "email",
          "maxLength": 255
        },
        "message": {
          "type": "string",
          "minLength": 10,
          "maxLength": 2000
        }
      },
      "required": ["firstname", "lastname", "email", "message"]
    }
  },
  "required": ["data"]
}
```

**Validation Features**:
- **Email Format Validation**: Ensures valid email format
- **Message Length Validation**: Minimum and maximum message length
- **Required Fields**: All contact information mandatory
- **Length Limits**: Appropriate limits for each field

**Common Issues**:
- Invalid email format
- Message too short or too long
- Missing required fields
- Field length violations

### 4. **Customer Group Validation**

**Schema**: `cust-req-schema.json`
```json
{
  "type": "object",
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "maxLength": 255
    }
  },
  "required": ["email"]
}
```

**Validation Features**:
- **Email Format Validation**: Ensures valid email format
- **Single Field Validation**: Simple, focused validation
- **Required Field**: Email is mandatory

**Common Issues**:
- Invalid email format
- Missing email field
- Email too long

### 5. **Customer Group Lookup Validation**

**Schema**: `get-customer-group.json`
```json
{
  "type": "object",
  "properties": {
    "customer": {
      "type": "object",
      "properties": {
        "uid": {
          "type": "string",
          "minLength": 1,
          "maxLength": 50
        }
      },
      "required": ["uid"]
    }
  },
  "required": ["customer"]
}
```

**Validation Features**:
- **UID Validation**: Customer unique identifier validation
- **Nested Object Validation**: Customer object structure
- **Length Limits**: Appropriate UID length limits

**Common Issues**:
- Missing customer object
- Missing or empty UID
- UID too long

### 6. **Product Stock Validation**

**Schema**: `pro-stock-req-schema.json`
```json
{
  "type": "object",
  "properties": {
    "sku": {
      "type": "string",
      "minLength": 1,
      "maxLength": 50
    }
  },
  "required": ["sku"]
}
```

**Validation Features**:
- **SKU Validation**: Product SKU validation
- **Simple Structure**: Single field validation
- **Length Limits**: Appropriate SKU length limits

**Common Issues**:
- Missing SKU
- Empty SKU
- SKU too long

## Error Handling Patterns

### 1. **Validation Error Response**

**Standard Error Format**:
```json
{
  "errors": [
    {
      "message": "Validation failed",
      "extensions": {
        "code": "VALIDATION_ERROR",
        "validationErrors": [
          {
            "path": "data.email",
            "message": "Invalid email format"
          },
          {
            "path": "data.message",
            "message": "Message must be at least 10 characters long"
          }
        ]
      }
    }
  ]
}
```

**Field-Specific Errors**:
```json
{
  "errors": [
    {
      "message": "Field validation failed",
      "extensions": {
        "field": "email",
        "code": "INVALID_EMAIL_FORMAT"
      }
    }
  ]
}
```

### 2. **Error Categories**

**Missing Required Fields**:
```json
{
  "code": "MISSING_REQUIRED_FIELD",
  "field": "email",
  "message": "Email is required"
}
```

**Invalid Data Types**:
```json
{
  "code": "INVALID_DATA_TYPE",
  "field": "age",
  "expected": "number",
  "received": "string"
}
```

**Format Validation Errors**:
```json
{
  "code": "INVALID_FORMAT",
  "field": "email",
  "format": "email",
  "message": "Invalid email format"
}
```

**Length Validation Errors**:
```json
{
  "code": "LENGTH_VIOLATION",
  "field": "message",
  "minLength": 10,
  "maxLength": 2000,
  "actualLength": 5
}
```

## Best Practices

### 1. **Schema Design**

**Consistent Naming**:
- Use consistent field naming conventions
- Follow camelCase or snake_case consistently
- Use descriptive field names

**Appropriate Types**:
- Use the most specific type for each field
- Avoid using `string` for numeric data
- Use arrays for multiple values

**Required Fields**:
- Only mark truly required fields as required
- Consider optional fields for flexibility
- Document field requirements clearly

### 2. **Validation Rules**

**Length Limits**:
- Set appropriate minimum and maximum lengths
- Consider database field constraints
- Balance security with usability

**Format Validation**:
- Use built-in formats when available
- Create custom patterns for specific requirements
- Validate formats that matter for business logic

**Content Validation**:
- Validate content that affects business operations
- Consider security implications of validation
- Balance validation with performance

### 3. **Error Handling**

**Clear Error Messages**:
- Provide meaningful error messages
- Include field names in error messages
- Explain what went wrong and how to fix it

**Consistent Error Format**:
- Use consistent error response structure
- Include error codes for programmatic handling
- Provide field-specific error details

**Graceful Degradation**:
- Handle validation failures gracefully
- Provide fallback values where appropriate
- Don't break the entire request on validation failure

## Performance Considerations

### 1. **Validation Performance**

**Schema Caching**:
- Cache compiled schemas for performance
- Avoid recompiling schemas on each request
- Use schema versioning for updates

**Validation Optimization**:
- Validate only what's necessary
- Use efficient validation algorithms
- Consider validation order for early failure

**Error Caching**:
- Cache common validation errors
- Avoid regenerating error messages
- Use error codes for efficiency

### 2. **Memory Management**

**Schema Size**:
- Keep schemas as small as possible
- Avoid unnecessary nesting
- Use references for shared schemas

**Validation Memory**:
- Clean up validation objects
- Avoid memory leaks in validation
- Monitor memory usage

### 3. **Scalability**

**Validation Scaling**:
- Design validation to scale with load
- Use efficient validation algorithms
- Consider validation caching strategies

**Error Handling Scaling**:
- Design error handling to scale
- Use efficient error response generation
- Consider error aggregation

## Security Considerations

### 1. **Input Sanitization**

**Data Cleaning**:
- Sanitize input data before validation
- Remove potentially dangerous characters
- Normalize data formats

**Size Limits**:
- Enforce reasonable size limits
- Prevent denial of service attacks
- Limit resource consumption

**Content Validation**:
- Validate content for malicious patterns
- Check for injection attacks
- Validate file uploads

### 2. **Error Information**

**Information Disclosure**:
- Avoid exposing sensitive information in errors
- Limit debug information in production
- Use generic error messages for security

**Error Logging**:
- Log validation errors for debugging
- Don't log sensitive data
- Use appropriate log levels

### 3. **Schema Security**

**Schema Validation**:
- Validate schema files themselves
- Check for schema injection attacks
- Use schema versioning for security

**Access Control**:
- Control access to schema definitions
- Validate schema access permissions
- Use schema encryption where appropriate

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

### 2. **Validation Testing**

**Valid Data**:
- Test with valid data structures
- Verify successful validation
- Test edge cases and boundaries

**Invalid Data**:
- Test with invalid data structures
- Verify error handling
- Test missing required fields

### 3. **Performance Testing**

**Validation Performance**:
- Test schema validation performance
- Measure impact on response times
- Test scalability under load

**Error Handling Performance**:
- Test error response generation
- Measure error handling overhead
- Test error aggregation performance

This documentation provides comprehensive coverage of input validation patterns and best practices for the Adobe Brand Store App Builder request schemas. 
