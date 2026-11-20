import assert from "node:assert/strict";
import { test } from "node:test";
import { soloRoute, soloRouteUrl } from "../src/game/soloRoute.ts";

test("casual refresh routes identify only playable levels and defer to room invites", () => {
  assert.equal(soloRoute("https://game.example/?level=desert"), "desert");
  for (const query of ["", "?level=space", "?level=titanic", "?level=unknown", "?room=invite&level=desert"]) {
    assert.equal(soloRoute(`https://game.example/${query}`), null);
  }
  const active = soloRouteUrl("https://game.example/?code=temporary#return", "zoo");
  assert.equal(soloRoute(active), "zoo");
  assert.equal(new URL(active).searchParams.get("code"), "temporary");
  assert.equal(soloRouteUrl(active, null), "https://game.example/?code=temporary#return");
});
