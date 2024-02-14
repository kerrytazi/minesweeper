FROM node:21.6.1-alpine3.18 as builder-server
RUN mkdir -p /appbuild
WORKDIR /appbuild
COPY server/package.json server/package-lock.json .
RUN npm install
COPY server .
RUN npm run build
WORKDIR /appbuild/dist
COPY server/package.json server/package-lock.json .
RUN npm install --omit=dev

FROM node:21.6.1-alpine3.18 as builder-client
RUN mkdir -p /appbuild
WORKDIR /appbuild
COPY client/package.json client/package-lock.json .
RUN npm install
COPY client .
RUN npm run build

FROM node:21.6.1-alpine3.18
ENV PORT 80
EXPOSE 80
RUN mkdir -p /app
RUN mkdir -p /app/public
WORKDIR /app
COPY --from=builder-server /appbuild/dist .
COPY --from=builder-client /appbuild/dist ./public

CMD ["node", "index.js"]
