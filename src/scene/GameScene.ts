import {
  Scene,
  Vector3,
  HemisphericLight,
  MeshBuilder,
  TransformNode,
  AnimationGroup,
  StandardMaterial,
  Mesh,
  ImportMeshAsync,
} from "@babylonjs/core";

import "@babylonjs/inspector";

import * as GUI from "@babylonjs/gui";

import "@babylonjs/loaders/glTF";
import { PlayerController } from "../systems/PlayerController";
import { TargetManager } from "../systems/TargetManager";
import { UIManager } from "../systems/UIManager";

export class GameScene {
  public scene: Scene;

  private shotAnim?: AnimationGroup;

  private isFiring = false;
  private fireInterval?: number;
  private fireRate = 100; // 600 RPM ≈ 100ms per shot

  private muzzle?: TransformNode;

  private recoilX = 0; // horizontal recoil
  private recoilY = 0; // vertical recoil only
  private maxRecoilY = 0.01; // very small
  private maxRecoilX = 0.005; // very small (horizontal)
  private recoilRecovery = 0.1; // fast recovery

  private wallBack?: Mesh;

  private player!: PlayerController;
  private targetManager!: TargetManager;
  private uiManager!: UIManager;

  private score = 0; // number of targets hit
  private scoreText?: GUI.TextBlock;
  private timeText?: GUI.TextBlock;

  private gameTime = 60; // seconds
  private timeLeft = 60;
  private timerInterval?: number;
  private gameOver = false;

  constructor(engine: any, canvas: HTMLCanvasElement) {
    /* SCENE */
    this.scene = new Scene(engine);

    /* SHOW DEBUG TOOL */
    // this.scene.debugLayer.show();

    // Player controller handles camera & input
    this.player = new PlayerController(this.scene, canvas);
    this.player.onStartFiring = () => this.startFiring();
    this.player.onStopFiring = () => this.stopFiring();

    this.scene.onBeforeRenderObservable.add(() => {
      if (!this.isFiring && this.player) {
        const camera = this.player.camera;
        const deltaY = this.recoilY * this.recoilRecovery;
        camera.rotation.x += deltaY;
        this.recoilY -= deltaY;

        const deltaX = this.recoilX * this.recoilRecovery;
        camera.rotation.y -= deltaX;
        this.recoilX -= deltaX;
      }
    });

    // UI manager (crosshair + score)
    this.uiManager = new UIManager();

    /* LIGHT */
    new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);

    this.loadSky();
    this.loadGround();

    /* GRAVITY & COLLISION */
    this.scene.gravity = new Vector3(0, -0.5, 0);
    this.scene.collisionsEnabled = true;

    this.player.camera.checkCollisions = true;
    this.player.camera.applyGravity = true;
    this.player.camera.ellipsoid = new Vector3(0.5, 0.9, 0.5);

    /* LOAD GUN (FPS VIEWMODEL) */
    this.loadGun();

