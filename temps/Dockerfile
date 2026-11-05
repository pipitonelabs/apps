FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm test && npm run build

FROM nginxinc/nginx-unprivileged:1.29-alpine
ENV PROM_URL=http://kube-prometheus-stack-prometheus.observability.svc.cluster.local:9090
ENV KROMGO_URL=http://kromgo.observability.svc.cluster.local
ENV TAUTULLI_URL=http://tautulli.media.svc.cluster.local \
    JELLYFIN_URL=http://jellyfin.media.svc.cluster.local:8096 \
    TAUTULLI_API_KEY= \
    JELLYFIN_API_KEY=
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
