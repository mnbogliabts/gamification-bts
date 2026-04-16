FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (need devDeps for TypeScript compilation)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

# Copy built output from build stage
COPY --from=build /app/dist ./dist

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["npm", "start"]
