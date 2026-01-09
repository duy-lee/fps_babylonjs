import { Scene, UniversalCamera, Vector3 } from "@babylonjs/core";

export class PlayerController {
  public camera: UniversalCamera;

  public onStartFiring: (() => void) | null = null;
  public onStopFiring: (() => void) | null = null;


  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.camera = new UniversalCamera("fpsCamera", new Vector3(0, 1.7, -4), scene);
    scene.activeCamera = this.camera;

    this.camera.attachControl(canvas, true);
    this.camera.speed = 0.15;
    this.camera.angularSensibility = 2000;
    this.camera.minZ = 0.01;

    // WASD
    this.camera.keysUp.push(87);
    this.camera.keysDown.push(83);
    this.camera.keysLeft.push(65);
    this.camera.keysRight.push(68);

    canvas.addEventListener("click", () => {
      canvas.requestPointerLock();
    });

    window.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      this.onStartFiring?.();
    });

    window.addEventListener("mouseup", (e) => {
      if (e.button !== 0) return;
      this.onStopFiring?.();
    });

    // pointer lock state is handled by the browser; no local tracking needed
  }
}
