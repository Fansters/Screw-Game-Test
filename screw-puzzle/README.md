# Screw it!

A mobile-first 3D screw puzzle built with React, Three.js, React Three Fiber and Vite. Christmas Cottage (Level 1) has **240 screws and 166 removable assemblies**. Lakeside Camp (Level 2) has **240 screws and 197 removable assemblies**. Route 66 Gas Stop (Level 3) has **216 screws and 138 removable assemblies**. Construction Crew (Level 4) has **204 screws and 146 removable assemblies**. Carnival Fairground (Level 5) has **240 screws and 212 removable assemblies**. Titanic is retired from solo and co-op selection. All levels use twelve screw colors.

## Run and validate

```sh
npm install
npm run dev
npm run build
npm run lint
npm test
```

Use Vite's printed local URL. Tests and the room server use Node's native TypeScript support. Use Node 24 for this project.

## Playing

After the scene loads, green **Start** opens the solo level picker. All five levels are immediately playable; completing earlier levels is optional. Level clears are stored in the browser. The **Levels** button after a solo win returns to the picker. All screws are resident before gameplay and become visible as geometry falls away.

In the two-player menu, **Create game** opens the same level picker. The leader can choose any level, and guests join that selection through the invitation link. All five levels are available from the first visit. Both players load the selected level before **Start together** becomes available. The leader can **Change level** in the lobby, or return to **Levels** after a win. Reset starts a fresh round of the room's selected level. Each player keeps their own camera while screws, boxes, lifelines, timer and falling objects stay synchronized.

Phone and tablet layouts collect the round controls under a hamburger button. The icon changes to a cross, the controls slide down in order, and closing reverses their order. Hidden controls are excluded from keyboard and touch input. Reduced-motion preferences disable these transitions.

Drag to orbit on desktop and touchscreens. Scroll over a spot to zoom toward it, or pinch around it on a touchscreen. Right-drag or move two fingers together to pan. Zooming back out to the overview recenters on the house. Rotation stops on release. Screws are 15% larger and a 44 CSS-pixel assisted touch target with front-face and occlusion checks. Portrait and landscape layouts account for safe areas and dynamic viewport height.

The HUD retains two matching boxes, five waiting circles, the removal count, a stopwatch, and a 48px **Reset / Quit** arrow. The stopwatch appears after Start, begins only on the first accepted removal, and stops at logical win/loss. Invalid clicks, blocked attempts, camera gestures and cosmetic animation backlogs do not add solve time.

In solo play, the trophy button shows the ten fastest wins for the selected level. Switch levels in that dialog to compare personal times. The level cards also show your best time. Scores are stored in the current browser.

Solo rounds autosave in the current browser. Use **Exit** and choose **Home** or **Level select**; both save your solo progress. Select **Resume** on that level's card to continue. Elapsed time resumes when the camera arrives. The save restores the puzzle and matching boxes, waiting slots, remaining lifelines, and cleared parts. Loose parts and animation queues settle when restoring. **Reset** discards the current level's checkpoint.

The lightning button at bottom center slides in a third matching box while the five waiting slots keep their positions. There are three lifelines per round and one can be active at a time. The bonus favors a color already waiting and transfers matching screws into the box. It stays open until the third match.

Start enables a quiet, original instrumental loop. A soft click, knock and chime mark removal, obstruction and completion respectively. The music note and speaker toggle music and effects separately. Both are synthesized locally in `src/game/audio.ts`.

Active colors go directly to their boxes. Other colors use waiting slots. Completing a triple replaces that box with the next eligible queued color and automatically transfers matching waiting screws. Resolve cascades before checking loss at five occupied waiting slots. Win when all screws in the level are matched.

Each part starts falling as soon as its last screw is accepted. Falls can overlap while screw transfers and box changes play in order. Players can keep selecting screws and orbiting throughout. Visible heads with blocked extraction wiggle, and a head becomes selectable once its moving covers clear the extraction path. Text selection and the long-press menu are disabled inside the game.

**Reset** offers **Reset** or **Keep playing**. Confirming immediately restarts the same level with fresh colors, empty boxes, three lifelines and a stopped timer. Co-op waits for both scenes to reload before accepting moves. **Exit** separately confirms **Home**, **Level select**, or **Keep playing**. Exiting co-op leaves the room; the partner continues and inherits leadership if needed. **Again** after a solo win or loss restarts that level. The screw count sits above the stopwatch. Music, effects, reset and multiplayer exit are grouped at the top right.

