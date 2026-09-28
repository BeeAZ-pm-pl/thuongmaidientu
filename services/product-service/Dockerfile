FROM node:26-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8002
CMD ["node", "src/index.js"]
