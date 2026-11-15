# Screw Cottage

A mobile-first 3D screw puzzle built with React, Three.js, React Three Fiber and Vite. The original Christmas cottage has **264 screws, 12 colors, and 125 removable assemblies**. Every visible model piece belongs to a fastened assembly.

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

Drag to orbit on desktop and touchscreens. Scroll over a spot to zoom toward it, or pinch around it on a touchscreen. Right-drag or move two fingers together to pan. Zooming back out to the overview recenters on the house. Rotation stops on release. Screws use scale 0.34375 and a 44 CSS-pixel assisted touch target with front-face and occlusion checks. Portrait and landscape layouts account for safe areas and dynamic viewport height.

The HUD retains two matching boxes, five waiting circles, the removal count, a stopwatch, and a 48px **Reset / Quit** arrow. The stopwatch appears after Start, begins only on the first accepted removal, and stops at logical win/loss. Invalid clicks, blocked attempts, camera gestures and cosmetic animation backlogs do not add solve time.

The lightning button adds a third matching box. There are three lifelines per round and one can be active at a time. The bonus favors a color already waiting and transfers matching screws into the box. It stays open until the third match.

Start enables a quiet, original instrumental loop. A soft click, knock and chime mark removal, obstruction and completion respectively. The speaker mutes the music and effects together. Both are synthesized locally in `src/game/audio.ts`.

Active colors go directly to their boxes. Other colors use waiting slots. Completing a triple replaces that box with the next eligible queued color and automatically transfers matching waiting screws. Resolve cascades before checking loss at five occupied waiting slots. Win when all 264 screws and 88 triples are cleared.

Each part starts falling as soon as its last screw is accepted. Falls can overlap while screw transfers and box changes play in order. Players can keep selecting screws and orbiting throughout. Visible heads with blocked extraction wiggle, and a head becomes selectable once its moving covers clear the extraction path. Text selection and the long-press menu are disabled inside the game.

**Reset / Quit** asks for confirmation before discarding progress, timing and pending jobs. Confirming restores the house with fresh randomized colors and flies back to the title. **Again** after a solo win or loss uses the same reset. On phones the screw count sits above the boxes, with sound and reset at the bottom.

Desktop fine-pointer layouts use a purple/gold screwdriver cursor. Its grip and blade twist 360 degrees around the shaft on primary press, while the pointing direction and tip stay fixed. Phone/coarse/touch input hides it.

## Natural difficulty and screw placement

The added red roof/facade barriers and yard perimeter assembly have been removed. The original Christmas snow, lights, wreaths, candy canes, tree, gifts and Santa remain. No artificial cover assemblies are used to conceal screws.

The level has **264** screws. Counts follow object size:

- 41 small assemblies have one screw, including windows, wreaths, presents, tree star, garlands and planters.
- 59 assemblies have two screws, including roof/wall panels, room partitions and most furniture.
- 10 larger assemblies have three screws, including stairs, the timber frame, tree and some ceiling panels.
- 15 large floor panels/platform tiles have five screws each. No other assembly exceeds three.

All 24 outer wall panels have inward-facing heads on solid interior jambs/corners. The 12 roof panels each have a surface fixing and a forward-facing edge fixing; neighboring roof courses naturally obscure some of those edges. Furniture fixings vary between upper corners and side faces. Positions are fixed between rounds; colors change.

Seven removable interior partitions separate upstairs bedrooms/study/storage from the stair hall and downstairs kitchen/living/dining areas. Corridor walls have actual doorways, baseboards and lintels. Cross walls block sightlines between rooms. Three removable attic ceiling panels sit beneath the roof. Rooms, floors, walls and existing furniture provide real occlusion, without wrapping the exterior in new barriers.

The 80-view orbit audit finds **24 initially exposed removable screws / 264 (9.1%)**. Both starting colors have only one or two exposed matches, so neither box can finish without revealing another fixing. This is a measured opening constraint; subjective difficulty and later reveal pacing still need playtesting.

## Colors and verified randomization

The 12 colors are red, blue, lemon yellow, green, orange, purple, brown, pink, light grey, cyan, black and lime. The 88 triples are split across the palette, with seven or eight triples per color. The shared screw/box/tray palette has at least 3:1 luminance contrast for brown/orange, purple/pink, blue/cyan and black/light grey. Recesses and shafts use the corresponding screw color, with darker recess shading.

Whole-triple quotas are 24 screws per color. All 88 targets, including the distinct initial pair, are shuffled. `generatePuzzle(seed)` constructs an accessible peel order, assigns colors while simulating two active boxes, and replays the entire winning sequence through the actual rules. Multi-screw assemblies mix at least two colors; single-screw objects naturally have one. Early assignment limits the opening pair to two exposed matches each instead of relying on blind reshuffling. A crypto-generated seed starts each new round; seeded generation is reproducible.

`obstructedBy` comes from actual head/extraction collision samples. `solutionAfter` is only a conservative order for constructing a winning solution, never a gameplay lock. Exposed fixings remain selectable even when another fixing on the same object is covered.

## How the objects are made

The house and decorations are authored in TypeScript with Three.js primitives and rendered with React Three Fiber. Boxes form wall/roof/ceiling panels, partition lintels, furniture and ribbons. Cylinders form trunks/candy canes, cones form tree tiers/icicles/Santa's hat, and low-poly icosahedrons form foliage/snow/ornaments. Stars and gables use extruded outlines. The treasure chest is the first imported model. No runtime texture service, external font or physics engine is required.