    this.startGame();
  }

  private async loadSky() {
    try {
      const res = await ImportMeshAsync(
        "./assets/models/sky.glb",
        this.scene
      );
      const meshes = res.meshes;
      const skyMesh =
        (meshes.find((m) => m instanceof Mesh) as Mesh) || (meshes[0] as Mesh);
      if (!skyMesh) {
        console.warn("sky.glb loaded but no mesh found", meshes);
        return;
      }
      skyMesh.scaling.setAll(100);
      skyMesh.position.set(0, 0, 0);
      (skyMesh as any).infiniteDistance = true;
      skyMesh.renderingGroupId = 0;
      skyMesh.isPickable = false;
      skyMesh.checkCollisions = false;
      try {
        const mat = skyMesh.material as StandardMaterial | null;
        if (mat) mat.backFaceCulling = false;
      } catch {}
    } catch (e) {
      console.error("Failed to load sky.glb", e);
    }
  }

  private async loadGround() {
    try {
      const res = await ImportMeshAsync(
        "./assets/models/seamless__floor_tiled_texture_i.glb",
        this.scene
      );
      const meshes = res.meshes;
      meshes.forEach((m) => (m.checkCollisions = true));

      // calculate floor bounds
      const floorMin = new Vector3(Number.MAX_VALUE, 0, Number.MAX_VALUE);
      const floorMax = new Vector3(-Number.MAX_VALUE, 0, -Number.MAX_VALUE);

      meshes.forEach((m: any) => {
        const bb = m.getBoundingInfo().boundingBox;
        floorMin.x = Math.min(floorMin.x, bb.minimumWorld.x);
        floorMin.z = Math.min(floorMin.z, bb.minimumWorld.z);
        floorMax.x = Math.max(floorMax.x, bb.maximumWorld.x);
        floorMax.z = Math.max(floorMax.z, bb.maximumWorld.z);
      });

      const padding = 0.1;
      const wallHeight = 1;

      const wallLeft = MeshBuilder.CreateBox(
        "wallLeft",
        {
          width: 0.1,
          height: wallHeight,
          depth: floorMax.z - floorMin.z + padding * 2,
        },
        this.scene
      );
      wallLeft.position.set(
        floorMin.x - padding,
        wallHeight / 2,
        (floorMin.z + floorMax.z) / 2
      );
      wallLeft.checkCollisions = true;

      const wallRight = MeshBuilder.CreateBox(
        "wallRight",
        {
          width: 0.1,
          height: wallHeight,
          depth: floorMax.z - floorMin.z + padding * 2,
        },
        this.scene
      );
      wallRight.position.set(
        floorMax.x + padding,
        wallHeight / 2,
        (floorMin.z + floorMax.z) / 2
      );
      wallRight.checkCollisions = true;

      const wallFront = MeshBuilder.CreateBox(
        "wallFront",
        {
          width: floorMax.x - floorMin.x + padding * 2,
          height: wallHeight,
          depth: 0.1,
        },
        this.scene
      );
      wallFront.position.set(
        (floorMin.x + floorMax.x) / 2,
        wallHeight / 2,
        floorMin.z - padding
      );
      wallFront.checkCollisions = true;

      this.wallBack = MeshBuilder.CreateBox(
        "wallBack",
        {
          width: floorMax.x - floorMin.x + padding * 2,
          height: 10,
          depth: 0.1,
        },
        this.scene
      );
      this.wallBack.position.set(
        (floorMin.x + floorMax.x) / 2,
        wallHeight / 2,
        floorMax.z + padding
      );
      this.wallBack.checkCollisions = true;

      const plane = MeshBuilder.CreatePlane(
        "scorePlane",
        { width: 2, height: 1 },
        this.scene
      );
      plane.position.set(
        this.wallBack!.position.x,
        this.wallBack!.position.y + 4,
        this.wallBack!.position.z - 0.05
      );
      plane.renderingGroupId = 2;

      const advancedTexture3D = GUI.AdvancedDynamicTexture.CreateForMesh(plane);
      this.scoreText = new GUI.TextBlock();
      this.scoreText.text = "Score: 0";
      this.scoreText.color = "yellow";
      this.scoreText.fontSize = 200;
      advancedTexture3D.addControl(this.scoreText);

      this.timeText = new GUI.TextBlock();
      this.timeText.text = `\nTime: ${this.timeLeft}s`;
      this.timeText.color = "white";
      this.timeText.fontSize = 120;
      this.timeText.top = "120px";
      advancedTexture3D.addControl(this.timeText);

      // initialize TargetManager and UI
      this.targetManager = new TargetManager(this.scene);
      this.targetManager.setWallBack(this.wallBack!);
      this.targetManager.onTargetHit = () => {
        this.score++;
        this.updateScoreText();
        this.uiManager.updateScore(this.score);
      };
      this.targetManager.spawnTargets();
      this.uiManager.setScoreTextBlock(this.scoreText);
    } catch (e) {
      console.error("Failed to load ground glb", e);
    }
  }

  private async loadGun() {
    try {
      const res = await ImportMeshAsync(
        "./assets/models/ak-74m_animations_blender.glb",
        this.scene
      );
      const { meshes, animationGroups } = res;

      const viewModel = new TransformNode("viewModel", this.scene);
      viewModel.parent = this.player.camera;

      const shotAnim = animationGroups.find((a: AnimationGroup) =>
        a.name.toLowerCase().includes("shot")
      );
      this.shotAnim = shotAnim;
      const idle = animationGroups.find((a: AnimationGroup) =>
        a.name.toLowerCase().includes("idle")
      );
      idle?.start(true);

      const gunRoot = new TransformNode("gunRoot", this.scene);
      gunRoot.rotationQuaternion = null;
      gunRoot.parent = viewModel;

      meshes.forEach((m: any) => {
        m.parent = gunRoot;
        m.renderingGroupId = 3;
      });

      viewModel.position.set(-0.3, -0.25, 0.7);
      gunRoot.scaling.setAll(0.01);
      gunRoot.position.set(0.254, 0.203, -0.515);

      const muzzle = new TransformNode("muzzle", this.scene);
      muzzle.parent = gunRoot;
      muzzle.position.set(1, 2, 0.2);
      this.muzzle = muzzle;
    } catch (e) {
      console.error("Failed to load gun glb", e);
    }
  }

  private startFiring() {
    if (this.isFiring) return;

    this.isFiring = true;
    this.fireOnce();

    this.fireInterval = window.setInterval(() => {
      this.fireOnce();
    }, this.fireRate);
  }

  private stopFiring() {
    this.isFiring = false;

    if (this.fireInterval) {
      clearInterval(this.fireInterval);
      this.fireInterval = undefined;
    }
  }

  private fireOnce() {
    const camera = this.player.camera;
    if (this.gameOver) return;

    /* SHOT ANIM */
    if (this.shotAnim) {
      this.shotAnim.stop();
      this.shotAnim.goToFrame(0);
      this.shotAnim.start(false);
    }

    // --- LIGHT MICRO RECOIL ---
    const deltaY = 0.002 + Math.random() * 0.001; // add slight randomness for a natural feel
    this.recoilY = Math.min(this.recoilY + deltaY, this.maxRecoilY);

    // small horizontal recoil, random ±
    const deltaX = (Math.random() * 2 - 1) * this.maxRecoilX; // small horizontal recoil, random ±
    this.recoilX += deltaX;

    camera.rotation.x -= this.recoilY;
    camera.rotation.y += this.recoilX;

    /* --- RAYCAST + TRACER + IMPACT --- */
    const ray = camera.getForwardRay(100);
    const hit = this.scene.pickWithRay(ray);

    if (hit?.hit && hit.pickedMesh?.name === "target") {
      const target = hit.pickedMesh as Mesh;

      this.createImpact(hit.pickedPoint!);

      // delegate color change + replacement to TargetManager
      this.targetManager.handleHit(target);
    }

    const start = this.muzzle
      ? this.muzzle.getAbsolutePosition()
      : camera.position.clone();

    const end = hit?.pickedPoint ?? start.add(ray.direction.scale(100));
    const dir = end.subtract(start).normalize();
    const shortEnd = start.add(dir.scale(0.1));

    this.createTracer(start, shortEnd);

    if (hit?.hit && hit.pickedPoint) {
      this.createImpact(hit.pickedPoint);
    }
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

  private createTracer(start: Vector3, end: Vector3) {
    const tube = MeshBuilder.CreateTube(
      "tracer",
      {
        path: [start, end],
        radius: 0.01,
        tessellation: 6,
      },
      this.scene
    );

    tube.material =
      tube.material ??
      (() => {
        const m = new StandardMaterial("tracerMat", this.scene);
        m.emissiveColor.set(1, 0.8, 0.2);
        m.alpha = 0.6;
        return m;
      })();

    setTimeout(() => tube.dispose(), 60);
  }

  // target spawning is handled by TargetManager

  private startGame() {
    this.gameOver = false;
    this.score = 0;
    this.timeLeft = this.gameTime;

    this.updateScoreText();
    this.updateTimeText();

    this.timerInterval = window.setInterval(() => {
      this.timeLeft--;

      this.updateTimeText();

      if (this.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);
  }

  private endGame() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }

    this.gameOver = true;

    if (document.pointerLockElement) {
      // exitPointerLock may return a Promise in some browsers and can reject
      // if the user already exited the lock (e.g. pressed ESC). Handle safely.
      try {
        const maybePromise = (document as any).exitPointerLock();
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.catch(() => {});
        }
      } catch (e) {
        // ignore errors from exiting pointer lock
      }
    }

    this.showGameOverPopup();
  }

  private showGameOverPopup() {
    const ui = GUI.AdvancedDynamicTexture.CreateFullscreenUI("GameOverUI");

    const panel = new GUI.Rectangle();
    panel.width = "400px";
    panel.height = "200px";
    panel.color = "white";
    panel.thickness = 2;
    panel.background = "black";
    panel.cornerRadius = 10;

    ui.addControl(panel);

    const text = new GUI.TextBlock();
    text.text = `HẾT GIỜ!\nScore: ${this.score}`;
    text.color = "yellow";
    text.fontSize = 28;
    text.top = "-30px";

    panel.addControl(text);

    const button = GUI.Button.CreateSimpleButton("okBtn", "OK");
    button.width = "120px";
    button.height = "50px";
    button.color = "white";
    button.background = "green";
    button.top = "50px";

    button.onPointerUpObservable.add(() => {
      ui.dispose();

      this.resetGame();
    });

    panel.addControl(button);
  }

  private resetGame() {
    // reset state
    this.score = 0;
    this.timeLeft = this.gameTime;
    this.gameOver = false;

    this.updateScoreText();
    this.updateTimeText();

    // remove old targets
    this.scene.meshes
      .filter((m) => m.name.startsWith("target"))
      .forEach((m) => m.dispose());

    // spawn targets again
    this.targetManager.spawnTargets(3);

    // restart timer
    this.startGame();
  }

  private updateScoreText() {
    if (this.scoreText) {
      this.scoreText.text = `Score: ${this.score}`;
    }
  }

  private updateTimeText() {
    if (this.timeText) {
      this.timeText.text = `\nTime: ${this.timeLeft}s`;
    }
  }
}
