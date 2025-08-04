# CI/CD Pipeline Documentation

## Overview

The Adobe Brand Store App Builder uses GitHub Actions for continuous integration and deployment. The CI/CD pipeline is designed to ensure code quality, run comprehensive tests, and deploy to staging and production environments automatically.

## Active Workflows

### 1. **Node CI Tests** (`.github/workflows/ci.yml`)

**Purpose**: Primary continuous integration workflow for code quality and testing.

**Triggers**:
- Push to `main` branch
- Pull requests to `main` branch

**Environment**:
- **OS**: Ubuntu Latest
- **Node.js**: 22.x
- **Strategy**: Matrix with max-parallel: 1

**Steps**:
1. **Checkout**: Retrieves code from repository
2. **Node.js Setup**: Configures Node.js 22.x with npm caching
3. **Dependencies**: Installs dependencies with `npm ci`
4. **Code Quality**: Runs `npm run code:check` (format + lint)
5. **Testing**: Runs `npm test` (Jest tests)

**Key Features**:
- **Parallel Execution Control**: Ensures only one job runs at a time
- **Caching**: Uses npm cache for faster dependency installation
- **Code Quality**: Enforces code formatting and linting standards
- **Comprehensive Testing**: Runs all Jest tests

## Sample Workflows

### 2. **Production Deployment** (`.github/workflows-samples/deploy_prod.yml`)

**Purpose**: Deploy application to production environment.

**Triggers**:
- Release event (when a release is marked as released)

**Environment**:
- **OS**: Ubuntu Latest
- **Node.js**: 20.x
- **Strategy**: Matrix with max-parallel: 1

**Steps**:
1. **Environment Setup**:
   - Checkout code using `actions/checkout@v4`
   - Setup Node.js 20.x using `actions/setup-node@v4`
   - Install dependencies with `npm i`

2. **Adobe I/O CLI Setup**:
   - Install Adobe I/O CLI using `adobe/aio-cli-setup-action@1.3.0`
   - Configure CLI for version 10.x.x

3. **Authentication**:
   - Authenticate with Adobe I/O using `adobe/aio-apps-action@3.3.0`
   - Use OAuth STS authentication with production credentials
   - Required secrets: `CLIENTID_PROD`, `CLIENTSECRET_PROD`, `TECHNICALACCID_PROD`, `TECHNICALACCEMAIL_PROD`, `IMSORGID_PROD`, `SCOPES_PROD`

4. **Build Process**:
   - Build application using `adobe/aio-apps-action@3.3.0`
   - Environment: `AIO_RUNTIME_NAMESPACE_PROD`

5. **Deployment**:
   - Deploy to production using `adobe/aio-apps-action@3.3.0`
   - Required environment variables:
     - `AIO_RUNTIME_NAMESPACE_PROD`
     - `AIO_RUNTIME_AUTH_PROD`
     - `AIO_PROJECT_ID_PROD`
     - `AIO_PROJECT_NAME_PROD`
     - `AIO_PROJECT_ORG_ID_PROD`
     - `AIO_PROJECT_WORKSPACE_ID_PROD`
     - `AIO_PROJECT_WORKSPACE_NAME_PROD`
     - `AIO_PROJECT_WORKSPACE_DETAILS_SERVICES_PROD`

### 3. **Staging Deployment** (`.github/workflows-samples/deploy_stage.yml`)

**Purpose**: Deploy application to staging environment.

**Triggers**:
- Push to `main` branch

**Environment**:
- **OS**: Ubuntu Latest
- **Node.js**: 20.x
- **Strategy**: Matrix with max-parallel: 1

**Steps**:
1. **Environment Setup**:
   - Checkout code using `actions/checkout@v4`
   - Setup Node.js 20.x using `actions/setup-node@v4`
   - Install dependencies with `npm i`

2. **Adobe I/O CLI Setup**:
   - Install Adobe I/O CLI using `adobe/aio-cli-setup-action@1.3.0`
   - Configure CLI for version 10.x.x

3. **Authentication**:
   - Authenticate with Adobe I/O using `adobe/aio-apps-action@3.3.0`
   - Use OAuth STS authentication with staging credentials
   - Required secrets: `CLIENTID_STAGE`, `CLIENTSECRET_STAGE`, `TECHNICALACCID_STAGE`, `TECHNICALACCEMAIL_STAGE`, `IMSORGID_STAGE`, `SCOPES_STAGE`

4. **Build Process**:
   - Build application using `adobe/aio-apps-action@3.3.0`
   - Environment: `AIO_RUNTIME_NAMESPACE_STAGE`

