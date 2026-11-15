# AGENTS.md — 3D Screw Puzzle (Web)

> Repository instructions for Codex. Keep this file in the **repository root**.
> This is a living document: the project owner may edit any decision below.

## 1. Project mission

Build a **small, fun, single-player 3D screw-removal puzzle that runs in a web browser**. Players orbit a house, select colored screws, fill two active matching boxes, and use five waiting slots for colors without an active box.

We are prototyping the *gameplay concept*, not reproducing any specific advertisement, game's copyrighted assets, branding, or exact rules.

**Current priority:** get a simple, working solo prototype running locally. Multiplayer is a possible **future phase**, not part of the MVP.

**Current playable level:**
- Runs in desktop Chrome from a local Vite development server.
- Shows an original low-poly 3D cottage.
- Shows a floating, geometric 3D "Screw Cottage" title and a colorful game HUD.
- Mobile-first portrait/landscape layout, with mouse orbit/wheel and touch orbit/pinch.
- Shows 264 fixed screw positions in twelve randomized colors, including distinct green and lime, with near-equal whole-triple quotas.
- Clicking a screw removes it and updates the game state.
- Has progress counters, two standard three-slot boxes, a lifeline box, and five waiting slots.
- Three screws complete an active matching box; waiting screws transfer automatically when their box appears.
- Selections stay live while animations play. The Christmas cottage has 134 removable assemblies, including twelve roof sections, twenty-four wall sections, forty original festive props, three attic ceiling panels, and seven room partitions with real doorways. The added red barriers and yard perimeter assembly have been removed.
- All screws are resident before Start, with shader warmup and an initial render behind a short loading spinner.
- Exposed screws are selectable immediately using individual geometry clearance, with a wiggle for blocked attempts.
- Desktop uses a spinning screwdriver cursor; the stopwatch appears after Start and starts on the first accepted screw.
- Has clear win, loss, and restart behavior, with a Reset / Quit arrow and camera flights between the title menu and house.
- `npm run build` succeeds.

Keep the initial implementation smaller than the feature list if necessary: prove 3D interaction first, then add gameplay rules.

## 2. Approved technology stack

| Area | Technology | Policy |
| --- | --- | --- |
| Language | **TypeScript** | Prefer strict typing; avoid `any` unless justified. |
| App UI | **React** | Functional components and hooks. |
| Dev/build | **Vite** | Use the React + TypeScript template. |
| 3D engine | **Three.js** | Underlying 3D library. |
| React 3D renderer | **@react-three/fiber** | Preferred way to author 3D scene components. |
| 3D utilities | **@react-three/drei** | Use `OrbitControls` and other helpers when helpful. |
| Styles | **Plain CSS** | No CSS framework needed for the prototype. |
| State | **React `useState` / `useReducer`** | No Redux/Zustand until complexity justifies it. |
| Packages | **npm** | Respect the existing lockfile; avoid mixing package managers. |
| Models | **Procedural meshes and local `.glb` assets** | Keep a source file and attribution for imported assets. |
| Hosting | **Static web deployment later** | No hosting required for local MVP. |

Development tools: current compatible **Node.js LTS**, npm, **VS Code** (or another editor), **Git**, and **Chrome DevTools**. Use versions compatible with the repository's current dependencies; do not pin random versions in this file.

**Not approved for the initial MVP without explicit owner request:** Unity, Unreal, a Node/Express backend, Colyseus, WebSockets, multiplayer, database, login/accounts, physics engines, Tailwind, Redux, Zustand, GSAP, analytics, payments, ads, or complex build infrastructure.

It is fine to suggest a dependency, but explain the benefit and ask before adding a substantial new one. Prefer the built-in APIs of React, R3F, Drei, and Three.js.

## 3. Core working principles for Codex

