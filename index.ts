#!/usr/bin/env bun
// import WebSocket from "ws";

if (import.meta.main) {
  const port = Number(process.argv[2] || process.env.BUNPROXY_PORT || 9097);
  console.log(`bunproxy listing http://localhost:${port}`);
  bunProxy(port, process.env.AUTHORIZATION);
}

export function bunProxy(port: number, auth?: string) {
  type BunProxy = {
    proxy2server?: WebSocket;
    req: Request;
  };

  // ws: b2p, p2s
  return Bun.serve<BunProxy>({
    port,
    async fetch(req, server) {
      console.debug(`> ${req.method} ${req.url}`);
      // const req = new Request(_req.url, {body: _req.body})
      if (auth && auth !== req.headers.get("Authorization")) {
        console.debug(`< ${req.method} ${req.url} [401]`);
        return new Response(null, { status: 401 });
      }
      if (server.upgrade(req, { data: { req } })) {
        console.debug(`> ${req.method} ${req.url} UPGRADED`);
        return;
      }
      return fetch(req.url, {
        //
        headers: req.headers,
        body: await new Response(req.body!).blob(),
        //
        redirect: "manual",
        credentials: "include",
        method: req.method,
      })
        .then((res) => {
          console.debug(`< ${req.method} ${req.url} [${res.status}]`);
          // hack for bug: decoding error
          res.headers.delete("Content-Encoding");
          return res;
        })
        .catch((err) => {
          console.error(String(err));
          return new Response(String(err), { status: 500 });
        });
    },
    websocket: {
      open(browser2proxy) {
        const req = browser2proxy.data.req;
        // console.log(req);
        const headers = req.headers;
        const url = req.url.replace(/^http/, "ws");
        console.debug(`> OPEN ${url}`);
        headers.delete("upgrade"); // must delete
        headers.delete("sec-websocket-key"); // must delete
        headers.delete("sec-websocket-version"); // must delete
        // headers
        const wsc = new WebSocket(url, {
          // @ts-ignore
          headers: new Headers(headers),
        });
        wsc.addEventListener("message", (message) => {
          // console.log("message");
          browser2proxy.send(message.data as string);
        });
        wsc.addEventListener("error", (error) => {
          // console.log("error");
          console.error(error), browser2proxy.close(1011);
        }); // `1011` means the server encountered an error
        wsc.addEventListener("close", () => {
          // console.debug(`< ${url} closed`);
          // hack: bug
          browser2proxy?.close();
        });
        browser2proxy.data.proxy2server = wsc;
      },
      message(ws, message) {
        try {
          ws.data.proxy2server?.send(message);
        } catch (error) {
          console.log("error", error);
        }
      },
      close(ws, code, reason) {
        // console.log("client closed " + code + " " + reason);
        ws.data.proxy2server?.close();
      },
    },
  });
}
