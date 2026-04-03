# OpenAPI Specifications Repository

This repository contains OpenAPI specification files for the Flowrapp project.

## API Documentation

Interactive API references are hosted on **GitHub Pages** and powered by [Scalar](https://github.com/scalar/scalar):

| API | Description |
| --- | --- |
| [Main API](https://YOUR_GITHUB_PAGES_URL/main-api/) | Core backend — users, businesses, worklogs, invitations |
| [BFF API](https://YOUR_GITHUB_PAGES_URL/bff-api/) | Backend-for-Frontend — aggregated endpoints for the mobile app |

> Replace `YOUR_GITHUB_PAGES_URL` with the actual GitHub Pages URL after enabling Pages in the repository settings.

## Structure

```
api/
├── main-api/          # Main backend API specification
│   └── rest/
│       ├── open-api-rest.yml
│       └── v1/
│           ├── components/   # Reusable schemas
│           └── services/     # Path operations grouped by domain
└── bff-api/           # BFF (mobile) API specification
    └── rest/
        ├── open-api-rest.yml
        └── v1/
            ├── components/
            └── services/
```

## CI/CD Workflows

| Workflow | Trigger | Description |
| --- | --- | --- |
| **Deploy API documentation** | Push to `main` | Bundles specs, generates code samples (Stainless), deploys Scalar docs to GitHub Pages |
| **API Changes** | PRs to `develop`/`main` | Validates (Redocly), lints (Vacuum), detects changes & breaking changes (oasdiff), posts diff as PR comment |

See [docs/github-workflows.md](docs/github-workflows.md) for detailed workflow diagrams.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