1. **Small steps, working software.** Implement only the current request/milestone. Keep the app runnable between changes.
2. **Inspect before editing.** Read the existing repository structure and `package.json`; do not assume a blank repo or overwrite unrelated work.
3. **Prefer the simplest implementation.** No premature abstractions, architecture, optimization, or extra features.
4. **Write understandable code.** The project owner is an experienced but currently rusty web developer. Explain non-obvious decisions in plain language.
5. **Keep 3D display separate from game rules.** Render the state; do not hide important puzzle behavior inside mesh components.
6. **Preserve future extensibility without building it now.** Game rules should be deterministic and largely pure; this helps eventual multiplayer.
7. **Avoid guessing mechanics from the reference ad.** Treat unclear puzzle behavior as an explicit prototype assumption and document it.
8. **No destructive actions without approval.** Do not delete project files, reset Git history, replace the app architecture, or introduce an unrelated template.
9. **Make changes that fit the request.** Do not refactor unrelated files or modify a lockfile unless dependencies change.
10. **Be candid about verification.** Never say code was tested, built, or viewed unless the relevant command/check actually succeeded.

When asked for code changes: briefly state the plan, make the smallest useful change, run available validation, then summarize what changed, how to test it, and the next logical step. Ask a question only when an ambiguity materially blocks correct implementation.

## 4. Current game rules and product constraints

The owner's latest request supersedes earlier milestone examples and UI conventions.

