FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o market-data-service ./cmd/market-data-service

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/market-data-service ./market-data-service
EXPOSE 4100
CMD ["./market-data-service"] 