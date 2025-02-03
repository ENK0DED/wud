# Common Stage
FROM oven/bun:1-slim AS base
WORKDIR /usr/src/app

LABEL maintainer="enk0ded"

ARG WUD_VERSION=unknown

ENV WUD_LOG_FORMAT=text
ENV WUD_VERSION=$WUD_VERSION

HEALTHCHECK --interval=30s --timeout=5s CMD if [[ -z ${WUD_SERVER_ENABLED} || ${WUD_SERVER_ENABLED} == 'true' ]]; then curl --fail http://localhost:${WUD_SERVER_PORT:-3000}/health || exit 1; else exit 0; fi;

RUN mkdir /store

# Add useful stuff
RUN apt update \
    && apt install -y tzdata openssl curl git jq \
    && rm -rf /var/cache/apt/*

# Dependencies stage
FROM base AS dependencies

# Copy app package.json
COPY packages/app/package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Release stage
FROM base AS release

## Copy node_modules
COPY --from=dependencies /usr/src/app/node_modules ./node_modules

# Copy app
COPY packages/app/ ./

# Copy ui
COPY packages/ui/dist/ ./ui

USER bun
EXPOSE 3000/tcp
ENTRYPOINT ["bun", "run", "index.js"]
