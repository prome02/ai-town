# Use an Ubuntu base image
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && \
    apt-get install -y \
    curl \
    python3 \
    python3-pip \
    unzip \
    socat \
    build-essential \
    libssl-dev \
    iproute2 \
    && rm -rf /var/lib/apt/lists/*

# Install NVM, Node.js, and npm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.2/install.sh | bash && \
    export NVM_DIR="$HOME/.nvm" && \
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && \
    nvm install 18 && \
    nvm use 18

# Add NVM to PATH
ENV NVM_DIR=/root/.nvm
ENV NODE_VERSION=18.0.0
RUN . $NVM_DIR/nvm.sh && nvm install $NODE_VERSION
ENV NODE_PATH=$NVM_DIR/versions/node/v$NODE_VERSION/lib/node_modules
ENV PATH=$NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# Install Rust and Cargo
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && \
    . "$HOME/.cargo/env"

# Install just
RUN . "$HOME/.cargo/env" && cargo install just

# Download and install Convex Local Backend (Linux x86_64)
RUN curl -L -o /tmp/convex-backend.zip \
    https://github.com/get-convex/convex-backend/releases/download/precompiled-2025-10-29-a78fd1e/convex-local-backend-x86_64-unknown-linux-gnu.zip && \
    unzip /tmp/convex-backend.zip -d /usr/local/bin/ && \
    chmod +x /usr/local/bin/convex-local-backend && \
    rm /tmp/convex-backend.zip

# Set the working directory
WORKDIR /usr/src/app

# Copy dependency files
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy application files (包含啟動腳本)
COPY . .

# 給予啟動腳本執行權限
RUN chmod +x /usr/src/app/docker-entrypoint.sh

# Expose necessary ports
EXPOSE 5173 3210

# 使用本地模式啟動腳本
CMD ["/usr/src/app/docker-entrypoint.sh"]