- The hollow, two-story Christmas cottage has **264 screw positions** and twelve colors, including separate green and lime. Four colors have 24 screws each and eight have 21. Screw scale is **0.3953125**, 15% larger than the previous 0.34375. Positions, IDs, normals and ownership stay fixed across restarts. Future levels may use different counts, with whole triples per color. Preserve at least 3:1 shared-palette luminance contrast for brown/orange, purple/pink, royal blue/cyan, and black/light grey.
- `generatePuzzle(seed)` creates shuffled colors and 88 triple targets derived from level quotas. The template supplies quota units, not the interactive arrangement. Initial active colors are random and distinct. Multi-screw assemblies mix at least two fastener colors; small single-screw objects have one. Each starting color has only one or two initially exposed matches, requiring a reveal before either first triple. Follow complete assemblies/newly revealed branches when constructing a proof. Enforce the opening color cap during assignment and mix the first two owner fixings early to avoid generation failures near the endgame.
- Generate a valid accessible peel order, assign colors through a simulation of the two active boxes, then replay the complete solution through the actual rules. Never blindly shuffle into potentially unsolvable layouts. A new round uses a fresh crypto-generated seed; seeded generation remains reproducible and pure.
- Start with the centered, green block-letter **Start** control. No screw selection before Start. On loss, show centered red **You Lost** lettering, immediately reject further selections, and provide **Again** to generate a fresh round and return to Start. Victory may show a minimal end screen too.
- The visible HUD contains **two standard matching boxes, five free-slot circles, the removed/total counter, a small stopwatch after Start, a reset button, and separate music and effects controls**. The lifeline button shows remaining charges at bottom center. Place the counter above the stopwatch and group the round controls at top right. Keep the floating 3D title. Hide collection HUD at the title/during camera flights. Do not add instruction text, status messages, color labels, part progress, progress bars, or enclosing panels. Keep accessible labels without adding visible clutter.
- Two active boxes hold three screws each. An active-color screw goes only to its matching box. Other colors use the five waiting slots. Waiting triples do not clear until their box appears.
- Completing a box clears three screws and replaces it with the first queued color not active in the other slot. Transfer waiting screws automatically, resolve all resulting cascades before checking capacity, and leave exhausted slots empty near the end.
- Each round has three lifelines and can use one at a time. The third box prefers the first eligible queued color already in the waiting slots. It closes when it fills with three matching screws.
- Win when every screw and triple is cleared (264 screws / 88 triples here). Lose when all five waiting slots remain occupied after logical transfers. Neither terminal state accepts moves.
- **Selections stay live during animations.** `RunState.logical` reserves accepted moves immediately, including duplicates, box capacity, cascades, parts, and terminal states. `RunState.display` replays immutable snapshots in order. New clicks append jobs without restarting the active timer. Screws spin out concurrently, and camera orbit/zoom stays available while playing.
- Collection flights and box/slot animations remain readable and ordered. The visible removal counter follows accepted moves immediately. Animation backlogs may finish cosmetically after loss; they cannot change the logical outcome or accept more moves.
- Select any visible head with clear extraction space, regardless of which parts remain elsewhere on the same object/tile. Never use broad part dependencies to lock exposed screws. `obstructedBy` is derived from actual head/short spin-out volume checks; camera rays prevent selecting hidden heads, shafts, or tips. A visible head with obstructed extraction gives a brief normal-axis wiggle without changing inventory or starting the stopwatch.
- Start each part's fall when its last screw is accepted. Falls can overlap each other and the screw collection queue. During a fall, check all moving covers at their current world transforms. A newly exposed head can be selected once extraction is clear. The reducer accepts clearance only for active falls and ignores completion callbacks from a previous round.
- The level has **134 removable assemblies and 264 fasteners**. Small objects use one screw, wall/roof panels and most furniture two, and larger objects at most three. Only the fifteen large floor panels/tiles may use five. No other assembly exceeds three. Current distribution: 51 with one screw, 59 with two, 9 with three, 7 with four, and 8 with five. Every model `Piece` requires a removable owner; every owner requires fasteners and a valid pivot.
- Difficulty comes from natural physical layers. Roof lights cover snow fasteners; snow strips cover roof surfaces. Icicles and garlands obscure wreath fixings, and wreaths obscure window screws. Snowbanks cover platform/foundation screws. Candy canes, porch snow, gifts, a tree/star, Santa and interior presents add reveal chains. Roofs, ceilings, room partitions and floors conceal interior fixings. Exposed screws still work immediately—never add artificial locks to make the game harder.
- Do not add unrealistic cover objects to conceal screws. The red roof/facade barriers and yard perimeter assembly were rejected by the owner and are removed. Keep the original Christmas decorations. Use natural house geometry and strategic, varied fixings on interior wall faces, panel edges, jambs, corners and furniture sides. Outer wall panels have inward-facing or edge-mounted heads. Ground-floor edge heads sit behind walls. Corner timbers split by floor, and the ridge timbers detach with their roof panels. Roof panels have a surface and forward-facing edge fixing, sometimes obscured by the neighboring roof course.
- Seven removable interior partitions with actual doorways/baseboards/lintels separate upstairs rooms and downstairs kitchen/living/dining areas from the stair hall. Three attic ceiling panels remain beneath the roof. An audit over **80 orbit viewpoints** finds **24 exposed removable screws / 264 (9.1%)**. Keep the tested natural opening below ten percent and require reveals before either initial triple, while preserving a physically reachable winning route. `solutionAfter` is only the conservative solution-construction order, not a player lock. Source geometry and live fall transforms determine real obstruction.
- All screws must be resident from initial mount, including physically occluded and logically locked ones. Do not filter out hidden screws or animate them spawning when covers fall. Warm shaders and render the complete scene before marking the round ready and showing Start. Readiness callbacks carry a round ID so stale callbacks cannot unlock a reset round. A minimal loading spinner is allowed during this actual warmup.
- Reset / Quit and Again clear jobs, blockers, parts, screws, targets, counters, timer, and the Start gate, generate a fresh seeded layout, and fly to the fixed 3D title. Start flies to the default house view over 1.25s. Orbit/picking stay disabled at the menu and during flights; new play begins only on arrival. Flights can be interrupted by reset and restart from the current camera position. Arrival callbacks carry view/round IDs to reject stale completions. Job IDs remain unique across rounds so stale callbacks cannot alter a reset game.
- Show a minimal stopwatch at 00:00 after Start. Begin timing only on the first accepted removal; rejected/duplicate/blocked clicks and camera gestures do not start it. Freeze on logical win/loss immediately, before cosmetic animations end. Reset clears/hides it until Start. Use monotonic timestamps, without per-tick scene rerenders.
- Desktop fine-pointer layouts use an original screwdriver cursor with a quick 360° twist around its own longitudinal shaft on primary press, mimicking unscrewing. Keep the tip and pointing direction fixed; never orbit the whole tool around its tip. Retain the round handle silhouette while rotating its face/ribs and flat blade. Hide it for phone/coarse/touch input; keep it pointer-transparent. No power-ups, currency, persistence, server, multiplayer, or extra levels are requested. Scripted falls remain preferable to physics.

