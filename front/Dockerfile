# Base image
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install --only=production

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Production image
FROM nginx:alpine

# Copy built application
COPY --from=base /app/build /usr/share/nginx/html

# Expose application port
EXPOSE 80

# Start the application
CMD ["nginx", "-g", "daemon off;"]
