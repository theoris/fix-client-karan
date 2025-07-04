FROM node:18-slim

# ติดตั้งไลบรารีที่ Puppeteer ต้องการ
RUN apt-get update && apt-get install -y \
  libnss3 libnspr4 libatk-bridge2.0-0 libgtk-3-0 \
  libxss1 libasound2 libx11-xcb1 libxcomposite1 libxdamage1 \
  libxrandr2 libgbm1 libpango-1.0-0 libpangocairo-1.0-0 \
  fonts-liberation ca-certificates wget xdg-utils \
  --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN npm install

EXPOSE 3000

CMD ["sh", "-c", "node fix_client.js & node server.js"]
