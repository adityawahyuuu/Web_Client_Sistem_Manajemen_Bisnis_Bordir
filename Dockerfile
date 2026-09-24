FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite bakes these into the JS bundle at build time, not at container start.
# Rebuild the image whenever a production value here needs to change.
ARG VITE_API_BASE_URL
ARG VITE_API_PREFIX
ARG VITE_WEB_BASE_PATH
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_API_PREFIX=$VITE_API_PREFIX \
    VITE_WEB_BASE_PATH=$VITE_WEB_BASE_PATH

RUN npm run build

EXPOSE 5173

# Serves the built dist/ — cloudflared only tunnels to this port, something
# still has to answer on it. `vite preview` uses the port/host/base config
# already defined in vite.config.js.
CMD ["npm", "run", "preview"]
