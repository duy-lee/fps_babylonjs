import { Engine } from "@babylonjs/core";
import { GameScene } from "./scene/GameScene";

const canvas = document.getElementById(
  "renderCanvas"
) as HTMLCanvasElement;

const engine = new Engine(canvas, true);

const scene = new GameScene(engine, canvas).scene;

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});