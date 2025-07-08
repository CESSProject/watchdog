FROM golang:1.23-alpine AS builder

WORKDIR /opt/cess/watchdog

COPY . .
RUN GOOS=linux CGO_ENABLED=0 go build -ldflags '-w -s' -gcflags '-N -l' -o watchdog main.go

FROM alpine:3.18 AS runner
WORKDIR /opt/cess/watchdog
COPY --from=builder /opt/cess/watchdog/watchdog ./watchdog
COPY --from=builder /opt/cess/watchdog/internal/util/template.html ./alert/
ENTRYPOINT ["./watchdog"]
