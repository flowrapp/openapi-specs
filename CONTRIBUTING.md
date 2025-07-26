# Contributing to OpenAPI Specifications Repository

Thank you for your interest in contributing to our OpenAPI specifications repository! This document provides guidelines to ensure consistency and quality in our API specifications.

## Contribution Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## OpenAPI Validation

All OpenAPI specification files are automatically validated using GitHub Actions:

- The validation workflow runs on every pull request that modifies YAML files in the `apis` directory
- Two validation tools are used:
  - **Swagger CLI**: Validates the basic structure and syntax of OpenAPI files
  - **Spectral**: Performs more detailed linting and validation

### Local Validation

Before submitting a pull request, you can validate your OpenAPI specifications locally:

```bash
# Install validation tools
npm install -g @apidevtools/swagger-cli @stoplight/spectral-cli

# Validate with Swagger CLI
swagger-cli validate path/to/your/openapi.yml

# Lint with Spectral
spectral lint path/to/your/openapi.yml
```

## OpenAPI Style Guidelines

1. Use YAML format for all OpenAPI specifications
2. Follow the OpenAPI 3.x specification
3. Use proper indentation (2 spaces)
4. Include descriptive summaries and descriptions for all operations
5. Use consistent naming conventions for paths, parameters, and schemas
6. Organize specifications into separate files when appropriate, using `$ref` to reference components

## Directory Structure

- Place new API specifications in the appropriate directory under `apis/`
- Organize files by service and version
- Use the following structure:
  ```
  apis/
    service-name/
      rest/
        open-api-rest.yml  # Main OpenAPI file
        v1/
          components/      # Reusable components
          services/        # API operations
  ```