Current sources of truth: `src/game/types.ts`, `levels.ts`, `rules.ts`, `randomize.ts`, `src/animation/run.ts`, and `src/scene/houseModel.ts`. `createInitialState` is the lower-level rules/fixture constructor; interactive rounds must use the verified generator.

## 5. 3D and interaction conventions

- Use `<Canvas>` from React Three Fiber for the scene.
- Use Three.js `OrbitControls` with **`enableDamping={false}`** so motion stops immediately on release. Preserve tablet touch rotation tuning in `CameraRig.tsx`.
- Wheel zoom focuses on the cursor and pinch zoom focuses between the fingers. Right-drag on desktop and two-finger drag on touch move the camera sideways. Keep the target within 8 units of the house center.
- Allow full horizontal and vertical orbit. Wheel and pinch zoom use distances 6.9 to 30. Gradually return the target to the house center as the player zooms out to the starting overview distance.
- Use simple `boxGeometry`, `cylinderGeometry`, and `meshStandardMaterial` first. A clickable colored cylinder is acceptable as a temporary screw.
- Handle screw clicks on their meshes; stop event propagation when needed. Avoid treating an orbit drag as a screw click.
- Keep gameplay HUD elements (tray, counters, reset) in ordinary React/HTML/CSS. The decorative floating title uses original 3D letter meshes; no external font download is needed.
- Animate screw removal only after the basic state transition works. A lightweight animation with existing browser/render-loop APIs is enough; no animation library required.
- Avoid full physics simulation. Screw motion can be scripted; nothing needs accurate threads, torque, or collision physics.
- Avoid per-frame React state updates and unnecessary allocations in `useFrame`. Dispose of resources correctly when creating custom Three.js objects.
- Use the mobile-first portrait/landscape layout, dynamic viewport height, safe-area insets, and appropriate touch targets. Touch taps use 44 CSS-pixel head assistance with actual occlusion/front-face checks. Never enlarge picking through a wall or allow shafts/tips to select. Reject drag/pinch gestures; a small touch jitter allowance is intentional.
- Prioritize usability and correctness over visual polish at this stage.

### Imported model conventions

- Prefer licensed or original stylized low-poly models; track asset license/source.
- Export/load `.glb` with R3F/Drei/Three.js tooling.
- Keep interactable screws as separate objects or instances with stable IDs; do not make them impossible to pick because they are merged into the house mesh.
- Reuse materials and geometries. The Christmas model has 970 pieces including chest geometry, with procedural pieces batched into 315 render meshes plus three textured chest objects. Keep the 264 screws in three instanced meshes with independent head IDs and concurrent transforms. Preserve original convex pieces for clearance calculations; the named inner falling group maps their authored coordinates into the current pose. Never reset screw matrices on logical state changes.
- Test mobile performance before adding heavy shadows, post-processing, or high-resolution textures.

## 6. Project layout (grow into this; do not scaffold every file immediately)

```text
screw-puzzle/
├── AGENTS.md
├── public/
│   └── models/          # Later: licensed .glb files
├── src/
│   ├── components/
│   │   ├── GameScene.tsx # Later: 3D scene and camera
│   │   ├── Screw.tsx     # Later: screw visuals and interaction
│   │   └── GameUI.tsx    # Later: HUD, tray, restart
│   ├── game/
│   │   ├── types.ts     # Game-only types
│   │   ├── rules.ts     # Pure puzzle rules
│   │   └── levels.ts    # Level data
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
└── vite.config.ts
```

For the first steps, keeping code in `App.tsx` is acceptable. Split into the above files only when the code becomes harder to understand.

