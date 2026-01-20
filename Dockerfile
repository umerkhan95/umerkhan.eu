# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Accept GITHUB_TOKEN as build argument for fetching commits
ARG GITHUB_TOKEN
ENV GITHUB_TOKEN=$GITHUB_TOKEN

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Cache buster - invalidates build cache to ensure fresh commits are fetched
ARG CACHE_BUST
RUN echo "Build timestamp: $CACHE_BUST"

# Build the Astro site
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 8080 (Fly.io default)
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
