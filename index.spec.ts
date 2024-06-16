#!/usr/bin/env bun
import WebSocket from "ws";
import { bunProxy } from ".";
import getPort from "get-port";
console.clear();
describe("bunproxy http", async () => {
  // echo server A on localhost
  const echoPort = await getPort();
  const echo = Bun.serve({
    port: echoPort,
    fetch: (req) => new Response(req.body),
  });
  afterAll(() => echo.stop(true));
  it("http echo", async () => {
    const port = await getPort();
    const proxy = bunProxy(port);

    const msg = await (
      await fetch("http://localhost:" + port, {
        headers: { Host: `localhost:${echoPort}` },
        method: "post",
        body: "hello",
      })
    ).text();
    expect(msg).toBe("hello");
    proxy.stop(true);
  });
  it("auth fail", async () => {
    const port = await getPort();
    const proxy = bunProxy(port, "Bearer 123");

    const res = await fetch("http://localhost:" + port + "/admin", {
      headers: { Host: `localhost:${echoPort}` },
      method: "post",
      body: "hello",
    });
    const msg = await res.text();
    expect(res.status).toBe(401);
    expect(msg).not.toBe("hello");
    proxy.stop(true);
  });
});

describe("ws", async () => {
  // echo server A on localhost
  const echoPort = 8639; //await getPort();
  const wsEcho = Bun.serve<any>({
    port: echoPort,
    fetch: (req, server) => {
      console.debug(`[ECHO] ${req.method} ${req.url}`);
      if (server.upgrade(req, { data: { req } })) {
        console.debug(`[ECHO] ${req.method} ${req.url} UPGRADED`);
        return;
      }
      // throw "fail to upgrade ws connection";
      return new Response("Method Not allowed", { status: 405 });
    },
    websocket: {
      open(ws) {
        console.log("Echo server open");
        throw "";
      },
      message(ws, message) {
        throw "";
        console.log("Echo server received message", message);
        ws.send(message);
      },
    },
  });
  //   afterAll(() => wsEcho.stop(true));

  // TODO: proxy it's working, fix this test, 
  it.skip("ws echo", async () => {
    const port = 16574; //await getPort();
    const proxy = bunProxy(port);
    const ws = new WebSocket("ws://localhost:" + port, {
      headers: { Host: `localhost:${echoPort}` },
    });

    ws.send("hello");
    const msg = await new Promise((r) => ws.once("message", r));
    expect(msg).toBe("hello");
    // pm2 start --interpreter ~/.bun/bin/bun index.ts

    ws.close();
    // const msg = await new Promise((r) => ws.addEventListener("message", r));
    // const msg = await new Promise((r) => {
    //   console.log("waiting for message");
    //   ws.addEventListener("message", r);
    // });
    // expect(msg).toBe("hello");
    // ws.close();
    proxy.stop(true);
  });
  it("no http", async () => {
    const port = await getPort();
    const proxy = bunProxy(port);
    const res = await fetch("http://localhost:" + port, {
      headers: { Host: `localhost:${echoPort}` },
    });
    expect(res.status).toBe(405);
    proxy.stop(true);
  });
});
