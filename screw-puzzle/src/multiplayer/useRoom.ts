import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { RoomCommand, RoomNotice, RoomSnapshot } from "./protocol";
import type { LevelId, MatchBox } from "../game/types";
import { BONUS_SLOT } from "../game/rules";
import { COMPLETED_LIFELINE_MS, PING_COOLDOWN_MS, ROOM_LEVEL_VERSION, ROOM_VERSION_MESSAGE } from "./protocol";
import { collectionPlayback, emptyPlayback, frameDelay } from "./collectionPlayback";
import { mergeLooseParts } from "../scene/loosePhysics";
import type { LooseParts } from "../scene/loosePhysics";

const roomKey = (id: string) => `screw-cottage-room-${id}`;
const endpoint = () => import.meta.env.VITE_ROOM_SERVER ||
  `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/rooms`;
const invitedRoom = () => new URLSearchParams(location.search).get("room");

function setRoomUrl(id?: string) {
  const url = new URL(location.href);
  if (id) url.searchParams.set("room", id);
  else url.searchParams.delete("room");
  history.replaceState(null, "", url);
}

export function useRoom() {
  const [invite, setInvite] = useState(invitedRoom);
  const [request, setRequest] = useState<RoomCommand | null>(() => {
    const id = invitedRoom();
    const token = id && sessionStorage.getItem(roomKey(id));
    return id && token ? { type: "join", room: id, token, levelVersion: ROOM_LEVEL_VERSION } : null;
  });
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [player, setPlayer] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [disconnectedAt, setDisconnectedAt] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [matched, setMatched] = useState(0);
  const [playback, dispatchPlayback] = useReducer(collectionPlayback, emptyPlayback);
  const [completedLifeline, setCompletedLifeline] = useState<{ round: number; box: MatchBox } | null>(null);
  const [ping, setPing] = useState<{ round: number; screw: string; sequence: number; own: boolean } | null>(null);
  const [blocked, setBlocked] = useState<{ screw: string; sequence: number; reason: string; round: number } | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [latency, setLatency] = useState<{ ms: number; at: number } | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const onlineParts = useRef<LooseParts>({});
  const activeRoom = useRef<string | null>(null);
  const lastPingAt = useRef(-Infinity);
  const entry = playback.queue[0];
  const bonusAnimating = playback.queue.some(({ frame }) => frame.slot === BONUS_SLOT);
  const showPing = useCallback((round: number, screw: string, own: boolean) => {
    setPing((previous) => ({ round, screw, own, sequence: (previous?.sequence ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    if (!entry) return;
    const timer = window.setTimeout(() => dispatchPlayback({ type: "advance", entry }), frameDelay(entry, performance.now()));
    return () => window.clearTimeout(timer);
  }, [entry]);

  useEffect(() => {
    if (!request) return;
    let disposed = false;
    let join = request;
    let retry: number | undefined;
    let clock: number | undefined;
    let lifelineAnimation: number | undefined;
    let attempts = 0;
    let bestRtt = Infinity;
    let sampledClock = false;
    let physicsRound: number | undefined;
    let connection: WebSocket | null = null;

    function connect() {
      if (disposed) return;
      try {
        connection = new WebSocket(endpoint());
      } catch {
        setError("The room server address is invalid.");
        setRequest(null);
        return;
      }
      const ws = connection;
      socket.current = ws;
      const pendingClocks = new Map<number, number>();
      const roundTrips: number[] = [];
      function syncClock() {
        if (ws.readyState !== WebSocket.OPEN) return;
        const sentAt = Date.now();
        pendingClocks.set(sentAt, performance.now());
        // Bound outstanding probes if replies stop arriving.
        if (pendingClocks.size > 4) pendingClocks.delete(pendingClocks.keys().next().value!);
        ws.send(JSON.stringify({ type: "clock", sentAt }));
      }
      ws.onopen = () => {
        setLatency(null);
        syncClock();
        ws.send(JSON.stringify(join));
        clock = window.setInterval(syncClock, 4500);
      };
      ws.onmessage = (event) => {
        if (disposed || ws !== socket.current) return;
        const notice = JSON.parse(event.data) as RoomNotice;
        if (notice.type === "clock") {
          const received = Date.now();
          const sent = pendingClocks.get(notice.sentAt);
          if (sent === undefined) return;
          pendingClocks.delete(notice.sentAt);
          roundTrips.push(Math.max(0, performance.now() - sent));
          if (roundTrips.length > 3) roundTrips.shift();
          const sorted = [...roundTrips].sort((a, b) => a - b);
          setLatency({ ms: Math.round(sorted[Math.floor(sorted.length / 2)]), at: received });
          const rtt = received - notice.sentAt;
          if (rtt <= bestRtt + 8) {
            bestRtt = Math.min(rtt, bestRtt);
            sampledClock = true;
            setClockOffset(notice.serverTime - (received + notice.sentAt) / 2);
          }
        } else if (notice.type === "joined") {
          if (notice.snapshot.levelVersion !== ROOM_LEVEL_VERSION) {
            ws.send(JSON.stringify({ type: "leave" }));
            setError(ROOM_VERSION_MESSAGE);
            setRequest(null);
            return;
          }
          const id = notice.snapshot.id;
          activeRoom.current = id;
          setRoomUrl(id);
          setInvite(id);
          sessionStorage.setItem(roomKey(id), notice.token);
          join = { type: "join", room: id, token: notice.token, levelVersion: ROOM_LEVEL_VERSION };
          attempts = 0;
          if (!sampledClock) setClockOffset(notice.snapshot.serverTime - Date.now());
          setPlayer(notice.player);
          physicsRound = notice.snapshot.round;
          onlineParts.current = notice.snapshot.looseParts;
          dispatchPlayback({ type: "reset", scene: `${id}:${notice.snapshot.round}` });
          setSnapshot(notice.snapshot);
          setConnected(true);
          setDisconnectedAt(null);
          setError("");
        } else if (notice.type === "state") {
          if (notice.snapshot.levelVersion !== ROOM_LEVEL_VERSION) return;
          setError("");
          onlineParts.current = mergeLooseParts(physicsRound === notice.snapshot.round ? onlineParts.current : {}, notice.snapshot.looseParts);
          physicsRound = notice.snapshot.round;
          setSnapshot(notice.snapshot);
          dispatchPlayback({ type: "receive", scene: `${notice.snapshot.id}:${notice.snapshot.round}`,
            moves: notice.moves, receivedAt: performance.now() });
          if (!notice.moves && notice.matched) setMatched((count) => count + 1);
          if (!notice.moves && notice.completedLifeline) {
            setCompletedLifeline({ round: notice.snapshot.round, box: notice.completedLifeline });
            window.clearTimeout(lifelineAnimation);
            lifelineAnimation = window.setTimeout(() => setCompletedLifeline(null), COMPLETED_LIFELINE_MS);
          }
        } else if (notice.type === "physics") {
          if (notice.round === physicsRound) onlineParts.current = mergeLooseParts(onlineParts.current, notice.looseParts);
        } else if (notice.type === "ping") {
          showPing(notice.round, notice.screw, false);
        } else if (notice.screw) {
          setBlocked((previous) => ({ screw: notice.screw!, sequence: (previous?.sequence ?? 0) + 1,
            reason: notice.reason, round: physicsRound ?? -1 }));
        } else {
          setError(notice.reason);
          if (ws === socket.current && !activeRoom.current) {
            if (join.type === "join") sessionStorage.removeItem(roomKey(join.room));
            setRequest(null);
          } else if (notice.reason === ROOM_VERSION_MESSAGE || notice.reason.includes("seat expired") || notice.reason.includes("room has closed")) {
            if (join.type === "join") sessionStorage.removeItem(roomKey(join.room));
            setRequest(null);
          }
        }
      };
      ws.onclose = (event) => {
        window.clearInterval(clock);
        if (disposed || ws !== socket.current) return;
        socket.current = null;
        setConnected(false);
        setDisconnectedAt((previous) => previous ?? Date.now());
        if (event.code === 4001 || event.code === 1008) {
          setError(event.code === 4001 ? "Your seat was opened in another tab." : "The room server rejected the connection.");
          setRequest(null);
        } else if (!activeRoom.current && ++attempts >= 3) {
          setError("Couldn’t connect to the room server.");
          setRequest(null);
        } else {
          bestRtt = Infinity;
          sampledClock = false;
          if (activeRoom.current) attempts += 1;
          retry = window.setTimeout(connect, Math.min(5000, 500 * 2 ** attempts));
        }
      };
    }
    connect();
    return () => {
      disposed = true;
      window.clearInterval(clock);
      window.clearTimeout(retry);
      window.clearTimeout(lifelineAnimation);
      if (socket.current === connection) socket.current = null;
      connection?.close();
    };
  }, [request, showPing]);

  const send = useCallback((command: RoomCommand) => {
    const ws = socket.current;
    if (ws?.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(command));
    return true;
  }, []);

  function pingScrew(round: number, screw: string) {
    const now = performance.now();
    if (now - lastPingAt.current < PING_COOLDOWN_MS || !send({ type: "ping", round, screw })) return false;
    lastPingAt.current = now;
    showPing(round, screw, true);
    return true;
  }
  function open(level: LevelId = "cottage") {
    setError("");
    setRequest(invite ? { type: "join", room: invite, levelVersion: ROOM_LEVEL_VERSION } :
      { type: "create", level, levelVersion: ROOM_LEVEL_VERSION });
  }
  function leave() {
    send({ type: "leave" });
    if (activeRoom.current) sessionStorage.removeItem(roomKey(activeRoom.current));
    activeRoom.current = null;
    setRoomUrl();
    setInvite(null);
    setRequest(null);
    setConnected(false);
    setLatency(null);
    setSnapshot(null);
    onlineParts.current = {};
    setPlayer(null);
    setError("");
    setPing(null);
    setCompletedLifeline(null);
    dispatchPlayback({ type: "reset", scene: "" });
    setBlocked(null);
  }
  return { invite, snapshot, player, connected, latency, disconnectedAt, error, matched, completedLifeline, ping, pingScrew,
    frame: entry?.frame ?? null, bonusAnimating, blocked, clockOffset, onlineParts, send, open, leave,
    connecting: Boolean(request && !connected && !snapshot) };
}