5. **Deployment**:
   - Deploy to staging using `adobe/aio-apps-action@3.3.0`
   - Required environment variables:
     - `AIO_RUNTIME_NAMESPACE_STAGE`
     - `AIO_RUNTIME_AUTH_STAGE`
     - `AIO_PROJECT_ID_STAGE`
     - `AIO_PROJECT_NAME_STAGE`
     - `AIO_PROJECT_ORG_ID_STAGE`
     - `AIO_PROJECT_WORKSPACE_ID_STAGE`
     - `AIO_PROJECT_WORKSPACE_NAME_STAGE`
     - `AIO_PROJECT_WORKSPACE_DETAILS_SERVICES_STAGE`
   - **No Publish**: Uses `noPublish: true` flag

### 4. **Pull Request Testing** (`.github/workflows-samples/pr_test.yml`)

**Purpose**: Test changes in pull requests across multiple environments.

**Triggers**:
- Pull request events (opened, updated, synchronized)

**Environment**:
- **OS**: macOS-latest, ubuntu-latest, windows-latest
- **Node.js**: 20.x
- **Strategy**: Matrix across multiple operating systems

**Steps**:
1. **Environment Setup**:
   - Checkout code using `actions/checkout@v4`
   - Setup Node.js 20.x using `actions/setup-node@v4`
   - Install dependencies with `npm i`

2. **Adobe I/O CLI Setup**:
   - Install Adobe I/O CLI using `adobe/aio-cli-setup-action@1.3.0`
   - Configure CLI for version 10.x.x

3. **Authentication**:
   - Authenticate with Adobe I/O using `adobe/aio-apps-action@3.3.0`
   - Use OAuth STS authentication with staging credentials
   - Required secrets: `CLIENTID_STAGE`, `CLIENTSECRET_STAGE`, `TECHNICALACCID_STAGE`, `TECHNICALACCEMAIL_STAGE`, `IMSORGID_STAGE`, `SCOPES_STAGE`

4. **Build Process**:
   - Build application using `adobe/aio-apps-action@3.3.0`
   - Environment: `AIO_RUNTIME_NAMESPACE_STAGE`

5. **Testing**:
   - Run tests using `adobe/aio-apps-action@3.3.0`
   - Command: `test`

## GitHub Configuration

### Pull Request Template (`.github/PULL_REQUEST_TEMPLATE.md`)

**Purpose**: Standardize pull request submissions and ensure quality.

**Required Sections**:
- **Description**: Detailed description of changes
- **Related Issue**: Link to related GitHub issue
- **Motivation and Context**: Why the change is needed
- **Testing**: How changes were tested
- **Screenshots**: Visual evidence if applicable
- **Change Types**: Bug fix, new feature, or breaking change
- **Checklist**: Compliance checklist including:
  - Adobe Open Source CLA signature
  - Code style compliance
  - Documentation updates
  - Test coverage
  - All tests passing

### Contributing Guidelines (`.github/CONTRIBUTING.md`)

**Purpose**: Guide contributors through the contribution process.

**Key Requirements**:
- **Code of Conduct**: Adobe's code of conduct compliance
- **Issue First**: Discuss changes in issues before PRs
- **CLA**: Adobe Contributor License Agreement required
- **Code Reviews**: All submissions require review
- **Security**: Security issues reported separately

### Code Owners (`.github/CODEOWNERS`)

**Purpose**: Define repository ownership and review requirements.

**Current Owners**:
- **Team**: `@adobe/party-parrots`
- **Scope**: All files (`*`)
- **Note**: No code owner restrictions for deployment repository

## Available Scripts

### Code Quality Scripts
```bash
# Testing
npm test                    # Run Jest tests
npm run e2e                # Run end-to-end tests

# Code Quality
npm run lint:check         # Check ESLint rules
npm run lint:fix           # Fix ESLint issues
npm run format:check       # Check Prettier formatting
npm run format:fix         # Fix formatting issues
npm run code:check         # Run both format and lint checks
npm run code:fix           # Fix both format and lint issues
```

### Configuration Scripts
```bash
# Event Configuration
npm run configure-events           # Configure Adobe I/O Events
npm run configure-commerce-events  # Configure Commerce events

# Payment and Shipping
npm run create-payment-methods     # Create payment methods
npm run create-shipping-carriers   # Create shipping carriers
```

## Required Secrets

