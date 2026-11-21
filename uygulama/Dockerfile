# Yemekhane · uygulama servisi (Node.js + Express, Web API)
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Önce yalnızca bağımlılıklar: kod değişince bu katman önbellekten gelir
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src

USER node
EXPOSE 8000
CMD ["node", "src/sunucu.js"]
