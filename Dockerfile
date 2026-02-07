FROM golang:1.25-alpine@sha256:f4622e3bed9b03190609db905ac4b02bba2368ba7e62a6ad4ac6868d2818d314 AS gobase

RUN apk add --no-cache git
RUN go install github.com/air-verse/air@latest
RUN go install github.com/a-h/templ/cmd/templ@latest

FROM ghcr.io/jwhumphries/frontend:latest@sha256:8ce9daca16de041f7df55cea9a0aad3be96c90da431092647c1070d060c451c3 AS dev

WORKDIR /app

COPY --from=gobase /usr/local/go /usr/local/go
COPY --from=gobase /go/bin/air /usr/local/bin/air
COPY --from=gobase /go/bin/templ /usr/local/bin/templ

ENV PATH="/usr/local/go/bin:${PATH}"
ENV GOPATH="/go"
ENV GOCACHE=/go-build-cache
ENV GOMODCACHE=/go/pkg/mod

COPY scripts/develop.sh /develop.sh
RUN chmod +x /develop.sh

EXPOSE 8080 3000

CMD ["/develop.sh"]
