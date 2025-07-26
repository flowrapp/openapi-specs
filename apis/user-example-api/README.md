# User Example API

This directory contains the OpenAPI specification for the Flowrapp User API, which provides user management functionality.

## Overview

The User API is a RESTful service that allows clients to:
- Find users by name

The API follows the OpenAPI 3.1.0 specification.

## API Structure

The OpenAPI specification is organized as follows:

```
rest/
  ├── open-api-rest.yml           # Main OpenAPI specification file
  └── v1/                         # Version 1 of the API
      ├── components/             # Reusable components
      │   └── components.yml      # Schema definitions
      └── services/               # API operations
          └── user-operations.yml # User-related operations
```

## License

This API is licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).