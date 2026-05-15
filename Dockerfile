# Use Node 20 as base image
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm install

# Copy source code
COPY . .

# Build the frontend and handle server bundling
RUN npm run build

# Final production stage
FROM node:20-slim

WORKDIR /app

# Copy package.json to identify standard dependencies
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy the built assets and bundled server from the builder stage
COPY --from=builder /app/dist ./dist

# The start command uses the bundled server.cjs
ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
