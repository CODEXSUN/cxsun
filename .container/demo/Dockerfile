ARG NODE_RUNTIME_VERSION=26.5.0
FROM node:${NODE_RUNTIME_VERSION}-bookworm-slim AS build

WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:${NODE_RUNTIME_VERSION}-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 17210
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=10 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PLATFORM_API_PORT+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["npm", "run", "start:api:production"]

FROM nginx:1.28-alpine AS web
COPY .container/demo/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/apps/platform/web /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1/health >/dev/null || exit 1
