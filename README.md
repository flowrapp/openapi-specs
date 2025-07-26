# OpenAPI Specifications Repository

This repository contains OpenAPI specification files for various APIs.

## Validation

This repository includes a GitHub Actions workflow that automatically validates the main OpenAPI specification files:

- **Workflow**: `.github/workflows/openapi-validation.yml`
- **Trigger**: Runs on push to main branch and pull requests when YAML files in the `apis` directory are modified
- **Validated Files**: Only the main OpenAPI files (named `open-api-rest.yml` or `open-api-rest.yaml`) are validated, not the component or service files
- **Validation Tools**:
  - [Swagger CLI](https://github.com/APIDevTools/swagger-cli) - For basic OpenAPI validation
  - [Spectral](https://github.com/stoplightio/spectral) - For linting and more detailed validation

## Structure

- `apis/` - Contains all API specifications organized by service
