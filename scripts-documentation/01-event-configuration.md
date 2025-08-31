# Event Configuration Scripts

## Overview

This document covers the event configuration scripts that handle Adobe I/O Events provider and metadata management, as well as Commerce event integration.

## Script Files

### 1. `configure-events.js` - Adobe I/O Events Provider Configuration

**Purpose**: Configures Adobe I/O Events providers and metadata in the Adobe Developer Console, ensuring synchronization between the local configuration and the cloud environment.

**Key Features**:
- **Event Provider Management**: Creates, updates, and manages event providers in Adobe I/O Events
- **Metadata Synchronization**: Ensures event metadata is in sync with specifications
- **Environment Variable Updates**: Automatically updates `AIO_EVENTS_PROVIDERMETADATA_TO_PROVIDER_MAPPING` in `.env`
- **Namespace Labeling**: Appends runtime namespace to provider labels for uniqueness

**Workflow**:
1. **Configuration Validation**: Validates project configuration (org ID, project ID, workspace ID)
2. **Credential Resolution**: Resolves IMS credentials for Adobe I/O Events API access
3. **Provider Reconciliation**: Ensures event providers match the specification in `events.config.yaml`
4. **Metadata Management**: Creates or updates event metadata for each provider
5. **Environment Update**: Updates environment variables with provider mappings

**Key Functions**:
```javascript
// Main configuration function
async function main()

// Core event configuration logic
async function configureEvents(project, credentials, eventsSpec)

// Provider management
async function ensureEventProvider(spec)

// Metadata management
async function ensureEventMetadata(provider, eventmetadata, spec)
```

**Configuration Dependencies**:
- `events.config.yaml`: Event provider specifications
- Environment variables: `SERVICE_API_KEY`, `AIO_runtime_namespace`
- Adobe I/O project configuration

**Usage**:
```bash
# Run during project setup or when updating event configurations
node scripts/configure-events.js
```

### 2. `configure-commerce-events.js` - Commerce Event Integration

**Purpose**: Configures Adobe Commerce to work with Adobe I/O Events, setting up event subscriptions and provider configurations.

**Key Features**:
- **Commerce Event Provider Setup**: Configures event providers in Adobe Commerce
- **Event Subscription Management**: Subscribes to specific Commerce events
- **Provider Validation**: Ensures correct provider configuration
- **Workspace Integration**: Integrates with Adobe I/O workspace configuration

**Workflow**:
1. **Provider Validation**: Validates the commerce event provider exists
2. **Commerce Configuration**: Configures event provider in Adobe Commerce
3. **Event Subscription**: Subscribes to specified Commerce events
4. **Error Handling**: Manages conflicts and existing subscriptions

**Key Functions**:
```javascript
// Main configuration function
async function main(workspaceFile)

// Commerce event configuration
async function configureCommerceEvents(eventProviderSpec, workspaceFile)

// Provider configuration
async function configureCommerceEventProvider(providerId, instanceId, workspaceFile)

// Subscription management
async function ensureCommerceEventSubscriptions(eventsSpec)
```

**Configuration Dependencies**:
- `events.config.yaml`: Commerce event specifications
- Environment variables: `COMMERCE_BASE_URL`, `COMMERCE_ADOBE_IO_EVENTS_MERCHANT_ID`
- Adobe I/O workspace configuration

**Usage**:
```bash
# Configure commerce events with workspace file
node scripts/configure-commerce-events.js workspace.json
```

## Configuration Files

### `events.config.yaml` - Event Configuration

**Purpose**: Defines event providers and their metadata for Adobe I/O Events integration.

**Structure**:
```yaml
event_providers:
  - label: Commerce events provider
    provider_metadata: dx_commerce_events
    description: Event provider for Adobe Commerce
    docs_url: https://developer.adobe.com/commerce/extensibility/events/
    subscription:
      - event:
          name: observer.checkout_oope.sales_order_creditmemo_save_after
          parent: observer.sales_order_creditmemo_save_after
          fields:
            - name: '*'
```

**Key Components**:
- **Event Providers**: Defines providers for different event sources
- **Event Metadata**: Specifies event codes, labels, and descriptions
- **Commerce Subscriptions**: Defines Commerce event subscriptions
- **Field Mapping**: Specifies which event fields to capture

## Common Patterns and Best Practices

### 1. **Adobe I/O Integration**
- **Credential Resolution**: Use `resolveCredentials()` for IMS authentication
- **Client Initialization**: Initialize clients with proper credentials
- **API Error Handling**: Handle API errors gracefully
- **Logging**: Use structured logging for debugging

### 2. **Event Management**
- **Provider Synchronization**: Keep local and cloud configurations in sync
- **Metadata Management**: Ensure event metadata is properly configured
- **Subscription Management**: Handle existing subscriptions gracefully
- **Namespace Isolation**: Use namespaces to avoid conflicts

## Error Handling and Troubleshooting

### Common Issues

1. **Adobe I/O Authentication Failures**
   - **Cause**: Invalid or missing IMS credentials
   - **Solution**: Verify `SERVICE_API_KEY` and other authentication variables
   - **Reference**: Check Adobe Developer Console credentials

2. **Event Provider Conflicts**
   - **Cause**: Existing event providers with different configurations
   - **Solution**: Update provider configuration or unsubscribe existing providers
   - **Reference**: Check Adobe I/O Events console

3. **Commerce Configuration Issues**
   - **Cause**: Invalid Commerce configuration or API access
   - **Solution**: Verify Commerce base URL and authentication
   - **Reference**: Check Commerce instance configuration

### Debugging Tips

- **Enable Debug Logging**: Set `LOG_LEVEL=debug` for detailed logging
- **Check Configuration**: Verify all required configuration files exist
- **Validate Credentials**: Ensure all authentication credentials are correct
- **Test Individual Scripts**: Run scripts individually to isolate issues
- **Check Adobe Console**: Verify configurations in Adobe Developer Console

## Security Considerations

### 1. **Credential Management**
- Use environment variables for sensitive data
- Never hardcode credentials in scripts
- Use secure credential resolution methods

### 2. **Configuration Security**
- Validate all configuration inputs
- Sanitize file paths and URLs
- Implement proper access controls

### 3. **API Security**
- Use HTTPS for all API communications
- Implement proper authentication
- Validate API responses

## Testing and Validation

### 1. **Configuration Testing**
- Test configuration file parsing
- Validate configuration structure
- Test error handling scenarios

### 2. **Integration Testing**
- Test Adobe I/O Events integration
- Test Commerce API integration
- Test end-to-end workflows

### 3. **Error Scenario Testing**
- Test missing configuration files
- Test invalid credentials
- Test API failures

## Future Enhancements

### 1. **Configuration Management**
- Implement configuration validation schemas
- Add configuration migration tools
- Implement configuration versioning

### 2. **Automation**
- Add automated configuration deployment
- Implement configuration rollback capabilities
- Add configuration monitoring and alerting

### 3. **Integration**
- Add support for custom event types
- Implement additional event providers
- Add support for event filtering and transformation 
