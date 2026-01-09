import { Scene, Mesh, MeshBuilder, StandardMaterial } from "@babylonjs/core";

export class TargetManager {
  public targets: Mesh[] = [];
  private wallBack?: Mesh;

  public onTargetHit: ((target: Mesh) => void) | null = null;

  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public setWallBack(wall: Mesh) {
    this.wallBack = wall;
  }

  public spawnTargets(count: number = 3) {
    for (let i = 0; i < count; i++) {
      const t = this.spawnTarget();
      if (t) this.targets.push(t);
    }
  }

  private spawnTarget(): Mesh | null {
    if (!this.wallBack) return null;

    const wall = this.wallBack;

    const target = MeshBuilder.CreateSphere("target", { diameter: 0.5 }, this.scene);

    const minX = wall.position.x - wall.scaling.x * wall.getBoundingInfo().boundingBox.extendSize.x;
    const maxX = wall.position.x + wall.scaling.x * wall.getBoundingInfo().boundingBox.extendSize.x;

    const minY = 1;
    const maxY = 5 * wall.scaling.y;

    const posX = Math.random() * (maxX - minX) + minX;
    const posY = Math.random() * (maxY - minY) + minY;
    const posZ = wall.position.z - 0.05;

    target.position.set(posX, posY, posZ);

    const mat = new StandardMaterial("targetMat", this.scene);
    mat.diffuseColor.set(0, 0.6, 1);
    target.material = mat;

    target.renderingGroupId = 3;

    return target;
  }

  public handleHit(target: Mesh) {
    // change color first
    try {
      (target.material as StandardMaterial).diffuseColor.set(1, 0, 0);
    } catch {}

    this.onTargetHit?.(target);

    setTimeout(() => {
      target.dispose();
      this.targets = this.targets.filter((t) => t !== target);
      const nt = this.spawnTarget();
      if (nt) this.targets.push(nt);
    }, 50);
  }
}
