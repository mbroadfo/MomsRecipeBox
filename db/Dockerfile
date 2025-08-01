# db/Dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/db-init

# Copy package files (only if you need dependencies)
COPY package*.json ./

# Install dependencies (dotenv, mongodb, etc.)
RUN npm install

# Copy the init script and recipes folder
COPY init_mrb_db.js ./init_mrb_db.js
COPY recipes ./recipes

# Run the init script
CMD ["node", "init_mrb_db.js"]
