# OpenAPI Specifications Repository

This repository contains OpenAPI specification files for various APIs.

## Validation

This repository includes a GitHub Actions workflow that automatically validates all OpenAPI specification files:

- **Workflow**: `.github/workflows/openapi-validation.yml`
- **Trigger**: Runs on push to main branch and pull requests when YAML files in the `apis` directory are modified
- **Validation Tools**:
  - [Swagger CLI](https://github.com/APIDevTools/swagger-cli) - For basic OpenAPI validation
  - [Spectral](https://github.com/stoplightio/spectral) - For linting and more detailed validation

## Structure

- `apis/` - Contains all API specifications organized by service
