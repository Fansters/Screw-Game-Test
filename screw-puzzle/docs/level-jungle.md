# Jungle Temple — Easy Level 2

The reference becomes a lush, dismantlable sun temple with substantial masonry, red-and-gold banners, wooden doors hiding an idol, broad steps, treehouse and rope bridge, two waterfalls and a turquoise stream, fallen stone face, explorer tent and supplies, treasure chests, a toucan, monkey, frog, ferns, vines and flowers. Low planting fills the stone island without adding a fixing to every leaf.

## Detail and difficulty

| Measure | New level |
| --- | --- |
| Screws / removable assemblies | 144 / 144 |
| Screw colours | Six existing colours; 24 screws each |
| Decorative geometry pieces | 2,758 |
| Scenery triangles | 327,468, excluding shared screws/title |
| Initially visible across sampled orbit views | 58 / 144 (40.28%) |
| Physically clear extraction before a camera test | 67 / 144 |
| Assemblies with 0–2 covers in extraction chains | 117 / 144 (81.3%) |
| Constructed winning route | Zero waiting slots; no lifelines required |

Most reveals are shallow, while structural foundations can have longer chains (maximum 6). This is a typical-depth target, not a universal two-cover limit. Opening colours each have at least three visible heads. The preserved colour-proof frontier uses 3–5; newly corrected physical access can reveal additional matching heads. Six colours and complete triples on the reachable frontier make this more forgiving than Hard; arbitrary player choices can still lose. These measurements do not predict human completion rates or guarantee every sequence wins.

Each large tree uses two assemblies: trunk/branches/roots and canopy/vines. Every assembly has one well-spaced fixing. Screws also face sides, interiors and undersides; lower difficulty does not require everything to face upward. Small decorative meshes share their assembly's physics and disappear with it.

## How it is built

1. `src/scene/junglePlan.ts` defines the geometry-free positions, sizes and contact intentions of 144 assemblies.
2. `src/scene/jungleModel.ts` builds shared rounded masonry, curved vines, curled double-sided leaves, cloth, ropes, small animal shapes and detailed props in Three.js. Fixings project onto actual geometry. Sparse rails use real timber contacts, not invisible mounting pads.
3. `node tools/audit_jungle.ts` derives real extraction blockers and orbit-sampled visibility and writes `jungleAudit.ts` plus `jungle-difficulty.json`. It refuses to cache a circular or out-of-budget scene. Cover labels guide construction, but only actual geometry controls removability.
4. The Jungle-only Easy profile colours a reachable route and replays it through the real matching-box rules. Existing worlds keep their historical generation inputs and saved seeds.
5. Browser artwork loads only after selection. Source and merged GPU buffers are released on exit. The Node room server preloads the world for deterministic co-op rules. Google cloud checkpoints and the public casual board use stable ID `jungle`, layout 2, independently of its displayed Easy number.

## Checks performed

- Thirty fresh seeded complete wins, initial-colour availability and zero-tray constructed routes.
- All heads attached to geometry, spacing, regenerated blocker-cache comparison and a complete solution with a clear camera path at each step.
- All 144 Rapier owners and one-second poof; checkpoint restoration; lazy load/disposal/rebuild.
- Full two-seat solve, reconnect and same-room ready-up; actual WebSocket removal, reserved-colour rejection, ping, hint and clock probe.
- PostgreSQL tests for exact 144-screw public submissions and account cloud checkpoint permissions. The additive live catalog migration is applied; no fake player data or results were submitted.
- No-emit TypeScript and desktop/phone browser loading, picking and preview. Production build and lint were skipped. Physical-device frame rate and a genuine signed-in public finish remain owner acceptance checks.

Release 0.1.46 uses room protocol 37. Publish matching frontend and room-server revisions; no new environment variables are required.

The Supabase security review reports existing private-history tables with deliberately no raw-access policies, legacy owner-only anonymous-profile policies, and disabled password protection for the unused password flow. This catalog-only migration changes none of them. References: [RLS without raw policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [anonymous-policy advisory](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0012_auth_allow_anonymous_sign_ins), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Roof seam repair and larger heads (0.1.44)

A stone course under the rear and side edges of the lower pyramid slab seals the former gap. The course belongs to the roof, leaves with its fixing and adds no screw or owner. This creates real cover over the wall-top fixings, so the physical audit is regenerated and the world uses layout 2. The current board is jungle:layout-2:casual-1; layout-1 checkpoints and results remain stored separately and are not replayed in changed geometry. Shared pan-shaped heads are 25% wider than release 0.1.43; the dark cross and readability labels follow their shallow crown. Shaft dimensions and mechanical clearance are unchanged.

## Supported staircase repair (0.1.45)

The three original flights were thin treads above empty space, separated from the entrance floor. Each now has solid stone supports down to the island, with an upper landing that overlaps the temple floor and two low approach steps at the bottom. The supports/landing/approach belong to the original stair owners and detach with their screws. Footing edges are slightly recessed beside the riverbank frog. All 144 fixing positions/normals and the entire blocker/opening cache match 0.1.44 exactly, so layout 2, seeded puzzles, cloud checkpoints and leaderboard records remain valid. No migration is needed.

Focused checks cover actual stone at the formerly empty support/landing points, the existing complete attachment/viewing path, 30 seeded wins, stair-owner Rapier/one-second poof, checkpoint restore, no-emit TypeScript and a close browser view. Production build/lint and unchanged-world checks are skipped. Protocol 36 keeps both co-op scenes on matching collider geometry.

## Distant-decoration clearance repair (0.1.46)

The top stair screw (jungle-44) was falsely blocked by a sun-crown back face 3.61–3.73 units away. The small golden statue/frog (jungle-120) was falsely blocked by a lily back face about .98 units away. The ordinary pull path is only about .208 scene units. The deep-inside shortcut incorrectly accepted any exit-facing hit, even when the probe lay completely outside that decoration. Per-piece transformed bounds now guard that exception; actual nearby and deep enclosing covers still block. Live transforms are retained for falling pieces.

Regenerated clearance removes 21 false Jungle entries; no geometry, positions, normals or fixing IDs changed. The real opening is 58 heads, about 40%. The other eight cached worlds are unchanged; Camp loses two false opposite-wheel covers. Version-scoped colour-proof snapshots preserve old seeded colours, box queues and winning paths in Jungle layout 2 and Camp layout 3. These conservative proof constraints are never player locks: live screws use only corrected physical data. Checkpoints and historical results stay valid without any database migration.

Focused checks include exposed stair removal before the crown, statue removal after the stairs while lilies remain, real ray picking, desktop mouse and phone touch, co-op acceptance, nearby panels, deeply enclosed heads, live-cover transforms, eight pre-fix seed signatures and full winning routes. Previous route-only tests removed the decorations first and therefore did not catch this case.
