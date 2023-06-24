# Use the official Node.js image as the base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and yarn.lock files to the working directory
COPY package.json package-lock.json ./

# Install project dependencies
RUN npm install --frozen-lockfile

# Copy the entire project to the working directory
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the desired port (usually 3000 for Next.js)
EXPOSE 3000

# Define the command to run your Next.js application
CMD ["npm","run", "start"]