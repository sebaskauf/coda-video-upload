# Build stage
FROM node:20-alpine AS build

WORKDIR /build

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Build
RUN npm run build

# Production stage
FROM nginx:alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy built app first
COPY --from=build /build/dist /usr/share/nginx/html

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config
COPY --from=build /build/nginx.conf /etc/nginx/conf.d/app.conf

# Test nginx config
RUN nginx -t

# Expose port
EXPOSE 80

# Add healthcheck
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
