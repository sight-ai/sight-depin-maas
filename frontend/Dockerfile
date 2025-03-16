FROM node:20.18.3

WORKDIR /
COPY . .

RUN npm cache clean --force
RUN npm ci --legacy-peer-deps


EXPOSE 3000

# CMD ["npm", "run", "dev"]
RUN npm run build
CMD ["sh", "-c", "npm run start"]
