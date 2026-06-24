FROM golang:1.26-alpine@sha256:3ad57304ad93bbec8548a0437ad9e06a455660655d9af011d58b993f6f615648 AS gobase

RUN apk add --no-cache git
RUN go install github.com/air-verse/air@latest
RUN go install github.com/a-h/templ/cmd/templ@v0.3.1020

FROM ghcr.io/jwhumphries/frontend:latest@sha256:6b5be63918e393d69ff13af49fec955d383ca378f7512db739e2a3c593feb991 AS dev

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
