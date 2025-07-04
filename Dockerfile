FROM node:18

WORKDIR /app
COPY . .

RUN npm install

EXPOSE 3000

CMD ["sh", "-c", "node fix_client.js & node server.js"]
