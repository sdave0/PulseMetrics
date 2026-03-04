# Build stage
FROM node:lts-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine
RUN apk update && apk upgrade --no-cache && apk add --no-cache libpng
# Copy the build output from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 to access the app
EXPOSE 80

# Run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
