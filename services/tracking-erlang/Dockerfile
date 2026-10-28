FROM erlang:27-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git wget
COPY rebar.config ./
COPY src/ ./src/
RUN wget https://s3.amazonaws.com/rebar3/rebar3 && chmod +x rebar3 && ./rebar3 compile

FROM erlang:27-alpine AS runner
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/_build/default/lib/ /app/lib/

USER appuser
EXPOSE 8090

CMD ["/bin/sh", "-c", "exec erl -pa /app/lib/*/ebin -noshell -noinput -eval 'application:ensure_all_started(tracking), receive stop -> ok end.'"]