Desktop fine-pointer layouts use a purple/gold screwdriver cursor. Its grip and blade twist 360 degrees around the shaft on primary press, while the pointing direction and tip stay fixed. Phone/coarse/touch input hides it.

## Natural difficulty and screw placement

The cottage has Christmas snow, lights, wreaths, candy canes, a tree, gifts, and a candle lantern trimmed with holly and ribbon. Loose parts clear in a puff of smoke one second after release. Tap one to clear it sooner and let pieces above it drop.

The cottage has **240** screws across **166** parts. Counts follow object size. Small fixtures and many furniture items use one screw; layered structural panels retain extra fixings. Large floors and outdoor tiles have up to five.

Wall heads are mounted on interior jambs, corners, and edges hidden by adjacent panels. Eight ground-floor fixings face sideways behind lower walls. Ridge timbers detach with their corresponding roof panels. The 12 roof panels use covered surface or forward-facing edge fixings; neighboring roof courses naturally obscure some of those edges. Furniture fixings vary between upper corners, side faces and the dining table underside. The front attic panel has downward-facing ceiling fixings reached through cleared upper windows and curtains. Positions are fixed between rounds; colors change.

Seven removable interior partitions separate the upstairs bedroom, study and bathroom from the stair hall and downstairs kitchen, living and dining areas. Eight independently fastened doors close the hall openings on both stories. Their screws face the hall. Clearing each loose door opens the doorway and the view into the room. Paintings, carpets and window curtains cover individual interior wall and floor fixings. Cross walls block sightlines between rooms, and three removable attic ceiling panels sit beneath the roof.

The 80-view orbit audit finds **23 initially exposed removable screws out of 240 (9.6%)**. Both starting colors have only one or two exposed matches, so neither box can finish without revealing another fixing.

Lakeside Camp is a complete meadow diorama with a canvas tent, furnished camper van, picnic area, fire circle, layered trees, supply crates, lake, dock and rowing boat. Every prop belongs to a removable assembly. Over half the screws face sideways or downward. Roof baggage, canvas panels, furniture, boat seats and stacked scenery conceal successive fixings. Meadow screws sit under actual props, and their stone foundations are independently removable. Fire sparks disappear with the fire assembly. Solo saves, per-level times and co-op all support the campsite.

Saves and personal times for the 240-screw layouts use new storage keys. Previous level clears remain unlocked, while older checkpoints and times are retained separately and are not replayed/ranked against the redesigned layouts.

## Route 66 and inventory warning

The desert level follows the supplied diorama concept: a cream shop with striped awning, red canopy and fuel pumps, teal vintage car, motel starburst sign, utility poles, sandstone mesa, flowering cacti, barrels, repair supplies and removable road tiles. The hollow shop contains shelves, coolers, a counter and till. Luggage covers car-roof fixings; pump globes conceal face-plate bolts. Sand and sandstone foundations detach too. All 138 assemblies use Rapier and the one-second smoke lifecycle. Its fixings prioritize natural, readable spacing; visible opening counts can vary between levels. Level 3 now uses 216 screws instead of padding its layout to 240.

The current level appears at bottom right, below co-op player counts. At four waiting screws, all five socket borders pulse red. This uses the logical inventory immediately, even while earlier moves animate. The warning clears when space returns; reduced-motion preferences use a steady red border.

The revised Level 3 layout uses v3 save/time keys, preserving older records separately. Cottage and campsite saves and times keep their existing keys.

Static clearance and 80-view exposure results live in `src/scene/desertAudit.ts`, avoiding an expensive scan when phones start this level. After editing its geometry or screw positions, run `node tools/audit_desert.ts`. Tests independently recompute the data and verify screw attachment, complete viewing paths, winning solutions, and shared co-op physics.

## Construction Crew (Level 4)

The construction diorama follows the supplied reference: unfinished brick walls with real window/door openings, a timber upper floor and red roof trusses, a segmented yellow tower crane, suspended lumber, green site office, tracked bulldozer, scaffolding and blue tarp. Hollow mixer, pipe bundle, cinder blocks, toolboxes, a blueprint, cones and safety barriers complete the sandy worksite. The main structures have separate working areas; small props use one screw, and the larger assemblies use two or three. All 146 owners detach with Rapier and the shared one-second poof.

