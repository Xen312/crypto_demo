/* ==================================================
   WEBSOCKET CLIENT
================================================== */

export function createSocket(onMessage) {
  const ws = new WebSocket(
    location.protocol === "https:"
      ? `wss://${location.host}`
      : `ws://${location.host}`
  );

  ws.onmessage = e => {
    const data = JSON.parse(e.data);
    onMessage(data);
  };

  return ws;
}
