# Stage 1: Build TypeScript server
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json tsconfig.json ./
COPY prisma ./prisma/
RUN npm ci

COPY src ./src/
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json tsconfig.json ./
COPY prisma ./prisma/
COPY scripts ./scripts/
RUN npm ci --omit=dev

# Copy generated Prisma client and compiled JS from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
