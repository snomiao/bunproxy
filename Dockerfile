FROM oven/bun
WORKDIR /src
COPY index.ts ./
ENV PORT=80
CMD bun index.ts
