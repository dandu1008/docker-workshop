FROM node:lts-alpine AS build

WORKDIR /app/

COPY package.json yarn.lock ./
RUN yarn install

COPY . .
RUN yarn build


FROM nginx:alpine AS serve

COPY --from=build /app/build/ /usr/share/nginx/html/


