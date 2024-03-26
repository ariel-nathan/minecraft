import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { World } from "./world";

export function setupGUI(world: World) {
  const gui = new GUI();

  gui.add(world.size, "width", 8, 128, 1).name("Width");
  gui.add(world.size, "height", 8, 64, 1).name("Height");

  gui.onChange(() => world.generate());
}
