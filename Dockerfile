FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs ./
COPY lib ./lib
COPY public ./public
ENV HOST=0.0.0.0 PORT=4180 SCHOLAR_DATA_DIR=/var/data
RUN mkdir -p /var/data && chown node:node /var/data
USER node
EXPOSE 4180
CMD ["npm", "start"]
