FROM rust:1.90-slim

# Fix clock skew in VM
RUN echo 'Acquire::Check-Valid-Until "false";' > /etc/apt/apt.conf.d/99no-check-valid

RUN apt-get -o Acquire::Check-Valid-Until=false update \
    && apt-get install -y --no-install-recommends \
    pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Pre-cache basic crates
RUN mkdir -p /tmp/cache/src && echo 'fn main() {}' > /tmp/cache/src/main.rs && \
    printf '[package]\nname = "cache"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\nserde = { version = "1", features = ["derive"] }\nserde_json = "1"\ntokio = { version = "1", features = ["full"] }\n' > /tmp/cache/Cargo.toml && \
    cd /tmp/cache && cargo build --release && rm -rf /tmp/cache

WORKDIR /workspace
