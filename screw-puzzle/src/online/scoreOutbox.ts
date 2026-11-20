import { isCasualFinish, isPlayerId } from "../game/casualLeaderboard.ts";
import type { CasualFinish } from "../game/casualLeaderboard.ts";
export const FINISH_OUTBOX_KEY = "screw-it:casual-finish-outbox:v1";
export const SCORES_CHANGED = "screw-it:scores-changed";
export type PendingFinish = { playerId: string; finish: CasualFinish; status: "pending" | "name" | "failed"; message: string };
type Store = { getItem(key: string): string | null; setItem(key: string,value: string): void };
export class FinishOutbox {
  private memory: PendingFinish[] = []; private memoryOnly = false;
  constructor(privateStore?: Store, privateNotify: () => void = () => {}) { this.store = privateStore; this.notify = privateNotify; }
  private store?: Store; private notify: () => void;
  private read(): PendingFinish[] {
    if (this.memoryOnly || !this.store) return this.memory;
    try {
      const values: unknown = JSON.parse(this.store.getItem(FINISH_OUTBOX_KEY) ?? "[]");
      return Array.isArray(values) ? values.filter((v): v is PendingFinish => Boolean(v && typeof v === "object" && isPlayerId(v.playerId) && isCasualFinish(v.finish) &&
        ["pending","name","failed"].includes(v.status) && typeof v.message === "string" && v.message.length <= 200)).slice(0,500) : [];
    } catch { return this.memory; }
  }
  private write(values: PendingFinish[]) {
    this.memory = values;
    try { this.store?.setItem(FINISH_OUTBOX_KEY,JSON.stringify(values)); } catch { this.memoryOnly = true; }
    this.notify();
  }
  list(playerId: string) { return this.read().filter(item => item.playerId === playerId); }
  snapshot() { return JSON.stringify(this.read()); }
  add(playerId: string, finish: CasualFinish) {
    if (!isPlayerId(playerId) || !isCasualFinish(finish)) throw new Error("Invalid completed result.");
    const values = this.read(), old = values.find(item => item.playerId === playerId && item.finish.runId === finish.runId);
    if (old) { if (JSON.stringify(old.finish) !== JSON.stringify(finish)) throw new Error("Finish ID conflict."); return; }
    if (values.length >= 500) throw new Error("Online result queue is full. Try uploading pending results first.");
    this.write([...values,{playerId,finish,status:"pending",message:""}]);
  }
  update(playerId: string, runId: string, status: PendingFinish["status"], message: string) {
    const values = this.read();
    if (values.some(item => item.playerId === playerId && item.finish.runId === runId && (item.status !== status || item.message !== message)))
      this.write(values.map(item => item.playerId === playerId && item.finish.runId === runId ? {...item,status,message} : item));
  }
  remove(playerId: string, runId: string) {
    const values = this.read(), kept = values.filter(item => item.playerId !== playerId || item.finish.runId !== runId);
    if (kept.length !== values.length) this.write(kept);
  }
  retry(playerId: string) {
    const values = this.read();
    if (values.some(item => item.playerId === playerId && (item.status !== "pending" || item.message)))
      this.write(values.map(item => item.playerId === playerId ? {...item,status:"pending",message:""} : item));
  }
}
let store: Store | undefined;
try { store = window.localStorage; } catch { /* A private browser can deny storage. */ }
export const finishOutbox = new FinishOutbox(store,() => { if (typeof window !== "undefined") window.dispatchEvent(new Event(SCORES_CHANGED)); });
export async function withOutboxLock<T>(task: () => T | Promise<T>): Promise<T> {
  return typeof navigator !== "undefined" && navigator.locks ? navigator.locks.request(FINISH_OUTBOX_KEY,task) : task();
}
