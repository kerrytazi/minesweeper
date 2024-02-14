FROM node:21.6.1-alpine3.18 as builder

RUN mkdir -p /appbuild
WORKDIR /appbuild

COPY code/package.json code/package-lock.json ./

RUN npm install

COPY code .

FROM node:21.6.1-alpine3.18

ENV PORT 80
EXPOSE 80

RUN mkdir -p /app
WORKDIR /app

COPY --from=builder /appbuild ./

CMD ["node", "index.js"]
