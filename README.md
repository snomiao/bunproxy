# Bun Proxy

Simple http + websockets proxy server, powerd by - [Bun — A fast all-in-one JavaScript runtime]( https://bun.sh/ ) without dependencies

## Use cases

### Setup your HTTPS Local network port forwarder with Caddy + bunproxy

1. Create Caddyfile

`Caddyfile`

```caddy
*.fbi.com {
	tls internal
	# match host
	@proxyhostport header_regexp hostport Host ([A-Za-z0-9-]+?)-([0-9]+)\.fbi.com
    @proxyhostonly header_regexp hostport Host ([A-Za-z0-9-]+?)\.fbi.com
    #
	reverse_proxy @proxyhostport http://bunproxy:9097 {
		header_up Host {re.hostport.1}:{re.hostport.2}
	}
	reverse_proxy @proxyhostonly http://bunproxy:9097 {
		header_up Host {re.hostport.1}:80
	}
	reverse_proxy http://bunproxy:9097
}
```

`docker-compose.yml`

```yml
services:
  caddy:
    image: caddy
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
    ports: [443:443, 80:80]
  bunproxy:
    restart: always
    build: .
    image: ghcr.io/snomiao/bunproxy
    # dev
    working_dir: /src
    command: bun --hot /src/index.ts
    volumes:
      - ./:/src
    environment:
      - PORT=9097
  nginx:
    image: nginx
  pong:
    image: caddy
    command: caddy respond --listen :2000-2004 "I'm server {{.N}} on port {{.Port}}"
```

Test your services by:

```bash
# without port, defaults to 80
curl -k https://nginx.fbi.com:8443

# with port
curl -k https://nginx-80.fbi.com:8443

# with port
curl -k https://pong-2000.fbi.com:8443

# with port
curl -k https://pong-2001.fbi.com:8443
```

## Development

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.0.22. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

Caddy config

## License

MIT
