# Terrainmakerv1

A low-poly procedural planet designer and spaceflight prototype. Create and reseed worlds, mix compatible terrain types, and fly from the surface into space using touch controls and terrain collision protection.

## Run

Download this repository and open **index.html** in a modern browser with WebGL 2 enabled. The game is self-contained: no build step, external libraries or asset downloads are required. If your browser restricts local files, serve this folder with any static web server.

## Features

- 33 world choices, including volcanic terrain, crater ponds, icy moons, reefs, canyons and river valleys.
- Six seeded tile variants per terrain family, with adjustable world size, relief and mesh budget.
- Single terrain families by default; optional curated mixes of two or three compatible families.
- Low-poly spacecraft with adjustable speed, optional slope following and terrain collision protection.
- Orbit and surface inspection views, including views from above and below.
- GLB mesh export, JSON recipe import/export and terrain map PNG/data export.

The former world photo/snapshot and collage exporter has been removed.

## Controls

| Control | Action |
| --- | --- |
| Left touch pad | Pitch up/down and bank left/right |
| Go / Stop | Toggle engines; stopped craft hovers |
| Speed slider | Set flight speed |
| Craft | Camera and optional slope-following settings |
| W / S | Thrust |
| A / D | Turn |
| Arrow up / down or drag | Pitch |
| E / Q | Lift / drop |
| Shift | Boost |
| Space | Brake |
| P | Pause |
| Orbit / Inspect worlds | Examine terrain and switch inspection views |

Pitch holds when you release the touch pad. Slope following is optional; collision protection remains active.

## Screenshots

These are cropped from the supplied gameplay screenshots. Phone, browser and chat controls have been removed. They show the previous title before the Terrainmakerv1 rename.

| Terraced canyons | Cratered moon with ponds | Volcano provinces |
| --- | --- | --- |
| ![Terraced canyons](docs/screenshots/terraced-canyons.png) | ![Cratered moon with ponds](docs/screenshots/cratered-moon-with-ponds.png) | ![Volcano provinces](docs/screenshots/volcano-provinces.png) |

| Karst and sinkholes | Glaciated mountains | River valleys | Cratered terrain |
| --- | --- | --- | --- |
| ![Karst and sinkholes](docs/screenshots/karst-and-sinkholes.png) | ![Glaciated mountains](docs/screenshots/glaciated-mountains.png) | ![River valleys](docs/screenshots/river-valleys.png) | ![Cratered terrain](docs/screenshots/cratered-terrain.png) |

## License

[MIT](LICENSE) — Copyright (c) 2026 Rick3y (rickey1990).
