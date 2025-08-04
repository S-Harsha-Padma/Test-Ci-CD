# Configuration Management

## Overview

This document covers general configuration management patterns, best practices, and common utilities used across all scripts in the Adobe Brand Store App Builder.

## Configuration Management Patterns

### 1. **Environment Variable Management**
- **Sensitive Data**: Use environment variables for all sensitive configuration
- **Validation**: Always validate required environment variables
- **Fallbacks**: Provide sensible defaults where appropriate
- **Documentation**: Document all required environment variables

**Example Pattern**:
```javascript
const requiredEnvVars = [
  'SERVICE_API_KEY',
  'COMMERCE_BASE_URL',
  'AIO_runtime_namespace'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
```

### 2. **YAML Configuration Files**
- **Structured Configuration**: Use YAML for complex configuration structures
- **Validation**: Validate configuration file structure and content
- **Error Handling**: Provide clear error messages for configuration issues
- **Documentation**: Document all configuration file formats

**Example Pattern**:
```javascript
const yaml = require('js-yaml');
const fs = require('fs');

function loadConfiguration(filePath) {
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return yaml.load(fileContents);
  } catch (error) {
    throw new Error(`Failed to load configuration from ${filePath}: ${error.message}`);
  }
}
```

### 3. **Configuration Validation**
- **Schema Validation**: Validate configuration against schemas
- **Type Checking**: Ensure configuration values are of expected types
- **Range Validation**: Validate numeric values within expected ranges
- **Required Fields**: Ensure all required fields are present

**Example Pattern**:
```javascript
function validateConfiguration(config) {
  const errors = [];
  
  if (!config.methods || !Array.isArray(config.methods)) {
    errors.push('Configuration must contain a methods array');
  }
  
  config.methods?.forEach((method, index) => {
    if (!method.payment_method?.code) {
      errors.push(`Method ${index} must have a payment_method.code`);
    }
  });
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}
```

## Common Utilities

### 1. **File Path Management**
- **Absolute Paths**: Convert relative paths to absolute paths
- **Path Validation**: Validate file paths exist and are accessible
- **Cross-Platform**: Ensure paths work across different operating systems

**Example Pattern**:
```javascript
const path = require('path');

function resolveFilePath(filePath) {
  const absolutePath = path.isAbsolute(filePath) 
    ? filePath 
    : path.join(process.env.INIT_CWD, filePath);
    
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  
  return absolutePath;
}
```

### 2. **Credential Resolution**
- **IMS Integration**: Use Adobe I/O SDK for credential resolution
- **Error Handling**: Handle credential resolution failures gracefully
- **Caching**: Cache resolved credentials where appropriate

**Example Pattern**:
```javascript
const { resolveCredentials } = require('../lib/adobe-auth');

async function getCredentials() {
  try {
    return await resolveCredentials(process.env);
  } catch (error) {
    throw new Error(`Failed to resolve credentials: ${error.message}`);
  }
}
```

### 3. **Logging and Error Reporting**
- **Structured Logging**: Use structured logging for better debugging
- **Error Context**: Include context information in error messages
- **Log Levels**: Use appropriate log levels for different types of information

**Example Pattern**:
```javascript
const { Core } = require('@adobe/aio-sdk');

const logger = Core.Logger('script-name', { 
  level: process.env.LOG_LEVEL || 'info' 
});

function logOperation(operation, details) {
  logger.info(`Starting ${operation}`, details);
  
  try {
    // Perform operation
    logger.info(`Completed ${operation} successfully`);
  } catch (error) {
    logger.error(`Failed to complete ${operation}`, error);
    throw error;
  }
}
```

## Error Handling Patterns

### 1. **Configuration Errors**
- **Missing Files**: Handle missing configuration files gracefully
- **Invalid Format**: Provide clear error messages for invalid configurations
- **Validation Errors**: Report all validation errors, not just the first one

**Example Pattern**:
```javascript
function handleConfigurationError(error, context) {
  if (error.code === 'ENOENT') {
    logger.warn(`Configuration file not found: ${context.filePath}`);
    return { success: false, message: 'Configuration file not found' };
  }
  
  if (error.name === 'YAMLException') {
    logger.error(`Invalid YAML in configuration file: ${error.message}`);
    return { success: false, message: 'Invalid configuration format' };
  }
  
  logger.error(`Configuration error: ${error.message}`);
  return { success: false, message: 'Configuration error occurred' };
}
```

### 2. **API Errors**
- **Network Errors**: Handle network connectivity issues
- **Authentication Errors**: Handle authentication and authorization failures
- **Rate Limiting**: Handle API rate limiting gracefully

**Example Pattern**:
```javascript
async function handleApiCall(apiCall, context) {
  try {
    return await apiCall();
  } catch (error) {
    if (error.response?.status === 401) {
      logger.error(`Authentication failed for ${context.operation}`);
      return { success: false, message: 'Authentication failed' };
    }
    
    if (error.response?.status === 429) {
      logger.warn(`Rate limited for ${context.operation}, retrying...`);
      await delay(1000);
      return await apiCall();
    }
    
    logger.error(`API error for ${context.operation}: ${error.message}`);
    return { success: false, message: 'API call failed' };
  }
}
```

## Security Best Practices

### 1. **Credential Security**
- **Environment Variables**: Never hardcode credentials in scripts
- **Secure Storage**: Use secure credential storage mechanisms
- **Rotation**: Support credential rotation and updates

### 2. **Input Validation**
- **Sanitization**: Sanitize all configuration inputs
- **Type Checking**: Validate input types and formats
- **Access Control**: Implement proper access controls for configuration

### 3. **Communication Security**
- **HTTPS**: Use HTTPS for all external communications
- **Certificate Validation**: Validate SSL certificates
- **Encryption**: Encrypt sensitive data in transit and at rest

## Performance Optimization

### 1. **Configuration Loading**
- **Caching**: Cache configuration data where appropriate
- **Lazy Loading**: Load configuration only when needed
- **Validation**: Validate configuration once and cache results

### 2. **Resource Management**
- **Connection Pooling**: Use connection pooling for API clients
- **Memory Management**: Handle memory efficiently
- **Cleanup**: Implement proper cleanup procedures

### 3. **Batch Operations**
- **Parallel Processing**: Use Promise.all() for parallel operations
- **Error Handling**: Handle errors in batch operations gracefully
- **Progress Reporting**: Report progress for long-running operations

## Testing and Validation

### 1. **Configuration Testing**
- **Unit Tests**: Test configuration loading and validation
- **Integration Tests**: Test configuration with actual services
- **Error Tests**: Test error handling scenarios

### 2. **Mock Configuration**
- **Test Data**: Use mock configuration for testing
- **Isolation**: Isolate tests from external dependencies
- **Validation**: Validate mock configuration structure

### 3. **End-to-End Testing**
- **Full Workflow**: Test complete configuration workflows
- **Error Scenarios**: Test error scenarios end-to-end
- **Performance**: Test configuration performance under load

## Future Enhancements

### 1. **Configuration Management**
- **Versioning**: Implement configuration versioning
- **Migration**: Add configuration migration tools
- **Validation**: Implement schema-based validation

### 2. **Automation**
- **Auto-Discovery**: Automatically discover configuration requirements
- **Validation**: Automatically validate configuration changes
- **Deployment**: Automate configuration deployment

### 3. **Monitoring**
- **Health Checks**: Implement configuration health checks
- **Alerting**: Add configuration monitoring and alerting
- **Metrics**: Collect configuration usage metrics 