The 204 fixings sit on inner walls, joist undersides, frame plates, side panels and naturally covered floor/vehicle surfaces. Spacing tests reject crowded heads. The open scaffold and crane intentionally leave more visible choices than the enclosed cottage. Both opening colors still require a reveal to complete their first triple. The constructor can follow another accessible branch when an active color needs a hidden fixing; every generated route is replayed through the actual rules without lifelines.

All five levels are available immediately in solo and co-op. Construction has independent solo checkpoints and best times, shared co-op physics, and the Level 4 indicator. Run `node tools/audit_construction.ts` after geometry or fixing changes; tests independently compare that static data against the meshes.

## Carnival Fairground (Level 5)

An original procedural fairground follows the supplied reference palette: pink/cream carousel and ticket awnings, gold trim, blue/yellow/pink gondolas, wooden game booths, white railings and pale cobbled paths. The panorama/Ferris wheel uses a 3.2-unit radius, twice the reference-scale 1.6-unit radius, and has its own rear area. The carousel, three prize games, ticket kiosk, popcorn cart, balloon/toy cart, bulb-lined entrance, benches, flowerbeds and bunting stay in separate areas around walkable routes.

The 240 fasteners secure 212 removable assemblies. Gondola roofs cover body fixings, gondola floors hide seat fasteners, saddles hide horse fixings, and horses conceal carousel platform heads. Games, shelves, kiosk panels and real props cover floor/wall screws. The circular rim, side panels, interior walls and covered paving edges provide varied approach angles. Small components use one fixing; larger frames have widely separated pairs. All parts use Rapier, early tap dismissal and the one-second automatic smoke effect.

Solo checkpoints and best times are separate for Level 5; co-op shares its screws, inventory, scores and falling bodies. All five levels are immediately selectable. Rebuild cached clearance/exposure after edits with `node tools/audit_carnival.ts`. Tests recompute those results and check the double-radius wheel, complete physical viewing paths, spacing, 30 fresh seeded solutions without lifelines, every physics body, save/resume, and a full shared co-op win.

## Colors and verified randomization

The 12 colors are red, blue, lemon yellow, green, orange, purple, brown, pink, light grey, cyan, black and lime. Every color uses whole triples, with quotas differing by at most three screws within a level. The shared screw/box/tray palette has at least 3:1 luminance contrast for brown/orange, purple/pink, blue/cyan and black/light grey. Recesses and shafts use the corresponding screw color, with darker recess shading.

Target counts follow each level’s screw total (68 triples in Construction Crew and 80 in Carnival Fairground). Targets, including the distinct initial pair, are shuffled. `generatePuzzle(seed)` constructs an accessible peel order, assigns colors while simulating two active boxes, and replays the entire winning sequence through the actual rules. That sequence uses zero waiting slots and zero lifelines. Multi-screw assemblies mix at least two colors; single-screw objects naturally have one. A crypto-generated seed starts each new round; seeded generation is reproducible.

`obstructedBy` comes from actual head/extraction collision samples. `solutionAfter` is only a conservative order for constructing a winning solution, never a gameplay lock. Exposed fixings remain selectable even when another fixing on the same object is covered.

## How the objects are made

The house and decorations are authored in TypeScript with Three.js primitives and rendered with React Three Fiber. The bathroom uses rounded ceramic bodies, mesh rings for the toilet and basin, and folded shower curtain panels. The window curtains use extruded pleats for visible folds on both faces. Each piece has a shape, transform, color and removable owner. The procedural parts batch 125,564 triangles into 493 meshes, and screws use three instanced meshes. DPR is capped at 1.25 on phones/coarse pointers and 1.5 elsewhere.

All 166 removable parts use Rapier. A round keeps one physics world. Attached parts stay fixed until their last screw releases them, and loose parts can collide with each other and the remaining cottage. The simulation uses simpler compound colliders for the detailed meshes, runs at 60 fixed steps per second, and lets settled parts sleep. Loose parts can still be cleared early by tapping them, or expire with smoke after one second.

## Archived treasure chest

