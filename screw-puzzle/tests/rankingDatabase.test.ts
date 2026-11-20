import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { RANKED_BOARDS, rankedBoardId } from "../src/ranking/rules.ts";
import { topVerifiedResults } from "../src/ranking/results.ts";
import type { VerifiedResult } from "../src/ranking/results.ts";

const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
type PublicBoard = { board_id: string; open: boolean; entries: { place: number; nickname: string; elapsed_ms: number; verified_at: string }[] };

test("Supabase migration enforces ownership, server-only writes, private identities and verified top-ten rules in PostgreSQL", async t => {
  const db = new PGlite();
  t.after(() => db.close());
  // Supabase normally owns these roles and Auth functions. The fixture supplies
  // their contract so real PostgreSQL evaluates the migration's grants and RLS.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    alter default privileges grant all on tables to anon,authenticated,service_role;
    alter default privileges grant all on functions to anon,authenticated,service_role;
    create schema auth;
    create table auth.users (id uuid primary key, email text, is_anonymous boolean not null default false, email_confirmed_at timestamptz);
    revoke all on auth.users from public,anon,authenticated,service_role;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
  `);
  const migrations = new URL("../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(migrations)).filter(name => name.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(name, migrations), "utf8"));
  }
  async function asRole<T>(role: "anon" | "authenticated" | "service_role", userId: string, sql: string, args: unknown[] = []) {
    await db.exec(`set role ${role}`);
    try {
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [userId]);
      return await db.query<T>(sql, args);
    } finally { await db.exec("reset role"); }
  }
  const boardId = rankedBoardId("cottage");
  async function publicBoard() {
    return (await asRole<{ board: PublicBoard }>("service_role", "", "select public.get_ranked_leaderboard($1) as board", [boardId])).rows[0].board;
  }
  const boardRows = (await asRole<{ id: string; active: boolean }>("anon", "", "select id,active from public.ranking_boards")).rows;
  // The historical migration retains the retired board; the runtime manifest
  // excludes it without deleting old database records or rewriting history.
  assert.deepEqual(boardRows.map(row => row.id).sort(), [...RANKED_BOARDS.map(board => board.id), "space:layout-3:generator-1:rules-1:solo"].sort());
  assert.ok(boardRows.every(row => !row.active), "no public boards before the trusted run service exists");
  assert.deepEqual(await publicBoard(), { board_id: boardId, open: false, entries: [] });
  await assert.rejects(asRole("anon", "", "select public.get_ranked_leaderboard($1)", [boardId]));
  await assert.rejects(asRole("authenticated", uuid(1), "select public.get_ranked_leaderboard($1)", [boardId]));
  await assert.rejects(asRole("authenticated", uuid(1), "select ranking_private.get_ranked_leaderboard($1)", [boardId]));

  for (let i = 1; i <= 16; i++) {
    await db.query("insert into auth.users(id,email,is_anonymous,email_confirmed_at) values ($1,$2,$3,$4)",
      [uuid(i), `private-${i}@example.com`, i === 3, i === 3 || i === 4 ? null : "2026-11-19T12:00:00Z"]);
    await asRole("authenticated", uuid(i), "insert into public.player_profiles(id,nickname) values ($1,$2)", [uuid(i), `Player ${i}`]);
  }
  await assert.rejects(asRole("anon", "", "select * from public.player_profiles"));
  await assert.rejects(asRole("authenticated", uuid(1), "select * from auth.users"));
  const own = await asRole<{ id: string }>("authenticated", uuid(1), "select id from public.player_profiles");
  assert.deepEqual(own.rows, [{ id: uuid(1) }]);
  await assert.rejects(asRole("authenticated", uuid(1), "insert into public.player_profiles(id,nickname) values ($1,'Impersonator')", [uuid(99)]));
  await assert.rejects(asRole("authenticated", uuid(2), "update public.player_profiles set nickname='player 1' where id=$1", [uuid(2)]));
  const blockedUpdate = await asRole("authenticated", uuid(1), "update public.player_profiles set nickname='Hijacked' where id=$1 returning id", [uuid(2)]);
  assert.equal(blockedUpdate.rows.length, 0);
  await assert.rejects(asRole("authenticated", uuid(1), "update public.player_profiles set created_at=now() where id=$1", [uuid(1)]));
  await assert.rejects(asRole("authenticated", uuid(1), "update public.ranking_boards set active=true"));
  await assert.rejects(asRole("anon", "", "select * from ranking_private.verified_runs"));
  await assert.rejects(asRole("authenticated", uuid(1), "select * from ranking_private.verified_runs"));

  const insertSql = `insert into ranking_private.verified_runs
    (id,board_id,player_id,puzzle_seed,elapsed_ms,extra_box_uses,find_match_uses,queue_peek_uses,verified_at)
    values ($1,$2,$3,245,$4,3,3,3,$5)`;
  await assert.rejects(asRole("authenticated", uuid(1), insertSql, [uuid(100), boardId, uuid(1), 1, "2026-11-19T12:00:00Z"]));
  await assert.rejects(asRole("service_role", "", insertSql, [uuid(100), boardId, uuid(1), -1, "2026-11-19T12:00:00Z"]));
  await assert.rejects(asRole("service_role", "", "update public.ranking_boards set active=true"));

  const scores: VerifiedResult[] = [];
  for (let i = 1; i <= 16; i++) {
    const elapsedMs = i <= 2 ? 10000 : i === 3 || i === 4 ? 5000 : 10000 + i * 100;
    const verifiedAt = Date.parse("2026-11-19T12:00:00Z") + i * 1000;
    const result = { id: uuid(100 + i), boardId, playerId: uuid(i), elapsedMs, verifiedAt };
    await asRole("service_role", "", insertSql, [result.id, boardId, result.playerId, elapsedMs, new Date(verifiedAt).toISOString()]);
    if (i !== 3 && i !== 4) scores.push(result);
  }
  await asRole("service_role", "", insertSql, [uuid(200), boardId, uuid(1), 20000, "2026-11-19T13:00:00Z"]);
  await assert.rejects(asRole("service_role", "", insertSql, [uuid(200), boardId, uuid(1), 1, "2026-11-19T13:00:00Z"]), "a retried finish cannot overwrite its score");
  assert.equal((await publicBoard()).entries.length, 0, "stored fixtures are hidden on a closed board");
  await db.query("update public.ranking_boards set active=true where id=$1", [boardId]); // Administrator-only rollout.
  const published = await publicBoard(), expected = topVerifiedResults(scores, boardId);
  assert.equal(published.open, true);
  assert.equal(published.entries.length, 10);
  assert.deepEqual(published.entries.map(row => row.place), expected.map(row => row.place));
  assert.deepEqual(published.entries.map(row => row.elapsed_ms), expected.map(row => row.elapsedMs));
  assert.equal(new Set(published.entries.map(row => row.nickname)).size, 10);
  assert.ok(published.entries.every(row => !["Player 3", "Player 4"].includes(row.nickname)));
  assert.deepEqual(Object.keys(published.entries[0]).sort(), ["elapsed_ms", "nickname", "place", "verified_at"]);
  assert.ok(!JSON.stringify(published).includes("@example.com"));

  // A verified new identity linked to a guest keeps the same UUID and result.
  await db.query("update auth.users set is_anonymous=false,email_confirmed_at=now() where id=$1", [uuid(3)]);
  assert.equal((await publicBoard()).entries[0].nickname, "Player 3");
  // Account deletion cascades through its private scores/profile.
  await db.query("delete from auth.users where id=$1", [uuid(3)]);
  assert.ok((await publicBoard()).entries.every(row => row.nickname !== "Player 3"));
});