Naming conventions:
- React components: `PascalCase.tsx`.
- Functions and variables: `camelCase`.
- Types/interfaces: `PascalCase`.
- Constants: descriptive names; use `UPPER_SNAKE_CASE` for true module-level constants when useful.
- Keep game-specific logic in `src/game/` and presentational 3D/HTML code in `src/components/` once those folders exist.
- Prefer descriptive code over elaborate comments; comment *why*, not the obvious *what*.

## 7. Commands and validation

If the repository is empty, the approved bootstrap is:

```bash
npm create vite@latest screw-puzzle -- --template react-ts
cd screw-puzzle
npm install
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
npm run dev
```

If the repository already exists, **do not scaffold another app inside it**; use its existing scripts and dependencies.

Common scripts, when present:

```bash
npm run dev       # Local development
npm run build     # Production / TypeScript build check
npm run lint      # Only when package.json defines it
npm test          # Pure rules and level checks with Node's built-in runner
```

Verification expectations:
- For code changes, attempt `npm run build` and available lint/check commands.
- Test visually in the browser when browser access is available; otherwise give exact manual steps and do not pretend to have seen the output.
- Check that orbiting, clicking, matching, resetting, win/loss, and count displays agree.
- For game rule changes, test at least: valid removal, duplicate click, color triple, tray-full loss, victory, and reset.
- Add small automated tests for pure rule functions when the project is ready for them; do not install a large testing stack without reason.
- Report actual failures and their causes; do not hide failing checks.

## 8. Completed development history (current rules are in section 4)

### Milestone 1: Render and interact
- [x] React + TypeScript + Vite app runs.
- [x] Render a simple wooden-looking 3D board or block.
- [x] Add `OrbitControls` so the user can rotate and zoom.
- [x] Place nine colored screws on the object.
- [x] Click screws to remove them and update a counter.

### Milestone 2: Core screw feel
- [x] Improve the screw meshes enough to recognize them as screws.
- [x] Add a short spin-out/remove animation.
- [x] Prevent accidental double removal and clicks during camera drag.

### Milestone 3: Puzzle rules
- [x] Add the five-slot collection tray.
- [x] Clear matching groups of three.
- [x] Show cleared/progress counters.
- [x] Implement win, loss, and restart.
- [x] Separate pure game logic from rendering and verify edge cases.

### Milestone 4: Better scene
- [x] Replace the board with a simple licensed/original low-poly house.
- [x] Position screws on different house faces.
- [x] Tune camera, lighting, UI, and performance.

The cottage and seasonal props are original procedural geometry in `src/scene/houseModel.ts`, `christmas.ts` and `interiors.ts`; the upstairs treasure chest uses an attributed local GLB. Boxes, cylinders, cones, low-poly icosahedrons, and extruded star/gable outlines create the details. Each piece has a transform, color, and owner. The current level has 264 screws; source model details are batched by owner/color. DPR remains capped at 1.25 on phones/coarse pointers and 1.5 elsewhere, with simple lights and no real-time shadows/post-processing.

### Milestone 5: Refine the existing level (owner's revised scope)
- [x] Route matching screws directly into active boxes; reserve free slots for other colors.
- [x] Display two active boxes, replace completed boxes, and automatically transfer waiting screws.
- [x] Expand this house to 60 screws in four colors.
- [x] Reduce screw size by 75%.
- [x] Enable full orbit above/below/around the house and scroll zoom.
- [x] Verify routing, cascades, loss, restart, and a complete 60-screw solution with automated tests; check representative behavior in the browser.

More levels and deployment remain deferred. Mobile behavior is now in scope; browser-size checks and touch-geometry tests are implemented, while physical-device performance testing remains unverified. Continue refining this single level when the owner requests changes.

### Further refinement: animations, removable layers, and game UI
- [x] Animate scene-to-slot and scene-to-box collection, including landing pops.
- [x] Show completed triples before animating box exit, replacement, and sequential waiting-slot transfers.
- [x] Add seven scripted detachable objects, rule-enforced blockers, and the chimney-to-roof reveal chain.
- [x] Refresh the HUD, add part progress, and float an original geometric 3D title above the house.
- [x] Test layer dependencies, immutable event snapshots, ordered playback, reset, and a full layered win. Browser-check representative falls, transfers, and restart during flight.

