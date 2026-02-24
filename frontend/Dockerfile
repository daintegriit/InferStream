# Stage 1: Build React frontend
FROM node:20 AS builder

WORKDIR /app

COPY . .

# Install dependencies and build the Vite app
RUN npm install && npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3007
