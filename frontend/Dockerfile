# ==============================================================================
# MediAssist-AI React 19 SPA Multi-Stage Production Dockerfile
# ==============================================================================

# Stage 1: Build static assets with Node.js 20 Alpine
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies with lockfile caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build production bundle
COPY . .
RUN npm run build

# Stage 2: Serve static bundle via high-performance Nginx Alpine
FROM nginx:alpine AS runner

# Remove default Nginx website configuration
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom frontend Nginx SPA configuration
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json image/svg+xml;

    # Static asset caching (1 year for hashed Vite chunks)
    location ~* \.(?:css|js|woff2?|svg|png|jpg|jpeg|gif|ico|webp)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files \$uri =404;
    }

    # SPA Routing: Fallback all unhandled routes to index.html
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Healthcheck probe
    location /healthz {
        access_log off;
        return 200 "healthy\n";
    }
}
EOF

# Copy static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget --spider -q http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
