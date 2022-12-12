## declare base image - node 16
FROM node:16.13.1-alpine3.12 AS builder
RUN apk add --no-cache python3 make g++
## make work directory and copy files 
WORKDIR /app 

## project dependency install
COPY package.json yarn.lock ./
RUN yarn

## project build
COPY . . 
RUN yarn run build

FROM node:16.13.1-alpine3.12
WORKDIR /usr/src/app 
COPY --from=builder /app ./ 
EXPOSE 3000 

RUN chmod +x entrypoint.sh
ENTRYPOINT [ "./entrypoint.sh" ]
CMD [ "--help" ]
