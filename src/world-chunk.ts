import * as THREE from "three";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";
import { blocks, resources } from "./blocks";
import { RNG } from "./rng";

const geometry = new THREE.BoxGeometry();

export class WorldChunk extends THREE.Group {
  size: { width: number; height: number };
  data: {
    id: number;
    instanceId: number | null;
  }[][][] = [];
  params: {
    seed: number;
    terrain: {
      scale: number;
      magnitude: number;
      offset: number;
    };
  };

  constructor(
    size: {
      width: number;
      height: number;
    },
    params: {
      seed: number;
      terrain: {
        scale: number;
        magnitude: number;
        offset: number;
      };
    }
  ) {
    super();
    this.size = size;
    this.params = params;
  }

  generate() {
    const rng = new RNG(this.params.seed);
    this.initializeTerrain();
    this.generateResources(rng);
    this.generateTerrain(rng);
    this.generateMeshes();
  }

  initializeTerrain() {
    this.data = [];

    for (let x = 0; x < this.size.width; x++) {
      const slice = [];
      for (let y = 0; y < this.size.height; y++) {
        const row = [];
        for (let z = 0; z < this.size.width; z++) {
          row.push({
            id: blocks.empty.id,
            instanceId: null,
          });
        }
        slice.push(row);
      }
      this.data.push(slice);
    }
  }

  generateResources(rng: RNG) {
    const simplex = new SimplexNoise(rng);

    resources.forEach((resource) => {
      for (let x = 0; x < this.size.width; x++) {
        for (let y = 0; y < this.size.height; y++) {
          for (let z = 0; z < this.size.width; z++) {
            const value = simplex.noise3d(
              (this.position.x + x) / resource.scale.x,
              (this.position.y + y) / resource.scale.y,
              (this.position.z + z) / resource.scale.z
            );

            if (value > resource.scarcity) {
              this.setBlockId(x, y, z, resource.id);
            }
          }
        }
      }
    });
  }

  generateTerrain(rng: RNG) {
    const simplex = new SimplexNoise(rng);

    for (let x = 0; x < this.size.width; x++) {
      for (let z = 0; z < this.size.width; z++) {
        // Compute the noise value at this x-z location
        const value = simplex.noise(
          (this.position.x + x) / this.params.terrain.scale,
          (this.position.z + z) / this.params.terrain.scale
        );

        // Scale the noise value to the desired range
        const scaledNoise =
          this.params.terrain.offset + this.params.terrain.magnitude * value;

        // Compute the height of the terrain at this x-z location
        let height = Math.floor(this.size.height * scaledNoise);

        // Clamp the height to the valid range
        height = Math.max(0, Math.min(height, this.size.height - 1));

        // Starting at the terrain height, fill in all the blocks below that height
        for (let y = 0; y < this.size.height; y++) {
          if (y < height && this.getBlock(x, y, z)?.id === blocks.empty.id) {
            this.setBlockId(x, y, z, blocks.dirt.id);
          } else if (y === height) {
            this.setBlockId(x, y, z, blocks.grass.id);
          } else if (y > height) {
            this.setBlockId(x, y, z, blocks.empty.id);
          }
        }
      }
    }
  }

  generateMeshes() {
    this.clear();

    const maxMeshCount = this.size.width * this.size.width * this.size.height;

    // Create a lookup table where the key is the block id
    const meshes: {
      [key: number]: THREE.InstancedMesh;
    } = {};

    Object.values(blocks)
      .filter((block) => block.id !== blocks.empty.id)
      .forEach((block) => {
        const mesh = new THREE.InstancedMesh(
          geometry,
          block.material,
          maxMeshCount
        );
        mesh.name = block.name;
        mesh.count = 0;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        meshes[block.id] = mesh;
      });

    const matrix = new THREE.Matrix4();

    for (let x = 0; x < this.size.width; x++) {
      for (let y = 0; y < this.size.height; y++) {
        for (let z = 0; z < this.size.width; z++) {
          const block = this.getBlock(x, y, z);

          if (!block || block.id === blocks.empty.id) continue;

          const mesh = meshes[block.id];
          const instanceId = mesh.count;

          matrix.setPosition(x, y, z);
          mesh.setMatrixAt(instanceId, matrix);
          this.setBlockInstanceId(x, y, z, instanceId);
          mesh.count++;
        }
      }
    }

    this.add(...Object.values(meshes));
  }

  getBlock(x: number, y: number, z: number) {
    if (this.isBlockInBounds(x, y, z)) {
      return this.data[x][y][z];
    } else {
      return null;
    }
  }

  setBlockId(x: number, y: number, z: number, id: number) {
    if (this.isBlockInBounds(x, y, z)) {
      this.data[x][y][z].id = id;
    }
  }

  setBlockInstanceId(x: number, y: number, z: number, instanceId: number) {
    if (this.isBlockInBounds(x, y, z)) {
      this.data[x][y][z].instanceId = instanceId;
    }
  }

  isBlockInBounds(x: number, y: number, z: number) {
    return (
      x >= 0 &&
      x < this.size.width &&
      y >= 0 &&
      y < this.size.height &&
      z >= 0 &&
      z < this.size.width
    );
  }

  isBlockObscured(x: number, y: number, z: number) {
    const up = this.getBlock(x, y + 1, z)?.id ?? blocks.empty.id;
    const down = this.getBlock(x, y - 1, z)?.id ?? blocks.empty.id;
    const left = this.getBlock(x + 1, y, z)?.id ?? blocks.empty.id;
    const right = this.getBlock(x - 1, y, z)?.id ?? blocks.empty.id;
    const forward = this.getBlock(x, y, z + 1)?.id ?? blocks.empty.id;
    const back = this.getBlock(x, y, z - 1)?.id ?? blocks.empty.id;

    // If any of the block's sides is exposed, it is not obscured
    if (
      up === blocks.empty.id ||
      down === blocks.empty.id ||
      left === blocks.empty.id ||
      right === blocks.empty.id ||
      forward === blocks.empty.id ||
      back === blocks.empty.id
    ) {
      return false;
    } else {
      return true;
    }
  }

  disposeInstances() {
    this.traverse((obj) => {
      if (obj instanceof THREE.InstancedMesh) obj.dispose();
    });
    this.clear();
  }
}
