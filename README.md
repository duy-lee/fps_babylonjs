# BabylonJS FPS Mini-Game AimBall

Small FPS mini-game built with Babylon.js and TypeScript.

## Features
- First-person controls (WASD + mouselook)
- Pointer lock on click
- Fire weapon (left mouse) with tracer and impact effects
- Spawnable targets on a back wall with scoring
- 3D on-wall UI showing score and time remaining

## Local setup
Requirements: Node.js (20+), npm

Install dependencies:

```bash
npm install
```

Run in development (Vite):

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview built app:

```bash
npm run preview
```

## Project structure (important files)
- `index.html` — app entry
- `src/main.ts` — engine + render loop
- `src/scene/GameScene.ts` — main scene logic (camera, UI, game flow)
- `src/systems/PlayerController.ts` — camera + input handling
- `src/systems/TargetManager.ts` — target spawn & hit handling
- `src/systems/UIManager.ts` — HUD helper
- `src/assets/models/` — put `.glb` models here (`sky.glb`, gun, floor, ...)

## Controls
- Move: W/A/S/D
- Look: mouse (requires click to request pointer lock)
- Fire: left mouse button
- Exit pointer lock: Esc (or release pointer)

## Notes & Troubleshooting
- Pointer lock: browsers may reject `exitPointerLock()` if the user already left lock; the app now guards that call to avoid unhandled promise errors.
- Asset loading: the code uses async `ImportMeshAsync` (or a local alias) to load `.glb` models from `src/assets/models/`.
- If the sky or other models don't appear, open the browser dev tools console and look for warnings/errors (e.g., missing files, CORS, GLTF issues).

## Development tips
- Run `npx tsc --noEmit` to perform a TypeScript check.
- Use the Babylon inspector during development: uncomment `this.scene.debugLayer.show();` in `GameScene.ts`.

## Contributing
PRs welcome. Keep changes focused (small, testable).

## License
This project has no license set. Add one if you intend to publish.
