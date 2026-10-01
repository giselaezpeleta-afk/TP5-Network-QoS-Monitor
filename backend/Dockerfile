FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server.mjs echo-server.mjs ./
ENV QOS_BIND=0.0.0.0 PORT=5050 QOS_UDP_PORT=5051
USER node
EXPOSE 5050/tcp 5051/udp
CMD ["node", "server.mjs"]
