FROM golang:1.26-alpine@sha256:f23e8b227fb4493eabe03bede4d5a32d04092da71962f1fb79b5f7d1e6c2a17f AS gobase

RUN apk add --no-cache git
RUN go install github.com/air-verse/air@latest
RUN go install github.com/a-h/templ/cmd/templ@latest

FROM ghcr.io/jwhumphries/frontend:latest@sha256:10e1e026cd8d6780997f921eff88d2338d5f521cd67f3158a84a4b45337bc34d AS dev

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