The bathroom replaces the upstairs chest. Its original [Treasure chest by JSlyin](https://sketchfab.com/3d-models/treasure-chest-8bdf3dee4f344e36839c4c1c7e1dcd2b), editable Blender source and split exports stay in the repository for later use. Credits and the CC BY 4.0 license are included in [asset credits](public/asset-credits.txt).

- `chest-lock`: one front screw. Removing the lock exposes a front body screw.
- `chest-lid`: two top screws. The lid lifts and falls separately, revealing the screw inside the chest.
- `chest`: two screws, one front and one interior. The body falls after both are removed.

Open `art/treasure-chest.blend` in Blender to edit the three mesh objects and their materials/transforms. Keep their names for the game mapping. To export your saved changes, run:

```sh
blender --background --python-exit-code 1 --python tools/prepare_chest.py -- --export-edited
```

This updates the textured `treasure_chest_parts.glb` and `treasure_chest_collision.json` together, using the edited origins and transforms. Running the script without `--export-edited` rebuilds the split Blender file from the original download.

## Sources

- `src/game/levels.ts`: size-based screw counts, varied positions, inward normals, real obstructions and conservative construction order.
- `src/game/randomize.ts` and `rules.ts`: verified seeded colors, matching, transfers, release, win/loss.
- `src/scene/houseModel.ts`, `christmas.ts`, `interiors.ts`: original cottage, festive props, actual room walls/doorways and ceilings.
- `src/scene/partPhysics.ts` and `partColliders.ts`: the shared Rapier runtime and collision shapes. `loosePhysics.ts` interpolates poses and checks screw clearance against moving meshes.
- `src/scene/modelBatches.ts`, `obstructions.ts`, `picking.ts`, `exposure.ts`: efficient rendering, individual clearance, occlusion-safe input and orbit audits.
- `src/animation/run.ts`: live logical reservations and ordered animation snapshots.
- `src/components/CameraRig.tsx` and `src/scene/camera.ts`: title/house flights, orbit sensitivity, point-centered zoom and overview recentering.
- `src/components/ScrewField.tsx`, `GameUI.tsx`, `GameTimer.tsx`, `DesktopCursor.tsx`: resident screws, minimal collection HUD, isolated timer and pointer.

## Verification

Tests cover screw budgets, all owners, 100 seeded wins with no lifelines or waiting slots, matching and reset, automatic smoke timing, shared Rapier motion, and live picking and clearance. Eight full solutions are ray-tested through the actual geometry.

Physical-device frame rate and touch feel remain unmeasured. Vite reports the client and Rapier chunk sizes during a production build.

Next: playtest a complete round and assess later room-reveal pacing on a phone.
## Two-player rooms

Run `npm install` once. Then open two terminals in the project directory.

- Run `npm run server` to start the room server on port 2567.
- Run `npm run dev` to start the Vite game. Vite forwards the local `/rooms` WebSocket connection to port 2567.

Open the Vite URL and choose **Two-player game → Create game**. Copy the invite link and paste it into a second tab or browser. Choose **Join game** there. Once both browsers are ready, click **Start together** in the leader’s tab. To test with a phone on the same Wi-Fi, run `npm run dev -- --host` and open the Network URL Vite prints before creating the room.

Both players can orbit and remove screws at the same time. The server runs shared physics and sends compact pose updates up to 30 times per second. Both clients interpolate on the server clock with a 62.5 ms playback buffer, and a reconnect receives the latest active poses. The browser and the server check that they use the same cottage layout and room protocol. The leader confirms resets and spends the shared lifelines. Choose **Ping screw**, then tap a visible screw to briefly mark it on the other player’s screen. A lost connection pauses moves and the timer for up to 30 seconds. A refresh in the same tab restores the seat and the current puzzle. An explicit departure hands control over immediately. If a seat expires, the remaining player can continue the round.

### Share a room over the internet

Keep the Vite frontend on Vercel and deploy the room server as a single, long-running Node.js 24 web service from the same revision. For a service that connects to your Git repository, select the folder containing this `package.json`, use `npm ci` as the build command, and use `npm run server` as the start command. The server uses the host-provided `PORT`.

Set `VITE_ROOM_SERVER` on Vercel to the public secure WebSocket endpoint, for example `wss://your-room-service.onrender.com/rooms`, then redeploy the frontend. Set `ROOM_ORIGINS` on the server to your frontend origin, for example `https://your-game.vercel.app`, with comma-separated origins for additional custom domains. Give friends the invite URL from the game. Rooms live in a single server process and are cleared on a server restart.

