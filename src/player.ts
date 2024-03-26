import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/Addons.js";

export class Player {
  maxSpeed = 10;
  input = new THREE.Vector3();
  velocity = new THREE.Vector3();
  // TODO: Add fov slider
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  controls = new PointerLockControls(this.camera, document.body);

  constructor(scene: THREE.Scene) {
    this.camera.position.set(32, 16, 32);
    scene.add(this.camera);

    document.addEventListener("keydown", this.onKeyDown.bind(this));
    document.addEventListener("keyup", this.onKeyUp.bind(this));
  }

  applyInput(delta: number) {
    if (this.controls.isLocked) {
      this.velocity.x = this.input.x;
      this.velocity.z = this.input.z;
      this.controls.moveRight(this.velocity.x * delta);
      this.controls.moveForward(this.velocity.z * delta);
    }
  }

  get position() {
    return this.camera.position;
  }

  onKeyDown(event: KeyboardEvent) {
    if (!this.controls.isLocked) {
      this.controls.lock();
    }

    switch (event.code) {
      case "KeyW":
        this.input.z = this.maxSpeed;
        break;
      case "KeyA":
        this.input.x = -this.maxSpeed;
        break;
      case "KeyS":
        this.input.z = -this.maxSpeed;
        break;
      case "KeyD":
        this.input.x = this.maxSpeed;
        break;
    }
  }

  onKeyUp(event: KeyboardEvent) {
    switch (event.code) {
      case "KeyW":
        this.input.z = 0;
        break;
      case "KeyA":
        this.input.x = 0;
        break;
      case "KeyS":
        this.input.z = 0;
        break;
      case "KeyD":
        this.input.x = 0;
        break;
    }
  }
}
