FROM node:24-alpine

WORKDIR /app
COPY server.mjs ./
COPY dist/ ./dist/

EXPOSE 8080
CMD ["node", "server.mjs"]
