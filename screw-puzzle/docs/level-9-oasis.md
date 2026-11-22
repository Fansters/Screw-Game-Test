# Level 9: Egyptian Oasis

The new scene follows the supplied warm oasis reference: golden sandstone ruins and cliffs, a sun-relief gate, palms and coconuts, a saddled camel, meerkats, fennec foxes, a furnished canvas tent, turquoise pool/waterfall, flowering cacti, crates, pottery, ropes and bones. The square sandy base has rounded edges and separate interlocking paving courses. Existing levels retain their layouts and counts.

The level has **198 screws, 170 removable assemblies and 316,952 scenery triangles**, excluding the shared screw/title graphics. It uses all twelve screw colours. Most small parts have one fixing; structural deck/paving sections may use up to five. **126 heads face sideways, inward, diagonally or downward** rather than straight up. The opening audit finds **32 visible heads** across the full camera orbit.

## Plan → artwork → physical audit

1. `src/scene/oasisPlan.ts` defines named components, dimensions, planned contact surfaces and dismantling branches without importing Three.js. It rejects missing components and cycles before meshes are created.
2. `src/scene/oasisModel.ts` builds the artwork on those anchors. It uses rounded/extruded sandstone and cloth, smooth animal primitives, curved ropes, tapered solid palm blades and decorative geometry belonging to removable owners. Fixings project onto actual mounting surfaces and use their real normals. Compound objects keep their individual owners/pivots for Rapier.
3. `node tools/audit_oasis.ts` independently derives actual head/extraction collisions and full-orbit visibility, writing `oasisAudit.ts`. This static data avoids a full geometric scan on a phone when the level loads.

Natural branches include:

- Coconuts → leaf sectors → layered crown → trunk sections → cliff support.
- Sun relief → arch keystone → arch courses → pier courses.
- Door canvas → roof panels → rear wall / ridge / poles → furnishings and deck.
- Rock and water covers → lower spring/pool layers.
- Post caps and rope knots → successive fence sections.
- Above-ground assemblies → overlapping paving courses → the base.

`covers` and `proofAfter` guide solution construction; they do **not** lock player moves. Player eligibility continues to use physical extraction clearance, visible-head ray picking and live loose-object transforms. The physical prerequisite graph makes the major structures necessary before releasing the whole base. Conservative proof ordering also finishes remaining small props before paving. Verified construction routes put paving near the end and the three base fixings last.

The brief's accessible-count bands are design targets, not enforced quotas. Counts vary with seed, viewing angle and dismantling route. Removing a cover can temporarily reveal several heads. The endgame is physically layered, but not every player-selected sequence is a winning one.

## Solvability and integration checks

- Thirty fresh seeded colour arrangements replay to a win without lifelines; the generator verifies its constructed sequence through the existing two-box/five-slot rules.
- Eight complete solutions are checked for actual attachment and an unobstructed camera ray at every step.
- Tests check head spacing, cached obstruction data, the supporting-base graph, all 170 Rapier owners and one-second poof timing, and checkpoint identity/inventory/time restoration.
- The new level loads on demand and disposes/rebuilds its source and merged graphics buffers on exit/re-entry.
- Co-op uses existing P1/P2 box ownership and shared bonus/tray rules. A complete two-seat solve, refresh/reset, real WebSocket actions and client readiness are checked for this level.
- The ninth public board is `oasis:layout-1:casual-1`, accepting exactly 198 screws. Its additive migration is applied. PostgreSQL tests cover valid submissions and mismatched-count rejection without writing fake public scores.

App version **0.1.37**, room protocol **30**. Publish matching Vercel and Render revisions. No environment variables changed. Production build and lint are intentionally skipped. Physical-device frame rate and a genuine signed-in live finish remain owner acceptance checks.
