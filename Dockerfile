FROM node:21.6.1-alpine3.18 as builder-server
RUN mkdir -p /appbuild/server
RUN mkdir -p /appbuild/common
WORKDIR /appbuild/server
COPY server/package.json server/package-lock.json .
RUN npm install
COPY server .
COPY common ../common
RUN npm run build
WORKDIR /appbuild/server/dist/server/src
COPY server/package.json server/package-lock.json .
RUN npm install --omit=dev

FROM node:21.6.1-alpine3.18 as builder-client
RUN mkdir -p /appbuild/client
RUN mkdir -p /appbuild/common
WORKDIR /appbuild/client
COPY client/package.json client/package-lock.json .
RUN npm install
COPY client .
COPY common ../common
RUN npm run build

FROM node:21.6.1-alpine3.18
ENV PORT 80
EXPOSE 80
RUN mkdir -p /app
RUN mkdir -p /app/public
WORKDIR /app
COPY --from=builder-server /appbuild/server/dist/server/src .
COPY --from=builder-client /appbuild/client/dist ./public

CMD ["node", "index.js"]
