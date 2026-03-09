# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
# Set build-time env vars if needed
RUN npm run build

# Stage 2: Production
FROM nginx:stable-alpine

# Copy build artifacts to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Add custom nginx config to handle SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
