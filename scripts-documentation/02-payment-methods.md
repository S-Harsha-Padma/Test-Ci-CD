# Payment Method Configuration Scripts

## Overview

This document covers the payment method configuration scripts that handle OOPE (Order on Payment Entry) payment method setup and management in Adobe Commerce.

## Script Files

### `create-payment-methods.js` - Payment Method Setup

**Purpose**: Creates OOPE (Order on Payment Entry) payment methods in Adobe Commerce based on configuration files.

**Key Features**:
- **Payment Method Creation**: Creates payment methods from YAML configuration
- **OOPE Integration**: Specifically handles OOPE payment method setup
- **Batch Processing**: Processes multiple payment methods from configuration
- **Error Handling**: Reports success/failure for each payment method

**Workflow**:
1. **Configuration Reading**: Reads payment method specifications from YAML file
2. **Commerce Client Setup**: Initializes Adobe Commerce client
3. **Payment Method Creation**: Creates each payment method via Commerce API
4. **Result Reporting**: Reports success/failure for each method

**Key Functions**:
```javascript
// Main payment method creation function
async function main(configFilePath)
```

**Configuration Dependencies**:
- `payment-methods.yaml`: Payment method specifications
- Adobe Commerce client configuration

**Usage**:
```bash
# Create payment methods from configuration
node scripts/create-payment-methods.js payment-methods.yaml
```

## Configuration Files

### `payment-methods.yaml` - Payment Method Configuration

**Purpose**: Defines payment methods for Adobe Commerce integration.

**Structure**:
```yaml
methods:
  - payment_method:
      code: authorizenet
      title: Credit Card (Authorize.net)
      active: true
      backend_url: https://your-runtime-url/actions/commerce/webhook/payment/validate
      supported_stores:
        - default
      order_status: processing
      currencies:
        - USD
      custom_config:
        can_refund: true
```

**Key Components**:
- **Payment Method Code**: Unique identifier for the payment method
- **Title**: Display name for the payment method
- **Backend URL**: URL for payment validation webhook
- **Store Support**: Which stores support this payment method
- **Order Status**: Default order status for this payment method
- **Currency Support**: Supported currencies
- **Custom Configuration**: Method-specific configuration

## Common Patterns and Best Practices

### 1. **Commerce Integration**
- **Client Setup**: Use `getAdobeCommerceClient()` for Commerce API access
- **Batch Operations**: Process multiple items efficiently
- **Error Reporting**: Report individual item success/failure
- **Configuration Validation**: Validate Commerce configuration before operations

### 2. **Payment Method Management**
- **Configuration Validation**: Validate payment method configuration before creation
- **Error Handling**: Provide clear error messages for payment method issues
- **Status Tracking**: Track creation status for each payment method
- **Rollback Support**: Support for removing failed payment methods

### 3. **OOPE Integration**
- **Webhook Integration**: Ensure payment validation webhooks are properly configured
- **Backend URL Management**: Manage backend URLs for payment processing
- **Method Compatibility**: Ensure payment methods are compatible with OOPE
- **Testing Support**: Support for testing payment method configurations

## Error Handling and Troubleshooting

### Common Issues

1. **Configuration File Not Found**
   - **Cause**: Missing or incorrectly named configuration files
   - **Solution**: Ensure configuration files exist and are properly named
   - **Reference**: Check file paths in script parameters

2. **Commerce API Failures**
   - **Cause**: Invalid Commerce configuration or API access
   - **Solution**: Verify Commerce base URL and authentication
   - **Reference**: Check Commerce instance configuration

3. **Payment Method Creation Failures**
   - **Cause**: Invalid payment method configuration or conflicts
   - **Solution**: Validate payment method configuration and check for duplicates
   - **Reference**: Check Commerce admin for existing payment methods

4. **OOPE Integration Issues**
   - **Cause**: Invalid backend URL or webhook configuration
   - **Solution**: Verify backend URL and webhook endpoint configuration
   - **Reference**: Check Adobe I/O Runtime action configuration

### Debugging Tips

- **Enable Debug Logging**: Set `LOG_LEVEL=debug` for detailed logging
- **Check Configuration**: Verify all required configuration files exist
- **Validate Credentials**: Ensure all authentication credentials are correct
- **Test Individual Scripts**: Run scripts individually to isolate issues
- **Check Commerce Admin**: Verify payment methods in Commerce admin panel

## Security Considerations

### 1. **Credential Management**
- Use environment variables for sensitive data
- Never hardcode credentials in scripts
- Use secure credential resolution methods

### 2. **Configuration Security**
- Validate all configuration inputs
- Sanitize file paths and URLs
- Implement proper access controls

### 3. **Payment Security**
- Use HTTPS for all payment-related communications
- Implement proper authentication for payment APIs
- Validate payment method configurations

## Testing and Validation

### 1. **Configuration Testing**
- Test configuration file parsing
- Validate configuration structure
- Test error handling scenarios

### 2. **Integration Testing**
- Test Commerce API integration
- Test payment method creation workflows
- Test end-to-end payment processing

### 3. **Error Scenario Testing**
- Test missing configuration files
- Test invalid credentials
- Test API failures

## Performance and Optimization

### 1. **Batch Processing**
- Process multiple payment methods efficiently
- Use Promise.all() for parallel processing
- Implement proper error handling for batch operations

### 2. **Resource Management**
- Close connections properly
- Handle memory efficiently
- Implement proper cleanup procedures

## Future Enhancements

### 1. **Configuration Management**
- Implement configuration validation schemas
- Add configuration migration tools
- Implement configuration versioning

### 2. **Automation**
- Add automated payment method deployment
- Implement payment method rollback capabilities
- Add payment method monitoring and alerting

### 3. **Integration**
- Add support for additional payment gateways
- Implement payment method templates
- Add support for dynamic payment method configuration 
