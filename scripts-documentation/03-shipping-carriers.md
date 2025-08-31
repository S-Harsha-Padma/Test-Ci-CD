# Shipping Carrier Configuration Scripts

## Overview

This document covers the shipping carrier configuration scripts that handle OOPE (Order on Payment Entry) shipping carrier setup, creation, and management in Adobe Commerce.

## Script Files

### 1. `create-shipping-carriers.js` - Shipping Carrier Setup

**Purpose**: Creates shipping carriers in Adobe Commerce based on configuration files.

**Key Features**:
- **Carrier Creation**: Creates shipping carriers from YAML configuration
- **OOPE Integration**: Specifically handles OOPE shipping carrier setup
- **Batch Processing**: Processes multiple carriers from configuration
- **Error Handling**: Reports success/failure for each carrier

**Workflow**:
1. **Configuration Reading**: Reads shipping carrier specifications from YAML file
2. **Commerce Client Setup**: Initializes Adobe Commerce client
3. **Carrier Creation**: Creates each shipping carrier via Commerce API
4. **Result Reporting**: Reports success/failure for each carrier

**Key Functions**:
```javascript
// Main shipping carrier creation function
async function main(configFilePath)
```

**Configuration Dependencies**:
- `shipping-carriers.yaml`: Shipping carrier specifications
- Adobe Commerce client configuration

**Usage**:
```bash
# Create shipping carriers from configuration
node scripts/create-shipping-carriers.js shipping-carriers.yaml
```

### 2. `get-shipping-carriers.js` - Shipping Carrier Retrieval

**Purpose**: Retrieves and displays all configured shipping carriers from Adobe Commerce.

**Key Features**:
- **Carrier Retrieval**: Fetches all shipping carriers from Commerce
- **Data Display**: Formats and displays carrier information
- **Error Handling**: Reports failures in carrier retrieval
- **Debugging Support**: Useful for verifying carrier configuration

**Workflow**:
1. **Commerce Client Setup**: Initializes Adobe Commerce client
2. **Carrier Retrieval**: Fetches all shipping carriers via Commerce API
3. **Data Formatting**: Formats carrier data for display
4. **Result Reporting**: Reports success/failure and displays carriers

**Key Functions**:
```javascript
// Main shipping carrier retrieval function
async function main()
```

**Usage**:
```bash
# Retrieve and display all shipping carriers
node scripts/get-shipping-carriers.js
```

## Configuration Files

### `shipping-carriers.yaml` - Shipping Carrier Configuration

**Purpose**: Defines shipping carriers for Adobe Commerce integration.

**Structure**:
```yaml
shipping_carriers:
  - carrier:
      code: UPS
      title: United Parcel Service
      active: true
      sort_order: 10
      supported_stores:
        - default
      supported_countries:
        - US
        - CA
      tracking_available: true
      shipping_label_available: true
```

**Key Components**:
- **Carrier Code**: Unique identifier for the shipping carrier
- **Title**: Display name for the shipping carrier
- **Store Support**: Which stores support this carrier
- **Country Support**: Which countries this carrier operates in
- **Features**: Tracking and shipping label availability
- **Sort Order**: Display order in Commerce admin

## Common Patterns and Best Practices

### 1. **Commerce Integration**
- **Client Setup**: Use `getAdobeCommerceClient()` for Commerce API access
- **Batch Operations**: Process multiple items efficiently
- **Error Reporting**: Report individual item success/failure
- **Configuration Validation**: Validate Commerce configuration before operations

### 2. **Shipping Carrier Management**
- **Configuration Validation**: Validate carrier configuration before creation
- **Error Handling**: Provide clear error messages for carrier issues
- **Status Tracking**: Track creation status for each carrier
- **Rollback Support**: Support for removing failed carriers

### 3. **OOPE Integration**
- **Carrier Compatibility**: Ensure carriers are compatible with OOPE
- **Rate Calculation**: Support for carrier-specific rate calculation
- **Tracking Integration**: Support for carrier tracking capabilities
- **Label Generation**: Support for shipping label generation

### 4. **Data Management**
- **Carrier Retrieval**: Efficient retrieval and display of carrier data
- **Data Formatting**: Proper formatting of carrier information
- **Error Reporting**: Clear error reporting for retrieval failures
- **Debugging Support**: Support for debugging carrier configurations

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

3. **Carrier Creation Failures**
   - **Cause**: Invalid carrier configuration or conflicts
   - **Solution**: Validate carrier configuration and check for duplicates
   - **Reference**: Check Commerce admin for existing carriers

4. **OOPE Integration Issues**
   - **Cause**: Invalid carrier configuration for OOPE
   - **Solution**: Verify carrier configuration for OOPE compatibility
   - **Reference**: Check OOPE documentation for carrier requirements

5. **Carrier Retrieval Failures**
   - **Cause**: API access issues or invalid configuration
   - **Solution**: Verify Commerce API access and configuration
   - **Reference**: Check Commerce API documentation

### Debugging Tips

- **Enable Debug Logging**: Set `LOG_LEVEL=debug` for detailed logging
- **Check Configuration**: Verify all required configuration files exist
- **Validate Credentials**: Ensure all authentication credentials are correct
- **Test Individual Scripts**: Run scripts individually to isolate issues
- **Check Commerce Admin**: Verify carriers in Commerce admin panel
- **Use Retrieval Script**: Use `get-shipping-carriers.js` to verify carrier configuration

## Security Considerations

### 1. **Credential Management**
- Use environment variables for sensitive data
- Never hardcode credentials in scripts
- Use secure credential resolution methods

### 2. **Configuration Security**
- Validate all configuration inputs
- Sanitize file paths and URLs
- Implement proper access controls

### 3. **Shipping Security**
- Use HTTPS for all shipping-related communications
- Implement proper authentication for shipping APIs
- Validate carrier configurations

## Testing and Validation

### 1. **Configuration Testing**
- Test configuration file parsing
- Validate configuration structure
- Test error handling scenarios

### 2. **Integration Testing**
- Test Commerce API integration
- Test carrier creation workflows
- Test carrier retrieval functionality
- Test end-to-end shipping workflows

### 3. **Error Scenario Testing**
- Test missing configuration files
- Test invalid credentials
- Test API failures
- Test carrier conflicts

## Performance and Optimization

### 1. **Batch Processing**
- Process multiple carriers efficiently
- Use Promise.all() for parallel processing
- Implement proper error handling for batch operations

### 2. **Data Retrieval**
- Optimize carrier data retrieval
- Implement efficient data formatting
- Use appropriate data structures

### 3. **Resource Management**
- Close connections properly
- Handle memory efficiently
- Implement proper cleanup procedures

## Future Enhancements

### 1. **Configuration Management**
- Implement configuration validation schemas
- Add configuration migration tools
- Implement configuration versioning

### 2. **Automation**
- Add automated carrier deployment
- Implement carrier rollback capabilities
- Add carrier monitoring and alerting

### 3. **Integration**
- Add support for additional shipping carriers
- Implement carrier templates
- Add support for dynamic carrier configuration
- Implement carrier rate calculation integration

### 4. **Data Management**
- Add carrier data export capabilities
- Implement carrier data backup and restore
- Add carrier data validation tools 
