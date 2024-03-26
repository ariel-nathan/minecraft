import * as THREE from "three";
import { blocks } from "./blocks";
import { Player } from "./player";
import { World } from "./world";

const collisionGeometry = new THREE.BoxGeometry(1.001, 1.001, 1.001);
const collisionMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  transparent: true,
  opacity: 0.2,
});

const contactGeometry = new THREE.SphereGeometry(0.05, 6, 6);
const contactMaterial = new THREE.MeshBasicMaterial({
  wireframe: true,
  color: 0x00ff00,
});

export class Physics {
  simulationRate = 250;
  stepSize = 1 / this.simulationRate;
  accumulator = 0;
  gravity = 32;
  helpers: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.helpers = new THREE.Group();
    scene.add(this.helpers);
  }

  update(delta: number, player: Player, world: World) {
    this.accumulator += delta;

    while (this.accumulator >= this.stepSize) {
      player.velocity.y -= this.gravity * this.stepSize;
      player.applyInput(this.stepSize);
      this.detectCollisions(player, world);
      this.accumulator -= this.stepSize;
    }

    player.updateBoundsHelper();
  }

  detectCollisions(player: Player, world: World) {
    player.onGround = false;
    this.helpers.clear();

    const candidates = this.broadPhase(player, world);
    const collisions = this.narrowPhase(candidates, player);

    if (collisions.length > 0) {
      this.resolveCollisions(collisions, player);
    }
  }

  broadPhase(player: Player, world: World) {
    const candidates = [];

    const extents = {
      x: {
        min: Math.floor(player.position.x - player.radius),
        max: Math.ceil(player.position.x + player.radius),
      },
      y: {
        min: Math.floor(player.position.y - player.height),
        max: Math.ceil(player.position.y + player.height),
      },
      z: {
        min: Math.floor(player.position.z - player.radius),
        max: Math.ceil(player.position.z + player.radius),
      },
    };

    for (let x = extents.x.min; x <= extents.x.max; x++) {
      for (let y = extents.y.min; y <= extents.y.max; y++) {
        for (let z = extents.z.min; z <= extents.z.max; z++) {
          const block = world.getBlock(x, y, z);

          if (block && block.id !== blocks.empty.id) {
            const blockPos = new THREE.Vector3(x, y, z);
            candidates.push(blockPos);
            this.addCollisionHelper(blockPos);
          }
        }
      }
    }

    return candidates;
  }

  narrowPhase(candidates: THREE.Vector3[], player: Player) {
    const collisions = [];

    for (const block of candidates) {
      // Get point on block closest to player
      const pos = player.position;
      const closestPoint = new THREE.Vector3(
        Math.max(block.x - 0.5, Math.min(pos.x, block.x + 0.5)),
        Math.max(
          block.y - 0.5,
          Math.min(pos.y - player.height / 2, block.y + 0.5)
        ),
        Math.max(block.z - 0.5, Math.min(pos.z, block.z + 0.5))
      );

      // Determine if point is inside players bounding cylinder
      const dx = closestPoint.x - player.position.x;
      const dy = closestPoint.y - (player.position.y - player.height / 2);
      const dz = closestPoint.z - player.position.z;

      if (this.pointInPlayerBoundingCylinder(closestPoint, player)) {
        // Compute the overlap between the point and the player's bounding
        // cylinder along the y-axis and in the xz-plane
        const overlapY = player.height / 2 - Math.abs(dy);
        const overlapXZ = player.radius - Math.sqrt(dx * dx + dz * dz);

        // Compute the normal of the collision (pointing away from the contact point)
        // and the overlap between the point and the player's bounding cylinder
        let normal, overlap;
        if (overlapY < overlapXZ) {
          normal = new THREE.Vector3(0, -Math.sign(dy), 0);
          overlap = overlapY;
          player.onGround = true;
        } else {
          normal = new THREE.Vector3(-dx, 0, -dz).normalize();
          overlap = overlapXZ;
        }

        collisions.push({
          block,
          contactPoint: closestPoint,
          normal,
          overlap,
        });

        this.addContactPointHelper(closestPoint);
      }
    }

    return collisions;
  }

  resolveCollisions(
    collisions: {
      block: THREE.Vector3;
      contactPoint: THREE.Vector3;
      normal: THREE.Vector3;
      overlap: number;
    }[],
    player: Player
  ) {
    // Resolve the collisions in order of the smallest overlap to the largest
    collisions.sort((a, b) => a.overlap - b.overlap);

    for (const collision of collisions) {
      // Recheck if the contact point is inside the player's bounding cylinder
      // for each collision since the player position is updated after
      // each collision is resolved
      if (!this.pointInPlayerBoundingCylinder(collision.contactPoint, player))
        continue;

      // Adjust the player's position to resolve the collision
      let deltaPos = collision.normal.clone();
      deltaPos.multiplyScalar(collision.overlap);
      player.position.add(deltaPos);

      // Negate the players velocity along the normal
      // Get the magnitude of the player's velocity along the normal
      let magnitude = player.worldVelocity.dot(collision.normal);
      // Remove that part of the velocity from the player's velocity
      let velocityAdjustment = collision.normal
        .clone()
        .multiplyScalar(magnitude);

      // Apply the velocity adjustment
      player.applyWorldDeltaVelocity(velocityAdjustment.negate());
    }
  }

  pointInPlayerBoundingCylinder(pos: THREE.Vector3, player: Player) {
    const dx = pos.x - player.position.x;
    const dy = pos.y - (player.position.y - player.height / 2);
    const dz = pos.z - player.position.z;
    const r_sq = dx * dx + dz * dz;

    // Check if contact point is inside the bounding cylinder
    return (
      Math.abs(dy) < player.height / 2 && r_sq < player.radius * player.radius
    );
  }

  addCollisionHelper(block: THREE.Vector3) {
    const blockMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
    blockMesh.position.copy(block);
    this.helpers.add(blockMesh);
  }

  addContactPointHelper(pos: THREE.Vector3) {
    const contactMesh = new THREE.Mesh(contactGeometry, contactMaterial);
    contactMesh.position.copy(pos);
    this.helpers.add(contactMesh);
  }
}
