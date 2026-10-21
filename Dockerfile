FROM node:24-bookworm-slim AS assets
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY client ./client
COPY scripts/build.js ./scripts/build.js
COPY public ./public
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node server.mjs ./
COPY --chown=node:node lib ./lib
COPY --from=assets --chown=node:node /app/public ./public
COPY --chown=node:node db ./db
COPY --chown=node:node scripts/migrate.js ./scripts/migrate.js
USER node
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.mjs"]
