import {
  Scene,
  UniversalCamera,
  Vector3,
  HemisphericLight,
  MeshBuilder,
  SceneLoader,
  TransformNode,
} from "@babylonjs/core";

import "@babylonjs/inspector";

import * as GUI from "@babylonjs/gui";

import "@babylonjs/loaders/glTF";

export class GameScene {
  public scene: Scene;

  constructor(engine: any, canvas: HTMLCanvasElement) {
    /* SCENE */
    this.scene = new Scene(engine);

    this.scene.debugLayer.show();

    /* CAMERA FPS */
    const camera = new UniversalCamera(
      "fpsCamera",
      new Vector3(0, 1.7, 0),
      this.scene
    );

    this.scene.activeCamera = camera;

    camera.attachControl(canvas, true);
    camera.speed = 0.15;
    camera.angularSensibility = 2000;
    camera.minZ = 0.01;

    // WASD
    camera.keysUp.push(87); // W
    camera.keysDown.push(83); // S
    camera.keysLeft.push(65); // A
    camera.keysRight.push(68); // D

    const ui = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    const crosshair = new GUI.TextBlock();
    crosshair.text = "+";
    crosshair.color = "red";
    crosshair.fontSize = 24;

    ui.addControl(crosshair);

    /* POINTER LOCK */
    canvas.addEventListener("click", () => {
      canvas.requestPointerLock();
    });

    window.addEventListener("mousedown", () => {
      this.shoot(camera);
    });

    /* LIGHT */
    new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);

    /* GROUND */
    const ground = MeshBuilder.CreateGround(
      "ground",
      { width: 50, height: 50 },
      this.scene
    );

    ground.checkCollisions = true;

    /* GRAVITY & COLLISION */
    this.scene.gravity = new Vector3(0, -0.5, 0);
    this.scene.collisionsEnabled = true;

    camera.checkCollisions = true;
    camera.applyGravity = true;
    camera.ellipsoid = new Vector3(0.5, 0.9, 0.5);

    const box = MeshBuilder.CreateBox("target", { size: 1 }, this.scene);
    box.position.set(0, 1, 10);

    /* LOAD GUN (FPS VIEWMODEL) */
    SceneLoader.ImportMesh(
      "",
      "/src/assets/models/",
      "rifle__ak-47_weapon_model_cs2.glb",
      this.scene,
      (meshes) => {
        // Root xoay theo camera
        const viewModel = new TransformNode("viewModel", this.scene);
        viewModel.parent = camera;

        // Root chỉnh trục súng
        const gunRoot = new TransformNode("gunRoot", this.scene);
        gunRoot.parent = viewModel;

        meshes.forEach((m) => (m.parent = gunRoot));

        /* === VIEWMODEL POSITION (FPS) === */
        viewModel.position.set(0.3, -0.25, 0.7);

        /* === SCALE === */
        gunRoot.scaling.setAll(0.01);

        /* === ROTATION FIX (QUAN TRỌNG) === */
        gunRoot.rotation.set(
          (271.2 * Math.PI) / 180,
          (220.4 * Math.PI) / 180,
          (47.5 * Math.PI) / 180
        );

        gunRoot.position.set(-0.173, 0.135, -0.462);
      }
    );
  }

  private shoot(camera: UniversalCamera) {
    const engine = this.scene.getEngine();

    // Ray từ tâm màn hình
    const ray = this.scene.createPickingRay(
      engine.getRenderWidth() / 2,
      engine.getRenderHeight() / 2,
      null,
      camera
    );

    const hit = this.scene.pickWithRay(ray);

    if (hit?.hit && hit.pickedPoint) {
      console.log("Hit:", hit.pickedMesh?.name);

      this.createHitEffect(hit.pickedPoint);
    }
  }

  private createHitEffect(point: Vector3) {
    const start = this.scene.activeCamera!.position.clone();
    const end = point.clone();

    const trace = MeshBuilder.CreateLines(
      "trace",
      { points: [start, end] },
      this.scene
    );

    // Tự xoá sau 50ms
    setTimeout(() => trace.dispose(), 150);

    this.createImpact(point);
  }

  private createImpact(point: Vector3) {
    const impact = MeshBuilder.CreateSphere(
      "impact",
      { diameter: 0.1 },
      this.scene
    );

    impact.position.copyFrom(point);

    setTimeout(() => impact.dispose(), 150);
  }
}
