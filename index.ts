#!/usr/bin/env bun
import WebSocket from "ws";
const port = Number(process.env.BUNPROXY_PORT || 8228);
console.log(port);
const auth = process.env.AUTHORIZATION;
// ws: b2p, p2s
Bun.serve<{ p2s?: WebSocket; req: Request }>({
  port,
  async fetch(req, server) {
    if (auth && auth !== req.headers.get("Authorization"))
      return new Response(null, { status: 401 });
    // req=req.clone()
    if (server.upgrade(req, { data: { req } })) return undefined;
    // req = req.clone();
    console.log(`> ${req.url}`);
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
    open(b2p) {
      const req = b2p.data.req;
      console.log(b2p.data);
      const headers = req.headers;
      const url = req.url;
      const target = url.replace(/^http/, "ws");
      console.log(`>   ${target}`);
      headers.delete("upgrade"); // must delete
      headers.delete("sec-websocket-key"); // must delete
      headers.delete("sec-websocket-version"); // must delete
      // headers
      const wsc = new WebSocket(target, { headers: headers.toJSON() });
      wsc.addEventListener("message", (message) => {
        // console.log("message");
        b2p.send(message.data as string);
      });
      wsc.addEventListener("error", (error) => {
        // console.log("error");
        console.error(error), b2p.close(1011);
      }); // `1011` means the server encountered an error
      wsc.addEventListener("close", () => {
        console.log("server closed");
        // hack: bug
        b2p.close();
      });
      b2p.data.p2s = wsc;
    },
    message(ws, message) {
      ws.data.p2s?.send(message);
    },
    close(ws) {
      console.log("client closed");
      ws.data.p2s?.close();
    },
  },
});
