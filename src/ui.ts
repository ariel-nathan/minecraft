import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { resources } from "./blocks";
import { Physics } from "./physics";
import { Player } from "./player";
import { World } from "./world";

export function setupGUI(world: World, player: Player, physics: Physics) {
  const gui = new GUI();

  const playerFolder = gui.addFolder("Player");
  playerFolder.add(player, "maxSpeed", 1, 20).name("Max Speed");
  playerFolder.add(player.cameraHelper, "visible").name("Show Camera Helper");
  playerFolder.add(player.boundsHelper, "visible").name("Show Bounds Helper");
  playerFolder.add({ reset: () => player.reset() }, "reset").name("Reset");
  playerFolder.close();

  const physicsFolder = gui.addFolder("Physics");
  physicsFolder.add(physics.helpers, "visible").name("Show Physics Helpers");
  physicsFolder.close();

  const worldFolder = gui.addFolder("World");
  worldFolder.add(world.chunkSize, "width", 8, 128, 1).name("Width");
  worldFolder.add(world.chunkSize, "height", 8, 64, 1).name("Height");
  worldFolder.close();

  const terrainFolder = gui.addFolder("Terrain");
  terrainFolder.add(world.params, "seed", 0, 10000, 1).name("Seed");
  terrainFolder.add(world.params.terrain, "scale", 10, 100).name("Scale");
  terrainFolder
    .add(world.params.terrain, "magnitude", 0, 1, 0.01)
    .name("Magnitude");
  terrainFolder.add(world.params.terrain, "offset", 0, 1, 0.01).name("Offset");
  terrainFolder.close();

  const resourcesFolder = gui.addFolder("Resources");
  resources.forEach((resource) => {
    const resourceFolder = resourcesFolder.addFolder(resource.name);
    resourceFolder.add(resource, "scarcity", 0, 1).name("Scarcity");

    const scaleFolder = resourceFolder.addFolder("Scale");
    scaleFolder.add(resource.scale, "x", 10, 100).name("X Scale");
    scaleFolder.add(resource.scale, "y", 10, 100).name("Y Scale");
    scaleFolder.add(resource.scale, "z", 10, 100).name("Z Scale");

    resourceFolder.close();
  });
  resourcesFolder.close();

  gui.onChange(() => world.generate());

  gui.close();
}