**Do not automatically start the next milestone** unless the owner's request clearly includes it. Finish the requested step and report its state.

## 9. Two-player co-op

The Node.js room server uses WebSockets and holds the shared puzzle, matching boxes, waiting slots, lifelines and stopwatch. Each player controls their own camera. Both players can select screws, and only the leader can start, reset or spend a lifeline.

An invite opens the second seat. Each tab stores its own seat token for refresh and reconnect. A disconnected seat is held for 30 seconds, pausing play and the stopwatch. Explicit departure or seat expiry lets the remaining player continue and transfers leadership if needed.

The server schedules each falling part 62.5 ms ahead and blocks dependent screws until the shared fall duration ends. A ping identifies a screw for the other player's camera. Rooms are temporary and run in one server process.

## 10. How to communicate with the owner

- Be patient, direct, and practical. Explain unfamiliar React/Three.js terms briefly when they matter.
- Prefer a short plan and incremental code changes over an enormous implementation in one turn.
- After making changes, say: **what changed**, **how to run/test it**, **what you actually verified**, and **one recommended next step**.
- If a requirement is not yet defined, use the simplest reversible assumption and clearly label it. Ask before making irreversible architectural or gameplay decisions.
- Treat the owner's direct instructions as the source of truth over the provisional design choices in this file.

## 11. Reference documentation

- Vite: https://vite.dev/guide/
- React: https://react.dev/
- Three.js: https://threejs.org/docs/
- React Three Fiber: https://r3f.docs.pmnd.rs/
- Drei: https://drei.docs.pmnd.rs/
- Codex repository instructions: https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex


### Current refinement: minimal HUD, live input, randomization, and a full house
- [x] Keep only boxes, free-slot circles, removal count, and the floating title; remove instruction panels and borders.
- [x] Accept new selections and camera input while previous animations play, with immediate logical reservations.
- [x] Add centered green Start and red loss lettering with a replay/reset route.
- [x] Build a hollow two-story house with 180 fixed screws, 25 removable parts, furniture, floor wings, and connected stairs.
- [x] Randomize colors and box targets per round, preserve balanced counts and mixed fasteners, and verify a complete solution before play.
- [x] Test rapid inputs, reset races, randomized solutions, inventory, layer visibility, and physical viewing paths; inspect the main flows in the browser.

### Current refinement: mobile input, resident screws, and complete dismantling
- [x] Increase screw size by ten percent and add occlusion-safe 44px touch assistance.
- [x] Adapt portrait, small-phone, and landscape layouts with safe areas and dynamic height.
- [x] Keep every screw resident, precompile shaders, and complete a render before showing Start.
- [x] Expand to 270 screws in six balanced colors, retaining verified solvable randomization.
- [x] Make the frame, ground floors, foundations, and nine large square platform tiles removable; require ownership for every model piece.
- [x] Cut real window/door openings and add corner/side fasteners.
- [x] Profile and batch resident screws to reduce full-scene draws from 1,057 to 250.
- [x] Verify nineteen tests, including 100 complete seeded solutions, opening geometry, tile ownership, touch occlusion, and readiness/reset races.

### Current refinement: individual clearance, screwdriver cursor, and solve timing
- [x] Replace blanket locks with per-head geometry clearance; keep generation order separate from player eligibility.
- [x] Allow exposed tile/jamb screws immediately, preserve hidden-head camera occlusion, and wiggle blocked attempts.
- [x] Check live falling-part transforms for early physical clearance, with reducer protection against stale exceptions.
- [x] Add a desktop-only screwdriver cursor and quick 360° click spin.
- [x] Add a stopwatch that appears after Start, begins on first accepted removal, freezes on terminal state, and resets on Again.
- [x] Validate twenty-five tests, including the four-exposed/two-covered tile regression, blocked feedback targeting, live clearance, and clock lifecycle.

