# Build stage: compile TypeScript and generate the Prisma client.
#
# rootDir is "." and the include is src/**/*.ts, so `nest build` emits
# dist/src/main.js (not dist/main.js). The runtime stage follows that path.
FROM node:22-bookworm-slim AS build

WORKDIR /app

# Prisma's query engine links against the system OpenSSL. Without it Prisma
# guesses openssl-1.1.x and prints a libssl warning on every command.
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Runtime stage. Migrations run on start so a fresh volume becomes usable in one
# `docker compose up`: the container is the only thing that knows the schema.
FROM node:22-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# node_modules is copied whole on purpose: the Prisma client generated above and
# the `prisma` CLI (a devDependency) are both needed at runtime, and a
# --omit=dev install would drop the CLI and break `prisma migrate deploy`.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
