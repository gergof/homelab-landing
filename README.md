# homelab-landing

A small Fastify landing page for a homelab. It renders a dashboard of configured
services, links to the services that have web URLs, and optionally checks whether
each service is healthy.

## Features

- Configured entirely through environment variables or a local `.env` file.
- Responsive Nunjucks UI with one card per service.
- Optional HTTP, TCP, and ICMP ping health checks.
- Cached health check results to avoid probing services on every page load.
- `/healthz` endpoint for container or reverse-proxy health checks.
- Production Docker image.

## Requirements

- Node.js 24 or newer
- npm

The Dockerfile is also based on `node:24-alpine`.

## Getting Started

Install dependencies:

```sh
npm install
```

Create a `.env` file:

```sh
TITLE="My Homelab"
PORT=3000

PROJECT_01="Grafana;https://grafana.example.test;http|/api/health|3000"
PROJECT_02="Postgres;!postgres.example.test:5432;tcp|tcp://postgres.example.test:5432|3000"
PROJECT_03="Router;!192.168.1.1;ping|ping://192.168.1.1|3000"
PROJECT_04="Docs;https://docs.example.test"
```

Start the app:

```sh
npm start
```

Open `http://localhost:3000`.

## Configuration

| Variable                        | Required | Default            | Description                                          |
| ------------------------------- | -------- | ------------------ | ---------------------------------------------------- |
| `TITLE`                         | Yes      | -                  | Page title shown in the browser and header.          |
| `HOST`                          | No       | `0.0.0.0`          | Address Fastify listens on.                          |
| `PORT`                          | No       | `3000`             | Port Fastify listens on.                             |
| `FAVICON`                       | No       | `/static/icon.png` | Favicon URL.                                         |
| `HEALTHCHECK_CACHE_TTL_SECONDS` | No       | `180`              | Number of seconds to cache each health check result. |
| `PROJECT_*`                     | No       | -                  | Service definitions displayed on the landing page.   |

Project variables are read in sorted environment-variable order, so names such as
`PROJECT_01`, `PROJECT_02`, and `PROJECT_03` keep the display order predictable.

## Project Definition Format

Each `PROJECT_*` value uses this format:

```text
NAME;[!]URL;[HEALTHCHECK_TYPE[|ENDPOINT][|TIMEOUT_MS]]
```

Fields:

- `NAME`: Display name for the service.
- `URL`: Service URL or address. Prefix with `!` to display the service without
  creating an "Open project" web link.
- `HEALTHCHECK_TYPE`: Optional. One of `none`, `http`, `tcp`, or `ping`.
- `ENDPOINT`: Optional. Health check target. Relative HTTP endpoints are resolved
  against the project URL.
- `TIMEOUT_MS`: Optional. Per-check timeout in milliseconds. Defaults to `3000`.

Examples:

```sh
# Link-only service, no health check.
PROJECT_01="Homepage;https://home.example.test"

# HTTP check against a relative endpoint.
PROJECT_02="Grafana;https://grafana.example.test;http|/api/health|3000"

# TCP check for a non-web service. The leading ! disables the web link.
PROJECT_03="Postgres;!postgres.example.test:5432;tcp|tcp://postgres.example.test:5432|3000"

# ICMP ping check.
PROJECT_04="Router;!192.168.1.1;ping|ping://192.168.1.1|3000"
```

## Health Checks

Services with no health check are shown with an `Unknown` status.

Supported health check types:

| Type   | Behavior                                                                          |
| ------ | --------------------------------------------------------------------------------- |
| `none` | Skips probing and reports `Unknown`.                                              |
| `http` | Sends a request to the endpoint and treats any non-2xx/3xx response as unhealthy. |
| `tcp`  | Opens a TCP connection to the endpoint host and port.                             |
| `ping` | Sends an ICMP ping to the endpoint host.                                          |

Health check results are cached per project for
`HEALTHCHECK_CACHE_TTL_SECONDS`.

## Scripts

```sh
npm run build      # Compile TypeScript and copy views/static assets to dist/
npm start          # Build and run dist/index.js
npm run typecheck  # Type-check without emitting files
npm run lint       # Run ESLint
npm run lint:fix   # Run ESLint with autofixes
npm run release    # Create a release with commit-and-tag-version
```

## Docker

The image is published at:

```text
ghcr.io/gergof/homelab-landing
```

Build the image:

```sh
docker build -t homelab-landing .
```

Run it with environment variables:

```sh
docker run --rm -p 3000:3000 \
  -e TITLE="My Homelab" \
  -e PROJECT_01="Grafana;https://grafana.example.test;http|/api/health|3000" \
  homelab-landing
```

Or run it with an env file:

```sh
docker run --rm -p 3000:3000 --env-file .env homelab-landing
```

To use the published image instead of a local build, replace `homelab-landing`
with `ghcr.io/gergof/homelab-landing` in the `docker run` commands.

## Endpoints

| Path        | Description                                             |
| ----------- | ------------------------------------------------------- |
| `/`         | Landing page with configured projects.                  |
| `/healthz`  | Application health endpoint returning `{ "ok": true }`. |
| `/static/*` | Static assets.                                          |

## License

MIT
