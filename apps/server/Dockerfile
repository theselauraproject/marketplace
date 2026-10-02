FROM rust:1.90-bookworm AS builder

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/selaura-api /app/selaura-api
COPY --from=builder /app/migrations /app/migrations
RUN mkdir -p /app/uploads

ENV HOST=0.0.0.0
ENV PORT=3001
EXPOSE 3001

CMD ["/app/selaura-api"]