### Current refinement: a layered Christmas cottage
- [x] Divide the roof into twelve independently fastened sections and the walls into twenty-four, retaining actual window/door openings.
- [x] Add forty removable festive assemblies, including snow, lights, wreaths, ribbons, candy canes, gifts, a tree/star, and fake Santa.
- [x] Expand to 450 screws in six balanced colors, with 113 complete removable owners.
- [x] Audit the opening across eighty camera positions; fifty initially exposed choices, below fifteen percent.
- [x] Verify 100 seeded winning layouts and clear viewing paths through eight complete solutions.
- [x] Batch 879 primitive pieces into 267 meshes, reducing the full scene from 884 to 272 draws while retaining accurate original-piece clearance.
- [x] Cover independent reveals, opening difficulty, and batched-versus-original occlusion with regression tests.

### Current refinement: immediate camera stop and eight colors
- [x] Disable orbit damping for immediate stopping on release.
- [x] Add brown and pink across screws, matching boxes, and waiting slots.
- [x] Preserve 450 positions and use near-equal whole-triple quotas across all eight colors.
- [x] Verify 100 eight-color winning layouts and explicit brown collection/pink-transfer coverage.

### Previous refinement: title transitions and superseded barrier design
- [x] Add physical roof/facade/yard covers and three removable attic ceiling panels; expand to 468 screws / 119 assemblies.
- [x] Reduce the orbit-wide opening to nine accessible heads and require an unlock before either initial triple can finish.
- [x] Separate chocolate brown/amber orange and deep violet/bright pink with tested luminance contrast.
- [x] Add a minimal Reset / Quit arrow, fresh-round cleanup, and interruptible title/house camera flights.
- [x] Keep instant-stop orbit and nonblocking collection animations during normal play.
- [x] Build/lint and 31 tests pass, including 100 seeded wins, eight physical viewing-path solutions, palette contrast, and delayed yard release. Browser checks cover desktop/portrait/landscape, reset cleanup, and interrupted camera flights; physical-device performance remains unmeasured.

### Current refinement: natural placement, fewer fixings and separate rooms
- [x] Remove the rejected red roof/facade barriers and yard perimeter; keep original Christmas props.
- [x] Reduce 468 screws to 261, enforcing one to three per ordinary assembly and at most five per large floor/tile.
- [x] Add light grey, cyan and black; deepen blue and verify contrast for similar pairs.
- [x] Move outer wall heads inside and use roof edges, furniture sides and varied corners.
- [x] Add seven removable room partitions with real doorways; retain three attic ceiling panels.
- [x] Verify 33 tests, 1,000 full seeded winning proofs, eight actual-geometry viewing paths and the natural 23-head opening.

### Current refinement: larger screws
- [x] Increase shared 3D screw scale by 25%, from 0.275 to 0.34375; rendering, picking, projection and clearance share that scale.
- [x] Raise four foundation edge fixings by 0.02 and one lower partition fixing by 0.03 to preserve extraction space for the larger heads.
- [x] Keep 261 screws / 123 assemblies and verify all 33 existing tests, including 100 seeded wins and eight complete physical viewing paths.

### Current refinement: imported chest
- [x] Preserve the original Sketchfab download. Credit JSlyin and CC BY 4.0 in the editable Blender file, the derivative GLB and the deployed asset credits.
- [x] Split the model at its existing seam into independent `chest`, `chest-lid` and `chest-lock` objects with their own materials, transforms and pivots. The lock uses one screw; the lid and body use two each. Lock and lid removal expose the body screws.
- [x] Keep the editable source in `art/treasure-chest.blend`. Use `tools/prepare_chest.py -- --export-edited` with Blender to update the game GLB and the matching collision triangles together.
- [x] Load the textured model before Start. Preserve the existing falling-part lifecycle and use actual chest geometry for selection, clearance and viewing-path checks.
- [x] Verify build/lint, 35 tests, 100 full seeded solutions and the browser chest detachment sequence.
