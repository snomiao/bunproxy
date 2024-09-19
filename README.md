# Bun Proxy

Domain-based Port forwarder with http&websockets supported, proxy server is powerd by Bun.

## Quick Setup

bunx pm2 start --name bunproxy bunx -- bunproxy 8228
bunx pm2 monit

## Use cases

### 1. Port forwarding with Caddy + bunproxy

-> browser request: https://host-port.example.com
-> Caddy listen on https://*.example.com/ with auto TLS
-> Set `Host: $host:$port` header
-> proxy to http://bunproxy
-> http://host:port
-> served contents

### 2. Reverse proxy

-> browser request: https://service.host.example.com
-> Caddy listen on https://*.host.example.com/ with auto TLS
-> Set `Host: localhost:$port` header to the service.
-> proxy to http://bunproxy
-> http://localhost:port
-> served contents

## Setup

### Example:1 Setup your HTTPS Local network port forwarder with Caddy + bunproxy

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

## Contributing

We welcome contributions from the community to make Bun Proxy better! Whether you're fixing bugs, adding new features, improving documentation, or raising issues, we appreciate your help. Here’s how you can get started:

### Code of Conduct

Please adhere to our [Code of Conduct](CODE_OF_CONDUCT.md) in all your interactions. Everyone is expected to be respectful and considerate in their communications.

### How to Contribute

1. **Fork the repository**: Click the "Fork" button on the top right of the repository page and clone your fork locally.
    ```bash
    git clone https://github.com/your-username/bunproxy.git
    cd bunproxy
    ```

2. **Create a branch**: Make a new branch for your feature or bug fix.
    ```bash
    git checkout -b your-branch-name
    ```

3. **Make your changes**: Do your work on this branch. Make sure your code follows our style guidelines and includes tests where applicable.

4. **Install dependencies**: Ensure you have the dependencies installed using Bun.
    ```bash
    bun install
    ```

5. **Run the tests**: Make sure all tests pass before creating a pull request.
    ```bash
    bun run test
    ```

6. **Commit your changes**: Write a clear and concise commit message describing your changes.
    ```bash
    git commit -m "Description of your changes"
    ```

7. **Push to your fork**: Push your changes to your forked repository.
    ```bash
    git push origin your-branch-name
    ```

8. **Create a pull request**: Go to the original repository and create a pull request. Provide a brief description of the changes you made and why they're important.

### Reporting Issues

If you encounter a bug or have a feature request, please create an issue on the repository’s issue tracker. Please provide as much detail as possible to help us understand and address the problem.

### Development

To run the project locally, use the following commands:

1. Install dependencies:
    ```bash
    bun install
    ```

2. Run the development server:
    ```bash
    bun run index.ts
    ```

### Style Guidelines

We follow the standard JavaScript/TypeScript coding styles. Ensure your code passes all linting checks before submission.

### License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! Your help is much appreciated.