# Use Node.js 20 LTS as base image
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3001

# Use start:prod which includes the --env-file flag
CMD [ "npm", "run", "start:prod" ]
