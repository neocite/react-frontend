FROM node:lts-alpine3.13

RUN apk add --no-cache bash

RUN yarn add @nestjs/cli

USER node

WORKDIR /home/node/app