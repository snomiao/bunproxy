import WebSocket from "ws";
Bun.serve<{ wsc?: WebSocket; headers: Headers }>({
  fetch(req, server) {
    if (!server.upgrade(req, { data: { headers: req.headers } })) {
      console.log(req.url);
      return fetch(req).catch(
        (err) => new Response(String(err), { status: 500 })
      );
    }
  },
  websocket: {
    open(ws) {
      const headers = ws.data.headers;
      const target = "ws://" + headers.get("host");
      console.log(`  ${target}`);
      headers.delete("upgrade"); // must delete
      headers.delete("sec-websocket-key"); // must delete
      headers.delete("sec-websocket-version"); // must delete
      const wsc = new WebSocket(target, { headers: headers.toJSON() });
      wsc.addEventListener("message", (message) =>
        ws.send(message.data as string)
      );
      wsc.addEventListener("error", (error) => {
        console.error(error), ws.close(1011);
      }); // `1011` means the server encountered an error
      wsc.addEventListener("close", () => {
        ws.close();
      });
      ws.data.wsc = wsc;
    },
    message(ws, message) {
      ws.data.wsc?.send(message);
    },
    close(ws) {
      ws.data.wsc?.close();
    },
  },
});
