# GitHub Workflows Documentation

This document provides visual representations of the GitHub workflows used in this repository.

## API Documentation Workflow

This workflow deploys the API documentation to Bump.sh when changes are pushed to the main branch.

```mermaid
flowchart TD
    A[Push to main branch] --> B[Bundle OpenAPI Specification]
    B --> C[Push spec file to Stainless]
    C --> D[Deploy API docs to Bump.sh]
    
    subgraph "Bundle OpenAPI Specification"
    B1[Checkout code] --> B2[Install Redocly CLI]
    B2 --> B3[Bundle OpenAPI spec]
    end
    
    subgraph "Push spec file to Stainless"
    C1[Upload OpenAPI spec] --> C2[Generate code samples]
    C2 --> C3[Output documented spec path]
    end
    
    subgraph "Deploy API docs to Bump.sh"
    D1[Use documented spec path] --> D2[Update Bump.sh documentation]
    end
```

## API Changes Workflow

This workflow runs on pull requests to the develop branch to detect and preview API changes.

```mermaid
flowchart TD
    A[Pull Request to develop branch] --> B[Detect and preview API changes]
    A --> C[API Linting]
    
    subgraph "Detect and preview API changes"
    B1[Checkout code] --> B2[Generate API diff with Bump.sh]
    B2 --> B3[Comment on PR with changes]
    end
    
    subgraph "API Linting"
    C1[Checkout code] --> C2[Install Vacuum]
    C2 --> C3[Lint API]
    C3 --> C4[Publish lint results]
    end
```

## OpenAPI Validation Workflow

This workflow validates OpenAPI files when they are changed in a push or pull request.

```mermaid
flowchart TD
    A[Push to main/develop or PR] --> B[Validate OpenAPI files]
    
    subgraph "Validate OpenAPI files"
    B1[Checkout code] --> B2[Setup Node.js]
    B2 --> B3[Install Swagger CLI]
    B3 --> B4[Install Spectral]
    B4 --> B5[Validate OpenAPI files with Swagger CLI]
    end
```

## Workflow Relationships

This diagram shows how the three workflows relate to each other in the development process.

```mermaid
flowchart LR
    A[Developer creates/updates API spec] --> B[Push changes]
    B --> C[Pull Request]
    C --> D[OpenAPI Validation]
    C --> E[API Changes]
    D --> F{Validation passes?}
    E --> F
    F -->|Yes| G[Merge to main]
    F -->|No| H[Fix issues]
    H --> B
    G --> I[API Documentation]
    I --> J[Updated docs on Bump.sh]
```