FROM node:20.18.3

WORKDIR /
COPY . .

# COPY package*.json ./
RUN npm cache clean --force
RUN npm ci --legacy-peer-deps



COPY . .

EXPOSE 3000

# CMD ["npm", "run", "dev"]
CMD ["sh", "-c", "npm run dev && tail -f /dev/null"]
