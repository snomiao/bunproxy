FROM oven/bun
# FROM node:alpine
# RUN npm i -g bun
WORKDIR /src
COPY index.ts ./
ENV PORT=80
CMD bun index.ts
