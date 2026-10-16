# Practical 11: Backend Dockerfile for Node/Express
FROM node:18

# Set working directory inside container
WORKDIR /app

# Copy dependency definitions first to take advantage of Docker layer caching
COPY package*.json ./

# Install dependencies inside the container
RUN npm install

# Copy application source code into the image
COPY . .

# Expose backend application port
EXPOSE 5000

# Start backend server
CMD ["node", "server.js"]