### Production Environment
- `CLIENTID_PROD`: Adobe I/O Client ID for production
- `CLIENTSECRET_PROD`: Adobe I/O Client Secret for production
- `TECHNICALACCID_PROD`: Technical Account ID for production
- `TECHNICALACCEMAIL_PROD`: Technical Account Email for production
- `IMSORGID_PROD`: IMS Organization ID for production
- `SCOPES_PROD`: OAuth scopes for production
- `AIO_RUNTIME_NAMESPACE_PROD`: Adobe I/O Runtime namespace
- `AIO_RUNTIME_AUTH_PROD`: Adobe I/O Runtime authentication
- `AIO_PROJECT_ID_PROD`: Adobe I/O Project ID
- `AIO_PROJECT_NAME_PROD`: Adobe I/O Project name
- `AIO_PROJECT_ORG_ID_PROD`: Adobe I/O Project organization ID
- `AIO_PROJECT_WORKSPACE_ID_PROD`: Adobe I/O Project workspace ID
- `AIO_PROJECT_WORKSPACE_NAME_PROD`: Adobe I/O Project workspace name
- `AIO_PROJECT_WORKSPACE_DETAILS_SERVICES_PROD`: Adobe I/O Project workspace services

### Staging Environment
- `CLIENTID_STAGE`: Adobe I/O Client ID for staging
- `CLIENTSECRET_STAGE`: Adobe I/O Client Secret for staging
- `TECHNICALACCID_STAGE`: Technical Account ID for staging
- `TECHNICALACCEMAIL_STAGE`: Technical Account Email for staging
- `IMSORGID_STAGE`: IMS Organization ID for staging
- `SCOPES_STAGE`: OAuth scopes for staging
- `AIO_RUNTIME_NAMESPACE_STAGE`: Adobe I/O Runtime namespace
- `AIO_RUNTIME_AUTH_STAGE`: Adobe I/O Runtime authentication
- `AIO_PROJECT_ID_STAGE`: Adobe I/O Project ID
- `AIO_PROJECT_NAME_STAGE`: Adobe I/O Project name
- `AIO_PROJECT_ORG_ID_STAGE`: Adobe I/O Project organization ID
- `AIO_PROJECT_WORKSPACE_ID_STAGE`: Adobe I/O Project workspace ID
- `AIO_PROJECT_WORKSPACE_NAME_STAGE`: Adobe I/O Project workspace name
- `AIO_PROJECT_WORKSPACE_DETAILS_SERVICES_STAGE`: Adobe I/O Project workspace services

## Deployment Strategy

### Environment Promotion
1. **Development**: Local development and testing
2. **Staging**: Automated deployment on main branch push
3. **Production**: Manual deployment on release creation

### Release Process
1. **Feature Development**: Develop features in feature branches
2. **Pull Request**: Create PR with comprehensive testing
3. **Code Review**: Review and approve changes
4. **Merge to Main**: Merge triggers staging deployment
5. **Staging Validation**: Validate changes in staging environment
6. **Release Creation**: Create GitHub release to trigger production deployment
7. **Production Deployment**: Automated deployment to production

### Rollback Strategy
- **Staging**: Immediate rollback by reverting main branch
- **Production**: Manual rollback by creating new release with previous version

## Security Considerations

### Secret Management
- All sensitive credentials stored as GitHub Secrets
- Environment-specific secrets for staging and production
- No hardcoded credentials in workflow files

### Authentication
- OAuth STS authentication for Adobe I/O services
- Technical account-based authentication
- Scope-limited access for security

### Code Quality Gates
- Automated code formatting and linting
- Comprehensive test coverage requirements
- Pull request review requirements
- CLA signature requirements

## Monitoring and Observability

### Workflow Monitoring
- GitHub Actions provides built-in workflow monitoring
- Workflow status and logs available in GitHub UI
- Email notifications for workflow failures

### Deployment Monitoring
- Adobe I/O Runtime provides deployment monitoring
- Application logs available through Adobe I/O CLI
- Performance metrics and error tracking

## Best Practices

### Development Workflow
1. **Branch Strategy**: Use feature branches for development
2. **Commit Messages**: Use conventional commit messages
3. **Pull Requests**: Always use pull requests for changes
4. **Testing**: Ensure all tests pass before merging
5. **Documentation**: Update documentation with changes

### Deployment Best Practices
1. **Environment Parity**: Maintain consistency between environments
2. **Configuration Management**: Use environment-specific configurations
3. **Health Checks**: Implement application health checks
4. **Monitoring**: Set up monitoring and alerting
5. **Backup Strategy**: Implement backup and recovery procedures

### Security Best Practices
1. **Secret Rotation**: Regularly rotate secrets and credentials
2. **Access Control**: Implement least-privilege access
3. **Audit Logging**: Enable comprehensive audit logging
4. **Vulnerability Scanning**: Regular security scanning
5. **Compliance**: Maintain compliance with security standards

This CI/CD pipeline ensures reliable, secure, and automated deployment of the Adobe Brand Store App Builder while maintaining high code quality and security standards.
