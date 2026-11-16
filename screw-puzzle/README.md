# Screw Cottage

A mobile-first 3D screw puzzle built with React, Three.js, React Three Fiber and Vite. The original Christmas cottage has **264 screws, 12 colors, and 134 removable assemblies**. Every visible model piece belongs to a fastened assembly.

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

After the scene loads, green **Start** flies the camera from the floating title to the house in 1.25 seconds. All screws, including concealed ones, are resident before Start; shaders are warmed and a complete frame rendered first. Screws become visible as geometry falls away, without spawning.

Drag to orbit on desktop and touchscreens. Scroll over a spot to zoom toward it, or pinch around it on a touchscreen. Right-drag or move two fingers together to pan. Zooming back out to the overview recenters on the house. Rotation stops on release. Screws are 15% larger and a 44 CSS-pixel assisted touch target with front-face and occlusion checks. Portrait and landscape layouts account for safe areas and dynamic viewport height.

The HUD retains two matching boxes, five waiting circles, the removal count, a stopwatch, and a 48px **Reset / Quit** arrow. The stopwatch appears after Start, begins only on the first accepted removal, and stops at logical win/loss. Invalid clicks, blocked attempts, camera gestures and cosmetic animation backlogs do not add solve time.

The lightning button at bottom center slides in a third matching box while the five waiting slots keep their positions. There are three lifelines per round and one can be active at a time. The bonus favors a color already waiting and transfers matching screws into the box. It stays open until the third match.

Start enables a quiet, original instrumental loop. A soft click, knock and chime mark removal, obstruction and completion respectively. The music note and speaker toggle music and effects separately. Both are synthesized locally in `src/game/audio.ts`.

Active colors go directly to their boxes. Other colors use waiting slots. Completing a triple replaces that box with the next eligible queued color and automatically transfers matching waiting screws. Resolve cascades before checking loss at five occupied waiting slots. Win when all 300 screws and 100 triples are cleared.

Each part starts falling as soon as its last screw is accepted. Falls can overlap while screw transfers and box changes play in order. Players can keep selecting screws and orbiting throughout. Visible heads with blocked extraction wiggle, and a head becomes selectable once its moving covers clear the extraction path. Text selection and the long-press menu are disabled inside the game.

**Reset / Quit** asks for confirmation before discarding progress, timing and pending jobs. Confirming restores the house with fresh randomized colors and flies back to the title. **Again** after a solo win or loss uses the same reset. The screw count sits above the stopwatch. Music, effects, reset and multiplayer exit are grouped at the top right.

Desktop fine-pointer layouts use a purple/gold screwdriver cursor. Its grip and blade twist 360 degrees around the shaft on primary press, while the pointing direction and tip stay fixed. Phone/coarse/touch input hides it.

## Natural difficulty and screw placement

The cottage has Christmas snow, lights, wreaths, candy canes, a tree, gifts, and a candle lantern trimmed with holly and ribbon. Loose parts clear in a puff of smoke three seconds after release. Tap one to clear it sooner and let pieces above it drop.

The level has **300** screws across **158** parts. Counts follow object size. Small fixtures such as the towel and mirror have one screw, the sink and toilet have two, and the shower enclosure has three. Large floors and outdoor tiles have four or five.

Wall heads are mounted on interior jambs, corners, and edges hidden by adjacent panels. Eight ground-floor fixings face sideways behind lower walls. Ridge timbers detach with their corresponding roof panels. The 12 roof panels each have a surface fixing and a forward-facing edge fixing; neighboring roof courses naturally obscure some of those edges. Furniture fixings vary between upper corners and side faces. Positions are fixed between rounds; colors change.

Seven removable interior partitions separate the upstairs bedroom, study and bathroom from the stair hall and downstairs kitchen, living and dining areas. Eight independently fastened doors close the hall openings on both stories. Their screws face the hall. Clearing each loose door opens the doorway and the view into the room. Cross walls block sightlines between rooms, and three removable attic ceiling panels sit beneath the roof.

The 80-view orbit audit finds **26 initially exposed removable screws out of 300 (8.7%)**. Both starting colors have only one or two exposed matches, so neither box can finish without revealing another fixing.

## Colors and verified randomization

The 12 colors are red, blue, lemon yellow, green, orange, purple, brown, pink, light grey, cyan, black and lime. The 100 triples are split across the palette, with eight or nine triples per color. The shared screw/box/tray palette has at least 3:1 luminance contrast for brown/orange, purple/pink, blue/cyan and black/light grey. Recesses and shafts use the corresponding screw color, with darker recess shading.

Color quotas are 24 or 27 screws. All 100 targets, including the distinct initial pair, are shuffled. `generatePuzzle(seed)` constructs an accessible peel order, assigns colors while simulating two active boxes, and replays the entire winning sequence through the actual rules. That sequence uses zero waiting slots and zero lifelines. Multi-screw assemblies mix at least two colors; single-screw objects naturally have one. A crypto-generated seed starts each new round; seeded generation is reproducible.

`obstructedBy` comes from actual head/extraction collision samples. `solutionAfter` is only a conservative order for constructing a winning solution, never a gameplay lock. Exposed fixings remain selectable even when another fixing on the same object is covered.

## How the objects are made

The house and decorations are authored in TypeScript with Three.js primitives and rendered with React Three Fiber. The bathroom uses rounded ceramic bodies, mesh rings for the toilet and basin, and folded shower curtain panels. Each piece has a shape, transform, color and removable owner. The procedural parts batch into 459 meshes, and screws use three instanced meshes. DPR is capped at 1.25 on phones/coarse pointers and 1.5 elsewhere.

The front-right roof eave panel, its snow strip and the round roof bauble use Rapier. The simulation uses simple angled and rounded colliders, with poses sampled from fixed time steps. The room server sends the same sampled path to both clients. Other parts still use the existing scripted motion. Both paths share the three-second smoke cleanup.

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

Both players can orbit and remove screws at the same time. Shared falls are scheduled 62.5 ms ahead. The browser and the server check that they are using the same cottage layout. The leader confirms resets and spends the shared lifelines. Choose **Ping screw**, then tap a visible screw to briefly mark it on the other player’s screen. A lost connection pauses moves and the timer for up to 30 seconds. A refresh in the same tab restores the seat and the current puzzle. An explicit departure hands control over immediately. If a seat expires, the remaining player can continue the round.

### Share a room over the internet

Keep the Vite frontend on Vercel and deploy the room server as a single, long-running Node.js 24 web service from the same revision. For a service that connects to your Git repository, select the folder containing this `package.json`, use `npm ci` as the build command, and use `npm run server` as the start command. The server uses the host-provided `PORT`.

Set `VITE_ROOM_SERVER` on Vercel to the public secure WebSocket endpoint, for example `wss://your-room-service.onrender.com/rooms`, then redeploy the frontend. Set `ROOM_ORIGINS` on the server to your frontend origin, for example `https://your-game.vercel.app`, with comma-separated origins for additional custom domains. Give friends the invite URL from the game. Rooms live in a single server process and are cleared on a server restart.

