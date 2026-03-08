# Use specific Node.js version
FROM node:18-alpine AS base

# Configure working directory
WORKDIR /app

# ---- Backend Build & Serve ----
FROM base AS backend

WORKDIR /app/server

# Install dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy server code
COPY server/ ./

# Expose API port
EXPOSE 5000

# Start command
CMD ["npm", "start"]

# ---- Frontend Build & Serve (Alternative to Vercel) ----
FROM base AS frontend-build

WORKDIR /app

# Install frontend dependencies
COPY package*.json ./
RUN npm install

# Copy frontend code
COPY . ./
# Note: Ensure .env.production is set or passed as build args
RUN npm run build

# Use Nginx to serve static files
FROM nginx:alpine AS frontend

COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
