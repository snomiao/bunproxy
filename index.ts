import http from "http";
import httpProxy from "http-proxy";
process.addListener("uncaughtException", (e) =>
  console.error("Catched error", e)
);

const proxy = httpProxy.createProxyServer({ ws: true, autoRewrite: true });

// clean up
proxy.on("error", (err) => console.error(err));
proxy.on("proxyRes", (proxyRes, req, res) => {
  const cleanup = (err: Error) => {
    // cleanup event listeners to allow clean garbage collection
    proxyRes.removeListener("error", cleanup);
    proxyRes.removeListener("close", cleanup);
    res.removeListener("error", cleanup);
    res.removeListener("close", cleanup);

    // destroy all source streams to propagate the caught event backward
    req.destroy(err);
    proxyRes.destroy(err);
  };

  proxyRes.once("error", cleanup);
  proxyRes.once("close", cleanup);
  res.once("error", cleanup);
  res.once("close", cleanup);
});

// create server
const server = http.createServer((req, res) => {
  const targetHost = hostRecognize(req);
  if (!targetHost) return;
  console.log(targetHost, req.headers.host);
  if (targetHost === req.headers.host) return res.end("hello from sno-proxy"); // it's usually health check
  // if (!targetHost.startsWith("vscode")) return res.end("incorrect host");
  const xfh = req.headers["x-forwarded-host"]?.toString() ?? undefined;
  const xfp = req.headers["x-forwarded-proto"]?.toString() ?? undefined;
  // console.log(req.headers, "XP");
  proxy.web(req, res, {
    target: "http://" + targetHost,
    headers: {
      "X-Powered-By": "sno-port-forwarder",
      ...(xfh && { "X-Forwarded-host": xfh }),
      ...(xfh && { "X-X-Forwarded-host": xfh }),
      ...(xfp && { "X-Forwarded-proto": xfp }),
      ...(xfp && { "X-X-Forwarded-proto": xfp }),
    },
  });
});

server.on("upgrade", (req, socket, head) => {
  const targetHost = hostRecognize(req);
  if (!targetHost) return;
  proxy.ws(req, socket, head, { target: "http://" + targetHost });
});

server.on("error", (err) => console.error(err));

const port = Number(process.env.PORT || 9096);
server.listen(port, "0.0.0.0", () => {
  console.log(`listening on port ${port} v3`);
});

/**
 * https://80-${docker-container-name}.snomiao.dev
 */
function hostRecognize(req: http.IncomingMessage) {
  const groups =
    // req.headers.host?.match(/^((?<port>\d+)-)?(?<host>[a-z0-9]+?)\..*/)
    req.headers.host?.match(/^(?<host>[a-z0-9]+?)(-(?<port>\d+))?\..*/)
      ?.groups || {};
  // if
  // const port = "80"; // disable other ports
  const port = String(groups.port ?? "80");
  if (!["8080", "80", "3000"].includes(port)) return undefined;
  const queryHost = groups.host;
  if (!queryHost) {
    console.log("host not matched:", req.headers.host);
    return undefined;
  }
  if (queryHost.endsWith("-internal")) return "localhost:" + port; // block
  if (queryHost === "localhost") return "localhost:" + port;
  const host = queryHost
    // .replace(/^code$/, process.env.BASEHOST || "localhost")
    .replace(/(\d+)-(\d+)-(\d+)-(\d+)/, (_, ...ip) => ip.join("."));
  const target = host + ":" + port;
  console.log(`HOST ${host} ${target} > ${req.headers.host}${req.url}`);
  return target;
}

setTimeout(() => {
  console.log("Restarting...");
  process.exit(0);
}, 86400e3); // restart every 1day, to prevent and watch memory leak
