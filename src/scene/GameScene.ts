import {
  Scene,
  UniversalCamera,
  Vector3,
  HemisphericLight,
  MeshBuilder,
  SceneLoader,
  TransformNode,
  AnimationGroup,
  StandardMaterial,
  Mesh,
} from "@babylonjs/core";

import "@babylonjs/inspector";

import * as GUI from "@babylonjs/gui";

import "@babylonjs/loaders/glTF";

export class GameScene {
  public scene: Scene;

  private shotAnim?: AnimationGroup;

  private isFiring = false;
  private fireInterval?: number;
  private fireRate = 100; // 600 RPM ≈ 100ms / viên

  private muzzle?: TransformNode;

  private recoilX = 0; // horizontal
  private recoilY = 0; // chỉ vertical
  private maxRecoilY = 0.01; // cực nhẹ, 0.003 ~ 0.005 là đủ
  private maxRecoilX = 0.005; // cực nhẹ, horizontal
  private recoilRecovery = 0.1; // hồi về nhanh

  private wallBack?: Mesh;

  private targets: Mesh[] = []; // lưu tất cả target

  private score = 0; // số bóng bắn trúng
  private scoreText?: GUI.TextBlock;

  private gameTime = 60; // giây
  private timeLeft = 60;
  private timerInterval?: number;
  private gameOver = false;

  constructor(engine: any, canvas: HTMLCanvasElement) {
    /* SCENE */
    this.scene = new Scene(engine);

    this.scene.debugLayer.show();

    /* CAMERA FPS */
    const camera = new UniversalCamera(
      "fpsCamera",
      new Vector3(0, 1.7, -4),
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

    this.scene.onBeforeRenderObservable.add(() => {
      if (!this.isFiring) {
        // mượt mà hồi về tâm
        const deltaY = this.recoilY * this.recoilRecovery;
        camera.rotation.x += deltaY;
        this.recoilY -= deltaY;

        const deltaX = this.recoilX * this.recoilRecovery;
        camera.rotation.y -= deltaX;
        this.recoilX -= deltaX;
      }
    });

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

    window.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return; // chỉ chuột trái
      this.startFiring(camera);
    });

    window.addEventListener("mouseup", (e) => {
      if (e.button !== 0) return;
      this.stopFiring();
    });

