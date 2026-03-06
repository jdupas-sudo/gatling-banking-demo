FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

# Seed the database on first run
RUN npm run seed

EXPOSE 3000

CMD ["node", "src/server.js"]
