# Frontend multi-stage build: build with node, serve with nginx
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY . .
RUN npm ci && npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["/usr/sbin/nginx", "-g", "daemon off;"]
