import * as GUI from "@babylonjs/gui";

export class UIManager {
  private ui = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
  private scoreText?: GUI.TextBlock;

  constructor() {
    const crosshair = new GUI.TextBlock();
    crosshair.text = "+";
    crosshair.color = "red";
    crosshair.fontSize = 24;
    this.ui.addControl(crosshair);
  }

  public setScoreTextBlock(tb: GUI.TextBlock) {
    this.scoreText = tb;
  }

  public updateScore(score: number) {
    if (this.scoreText) this.scoreText.text = `Score: ${score}`;
  }

  public showGameOver(score: number, onOk: () => void) {
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
    text.text = `HẾT GIỜ!\nScore: ${score}`;
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
      onOk();
    });

    panel.addControl(button);
  }
}