    /* LIGHT */
    new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);

    /* GROUND */
    SceneLoader.ImportMesh(
      "",
      "/src/assets/models/",
      "seamless__floor_tiled_texture_i.glb",
      this.scene,
      (meshes) => {
        meshes.forEach((m) => {
          m.checkCollisions = true;
        });

        // --- GIỚI HẠN DI CHUYỂN NHÂN VẬT ---
        // Tính bounding box của toàn bộ mesh nền
        const floorMin = new Vector3(Number.MAX_VALUE, 0, Number.MAX_VALUE);
        const floorMax = new Vector3(-Number.MAX_VALUE, 0, -Number.MAX_VALUE);

        meshes.forEach((m) => {
          const bb = m.getBoundingInfo().boundingBox;
          floorMin.x = Math.min(floorMin.x, bb.minimumWorld.x);
          floorMin.z = Math.min(floorMin.z, bb.minimumWorld.z);
          floorMax.x = Math.max(floorMax.x, bb.maximumWorld.x);
          floorMax.z = Math.max(floorMax.z, bb.maximumWorld.z);
        });

        const padding = 0.1; // khoảng cách nhỏ ngoài rìa floor
        const wallHeight = 1; // cao hơn nhân vật

        // Wall trái
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

        // Wall phải
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

        // Wall trước
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

        // Wall sau
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

        // GUI 3D
        const advancedTexture3D =
          GUI.AdvancedDynamicTexture.CreateForMesh(plane);

        this.scoreText = new GUI.TextBlock();
        this.scoreText.text = "Score: 0";
        this.scoreText.color = "yellow";
        this.scoreText.fontSize = 200;

        advancedTexture3D.addControl(this.scoreText);

        this.spawnTargets();
      }
    );

    /* GRAVITY & COLLISION */
    this.scene.gravity = new Vector3(0, -0.5, 0);
    this.scene.collisionsEnabled = true;

    camera.checkCollisions = true;
    camera.applyGravity = true;
    camera.ellipsoid = new Vector3(0.5, 0.9, 0.5);

    /* LOAD GUN (FPS VIEWMODEL) */
    SceneLoader.ImportMesh(
      "",
      "/src/assets/models/",
      // "rifle__ak-47_weapon_model_cs2.glb",
      "ak-74m_animations_blender.glb",
      this.scene,
      (meshes, particleSystems, skeletons, animationGroups) => {
        // Root xoay theo camera
        const viewModel = new TransformNode("viewModel", this.scene);
        viewModel.parent = camera;

        const shotAnim = animationGroups.find((a) =>
          a.name.toLowerCase().includes("shot")
        );

        this.shotAnim = shotAnim;

        const idle = animationGroups.find((a) =>
          a.name.toLowerCase().includes("idle")
        );
        idle?.start(true);

        // Root chỉnh trục súng
        const gunRoot = new TransformNode("gunRoot", this.scene);

        gunRoot.rotationQuaternion = null;

        gunRoot.parent = viewModel;

        meshes.forEach((m) => {
          m.parent = gunRoot;
          m.renderingGroupId = 3;
        });


        /* === VIEWMODEL POSITION (FPS) === */
        viewModel.position.set(-0.3, -0.25, 0.7);

        /* === SCALE === */
        gunRoot.scaling.setAll(0.01);

        gunRoot.position.set(0.254, 0.203, -0.515);

        const muzzle = new TransformNode("muzzle", this.scene);
        muzzle.parent = gunRoot;

        muzzle.position.set(1, 2, 0.2);

        this.muzzle = muzzle;
      }
    );

    // this.timerId = window.setTimeout(() => {
    //   alert(`Time's up! Bạn bắn được ${this.score} bóng.`);
    //   this.score = 0;
    //   if (this.scoreText) this.scoreText.text = `Score: 0`;
    //   // reset target nếu muốn
    // }, 60000); // 60.000ms = 1 phút
    this.startGame();
  }

  private startFiring(camera: UniversalCamera) {
    if (this.isFiring) return;

    this.isFiring = true;
    this.fireOnce(camera);

    this.fireInterval = window.setInterval(() => {
      this.fireOnce(camera);
    }, this.fireRate);
  }

  private stopFiring() {
    this.isFiring = false;

    if (this.fireInterval) {
      clearInterval(this.fireInterval);
      this.fireInterval = undefined;
    }
  }

  private fireOnce(camera: UniversalCamera) {
    if (this.gameOver) return;

    /* 🔫 SHOT ANIM */
    if (this.shotAnim) {
      this.shotAnim.stop();
      this.shotAnim.goToFrame(0);
      this.shotAnim.start(false);
    }

    // --- LIGHT MICRO RECOIL ---
    const deltaY = 0.002 + Math.random() * 0.001; // thêm ít random để tự nhiên
    this.recoilY = Math.min(this.recoilY + deltaY, this.maxRecoilY);

    // horizontal recoil nhẹ, random ±
    const deltaX = (Math.random() * 2 - 1) * this.maxRecoilX; // -max..+max
    this.recoilX += deltaX;

    camera.rotation.x -= this.recoilY;
    camera.rotation.y += this.recoilX;

    /* --- RAYCAST + TRACER + IMPACT --- */
    const ray = camera.getForwardRay(100);
    const hit = this.scene.pickWithRay(ray);

    if (hit?.hit && hit.pickedMesh?.name === "target") {
      const target = hit.pickedMesh;

      // đổi màu đỏ
      (target.material as StandardMaterial).diffuseColor.set(1, 0, 0);

      // nổ (sphere nhỏ)
      this.createImpact(hit.pickedPoint!);

      // update score
      this.score++;
      if (this.scoreText) {
        this.scoreText.text = `Score: ${this.score}`;
      }

      // xoá target cũ sau 200ms để hiện nổ trước
      setTimeout(() => {
        target.dispose();

        this.targets = this.targets.filter((t) => t !== target);

        const newTarget = this.spawnTarget();
        if (newTarget) this.targets.push(newTarget);
      }, 50);
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

    const mat = (tube.material =
      tube.material ??
      (() => {
        const m = new StandardMaterial("tracerMat", this.scene);
        m.emissiveColor.set(1, 0.8, 0.2);
        m.alpha = 0.6;
        return m;
      })());

    setTimeout(() => tube.dispose(), 60);
  }

  private spawnTargets(count: number = 3) {
    for (let i = 0; i < count; i++) {
      const t = this.spawnTarget(); // spawnTarget method từng bóng
      if (t) this.targets.push(t);
    }
  }

  private spawnTarget(): Mesh {
    if (!this.wallBack) return null!; // wallBack phải lưu thành property

    const wall = this.wallBack;

    const target = MeshBuilder.CreateSphere(
      "target",
      { diameter: 0.5 },
      this.scene
    );

    // random X và Y trên wall
    const minX =
      wall.position.x -
      wall.scaling.x * wall.getBoundingInfo().boundingBox.extendSize.x;
    const maxX =
      wall.position.x +
      wall.scaling.x * wall.getBoundingInfo().boundingBox.extendSize.x;

    const minY = 1;
    const maxY = 5 * wall.scaling.y; // tuỳ wallHeight

    const posX = Math.random() * (maxX - minX) + minX;
    const posY = Math.random() * (maxY - minY) + minY;
    const posZ = wall.position.z - 0.05;

    target.position.set(posX, posY, posZ);

    // --- Material mặc định (xanh) ---
    const mat = new StandardMaterial("targetMat", this.scene);
    mat.diffuseColor.set(0, 0.6, 1); // xanh dương
    target.material = mat;

    target.renderingGroupId = 3;

    return target;
  }

  private startGame() {
  this.gameOver = false;
  this.score = 0;
  this.timeLeft = this.gameTime;

  this.updateScoreText();

  this.timerInterval = window.setInterval(() => {
    this.timeLeft--;

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
    document.exitPointerLock();
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

  // xoá target cũ
  this.scene.meshes
    .filter(m => m.name.startsWith("target"))
    .forEach(m => m.dispose());

  // spawn lại target
  this.spawnTargets(3);

  // start lại timer
  this.startGame();
}

private updateScoreText() {
  if (this.scoreText) {
    this.scoreText.text = `Score: ${this.score}`;
  }
}
}
