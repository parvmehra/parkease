import "dotenv/config";
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { subscriber } from "../shared/index.js";
import { EVENTS } from "../shared/events.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("Missing required environment variable: JWT_SECRET");
}
const port = process.env.WS_PORT || 4445;
const wss = new WebSocketServer({ port });

const userSockets = new Map();
const lotSockets = new Map();

function addToMapSet(map, key, ws) {
  if (!key) return;
  const id = String(key);
  if (!map.has(id)) map.set(id, new Set());
  map.get(id).add(ws);
}

function removeFromMapSet(map, key, ws) {
  if (!key) return;
  const id = String(key);
  const sockets = map.get(id);
  if (!sockets) return;
  sockets.delete(ws);
  if (sockets.size === 0) map.delete(id);
}

function send(ws, type, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

function collect(map, key, targets) {
  const sockets = map.get(String(key));
  if (!sockets) return;
  for (const ws of sockets) targets.add(ws);
}

wss.on("connection", (ws, req) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const token = parsedUrl.searchParams.get("token");
  const lotId = parsedUrl.searchParams.get("lotId");

  if (!token) {
    ws.close(4001, "Unauthorized: No token provided");
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    ws.close(4003, "Unauthorized: Token verification failed");
    return;
  }

  if (!decoded?.userId) {
    ws.close(4002, "Unauthorized: Invalid token");
    return;
  }

  ws.userId = String(decoded.userId);
  ws.lotId = lotId ? String(lotId) : null;

  addToMapSet(userSockets, ws.userId, ws);
  addToMapSet(lotSockets, ws.lotId, ws);
  send(ws, "connection.ready", { userId: ws.userId, lotId: ws.lotId });

  ws.on("close", () => {
    removeFromMapSet(userSockets, ws.userId, ws);
    removeFromMapSet(lotSockets, ws.lotId, ws);
  });
});

// Events broadcast to everyone watching a lot's layout must carry no
// private booking details (who booked, price); everything else is
// delivered only to the specific customer/vendor it concerns.
const LOT_BROADCAST_EVENTS = new Set([EVENTS.SLOT_STATUS_UPDATED, EVENTS.PARKING_LOT_UPDATED]);

function handleEvent(type, message) {
  const payload = JSON.parse(message);
  const targets = new Set();
  if (payload.vendorId) collect(userSockets, payload.vendorId, targets);
  if (payload.userId) collect(userSockets, payload.userId, targets);
  if (payload.lotId && LOT_BROADCAST_EVENTS.has(type)) collect(lotSockets, payload.lotId, targets);
  for (const ws of targets) send(ws, type, payload);
}

async function subscribeToEvents() {
  try {
    for (const channel of Object.values(EVENTS)) {
      await subscriber.subscribe(channel, (message) => handleEvent(channel, message));
    }
  } catch (err) {
    console.error("Could not subscribe to Redis channels:", err.message);
  }
}

subscriber.on("ready", subscribeToEvents);
await subscribeToEvents();

console.log(`WebSocket server started on port ${port}`);