Each piece has a shape, transform, color and removable owner. The owner's last screw triggers a scripted fall. The full model has **922 primitive pieces**, merged into **284 meshes by owner/color**, plus the three imported chest parts. Convex originals and the exported chest surfaces are available for collision and live-fall checks. Screws use three instanced meshes with independent head IDs and animation transforms. DPR is capped at 1.25 on phones/coarse pointers and 1.5 elsewhere; there are no real-time shadows or post-processing.

## Imported treasure chest

The upstairs chest uses [Treasure chest by JSlyin](https://sketchfab.com/3d-models/treasure-chest-8bdf3dee4f344e36839c4c1c7e1dcd2b), marked [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) in the original `src/assets/treasure_chest.glb`. The original file stays untouched. The Blender split cuts the shared metal at the lid seam, preserves UVs and material maps, normalizes the model, gives each object its own origin, and resizes the textures to 512px. Credits are included in the Blender file, exported GLB metadata, and [asset credits](public/asset-credits.txt), also available at `/asset-credits.txt` in the running game.

- `chest-lock`: one front screw. Removing the lock exposes a front body screw.
- `chest-lid`: two top screws. The lid lifts and falls separately, revealing the screw inside the chest.
- `chest`: two screws, one front and one interior. The body falls after both are removed.

Open `art/treasure-chest.blend` in Blender to edit the three mesh objects and their materials/transforms. Keep their names for the game mapping. To export your saved changes, run:

```sh
blender --background --python-exit-code 1 --python tools/prepare_chest.py -- --export-edited
```

This updates the textured `treasure_chest_parts.glb` and `treasure_chest_collision.json` together, using the edited origins and transforms. If you move the screw mounting surfaces, adjust their positions in `src/game/levels.ts` too. Running the script without `--export-edited` rebuilds the split Blender file from the original download. The game loads the export before enabling Start. Three.js applies each part's fall to the corresponding GLB object and checks its matching triangles for clearance.

## Sources

- `src/game/levels.ts`: size-based screw counts, varied positions, inward normals, real obstructions and conservative construction order.
- `src/game/randomize.ts` and `rules.ts`: verified seeded colors, matching, transfers, release, win/loss.
- `src/scene/houseModel.ts`, `christmas.ts`, `interiors.ts`: original cottage, festive props, actual room walls/doorways and ceilings.
- `src/scene/modelBatches.ts`, `obstructions.ts`, `picking.ts`, `exposure.ts`: efficient rendering, individual clearance, occlusion-safe input and orbit audits.
- `src/animation/run.ts`: live logical reservations and ordered animation snapshots.
- `src/components/CameraRig.tsx` and `src/scene/camera.ts`: title/house flights, orbit sensitivity, point-centered zoom and overview recentering.
- `src/components/ScrewField.tsx`, `GameUI.tsx`, `GameTimer.tsx`, `DesktopCursor.tsx`: resident screws, minimal collection HUD, isolated timer and pointer.

## Verification

Build and lint pass. Tests cover screw budgets, all owners, 100 complete seeded winning solutions, matching and reset, simultaneous falls, off-center pinch and pan, zoom recentering, touch gestures, palette contrast, and live picking and clearance. Eight full solutions are ray-tested through the actual geometry. The imported chest also has tests for exported meshes, independent release and the lid hiding the interior screw.

Browser checks include starting the imported-model game and removing all five chest screws in an isolated cutaway using the real renderer and animation reducer. Earlier checks cover the exterior, timing/collection, title/reset flights, and portrait/landscape layout. The full level has not been manually solved in the browser; physical-device frame rate and touch feel remain unmeasured. Vite retains its existing non-blocking bundle-size warning.

Next: playtest a complete round and assess later room-reveal pacing on a phone.
## Two-player rooms

Run `npm install` once. Then open two terminals in the project directory.

- Run `npm run server` to start the room server on port 2567.
- Run `npm run dev` to start the Vite game. Vite forwards the local `/rooms` WebSocket connection to port 2567.

Open the Vite URL and choose **Two-player game → Create game**. Copy the invite link and paste it into a second tab or browser. Choose **Join game** there. Once both browsers are ready, click **Start together** in the leader’s tab. To test with a phone on the same Wi-Fi, run `npm run dev -- --host` and open the Network URL Vite prints before creating the room.

Both players can orbit and remove screws at the same time. The leader confirms resets and spends the shared lifelines. Choose **Ping screw**, then tap a visible screw to briefly mark it on the other player’s screen. A lost connection pauses moves and the timer for up to 30 seconds. A refresh in the same tab restores the seat and the current puzzle. An explicit departure hands control over immediately. If a seat expires, the remaining player can continue the round.

### Share a room over the internet

Keep the Vite frontend on Vercel and deploy the room server as a single, long-running Node.js 24 web service from the same revision. For a service that connects to your Git repository, select the folder containing this `package.json`, use `npm ci` as the build command, and use `npm run server` as the start command. The server uses the host-provided `PORT`.

Set `VITE_ROOM_SERVER` on Vercel to the public secure WebSocket endpoint, for example `wss://your-room-service.onrender.com/rooms`, then redeploy the frontend. Set `ROOM_ORIGINS` on the server to your frontend origin, for example `https://your-game.vercel.app`, with comma-separated origins for additional custom domains. Give friends the invite URL from the game. Rooms live in a single server process and are cleared on a server restart.

