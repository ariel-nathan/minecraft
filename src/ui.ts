import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { World } from "./world";

export function setupGUI(world: World) {
  const gui = new GUI();

  gui.add(world.size, "width", 8, 128, 1).name("Width");
  gui.add(world.size, "height", 8, 64, 1).name("Height");

  const terrainFolder = gui.addFolder("Terrain");
  terrainFolder.add(world.params, "seed", 0, 10000, 1).name("Seed");
  terrainFolder.add(world.params.terrain, "scale", 1, 100, 1).name("Scale");
  terrainFolder
    .add(world.params.terrain, "magnitude", 0, 1, 0.01)
    .name("Magnitude");
  terrainFolder.add(world.params.terrain, "offset", 0, 1, 0.01).name("Offset");

  gui.onChange(() => world.generate());
}
