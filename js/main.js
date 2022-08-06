import {Input} from "./input.js";
import {Player} from "./player.js";
import {Level} from "./level.js";
import {Editor} from "./editor.js";
import {loadAssets} from "./assets.js";
import {constants} from "./constants.js";

class Game {
  static dt = 0;
  static updateStep = 1/60;
  static last = window.performance && window.performance.now ? window.performance.now() : new Date().getTime();

  constructor(loadedAssets, audioCtx) {
	const canvas = document.getElementById("gameCanvas");
	this.ctx = canvas.getContext("2d");
	this.audioCtx = audioCtx;
	this.assets = loadedAssets;
	this.input = new Input(canvas);
	this.editor = new Editor(loadedAssets.levels.graveyard);
	this.editor.onToggle(data => this.currentLevel.reset(data));
	this.input.onRelease(Input.EDIT, event =>  this.editor.toggle());
	this.player = new Player({x: 100, y: this.ctx.canvas.height - Player.avatarHeight});
	this.currentLevel = new Level(loadedAssets.levels.graveyard, this.assets.images.levelBG.width, this.ctx.canvas.height, this.player);
	const creditsScene = new CreditsScene();
	this.menu = new MenuScene(this.input, {
	  play: () => this.scene = new GamePlayScene(this.assets.levels.graveyard),
	  editor: () => this.scene = this.editor,
	  credits: () => this.scene = creditsScene,
	});
	this.scene = this.menu;
	this.input.onRelease("Escape", event => this.scene = this.menu);
  }

  start() {
	window.requestAnimationFrame(this.getAnimationFrameCallback());
  }

  update(dt) {
	this.scene.update(dt, this.input);
  }

  draw() {
	this.ctx.fillStyle = this.editor.enabled ? "green" : "gray";
	this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

	this.scene.draw(this.ctx, this.assets.images);
  }

  blast() {
	this.scene.blast(this.audioCtx, this.assets.sounds);
  }

  getAnimationFrameCallback() {
	const game = this;
	const runGameStep = function(browserTimeStamp) {
	  Game.dt += Math.min(1, (browserTimeStamp - Game.last) / 1000);
	  while (Game.dt > Game.updateStep) {
		Game.dt -= Game.updateStep;
		game.update(Game.updateStep);
		game.blast();
	  }
	  game.draw();
	  Game.last = browserTimeStamp;
	  window.requestAnimationFrame(game.getAnimationFrameCallback());
	};
	return runGameStep;
  }
}

window.onload = function() {
  const audioCtx = new AudioContext();
  loadAssets(audioCtx).then(([images, sounds, levels]) => {
	const game = new Game({
	  images: Object.fromEntries(images),
	  sounds: Object.fromEntries(sounds),
	  levels: Object.fromEntries(levels),
	}, audioCtx);
	game.start();
  });
};


class MenuScene {
  constructor(input, options) {
	this.options = options;
	this.selectedIndex = 0;
	const numOptions = Object.keys(this.options).length;
	input.onRelease("ArrowDown", event => {
	  this.selectedIndex++;
	  this.selectedIndex = this.selectedIndex % numOptions;
	});
	input.onRelease("ArrowUp", event => {
	  this.selectedIndex--;
	  if (this.selectedIndex < 0) {
		this.selectedIndex = numOptions + this.selectedIndex;
	  } else {
		this.selectedIndex = this.selectedIndex % numOptions;
	  }
	});
	input.onRelease("Enter", event => {
	  const option = Object.keys(this.options)[this.selectedIndex];
	  this.options[option]();
	});
  }

  update(dt, input) {
  }

  draw(ctx, assets) {
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.fillStyle = "orange";
	const oldAlign = ctx.textAlign;
	const oldFont = ctx.oldFont;
	ctx.textAlign = "center";
	ctx.font = "bold 24px serif";
	const midX = Math.round(ctx.canvas.width/2);
	ctx.fillText("INCREDIBLY WELL", midX, Math.round(ctx.canvas.height/4));
	ctx.fillText("PRODUCED LOGO", midX, Math.round(ctx.canvas.height/3));
	ctx.font = "12px sans";
	ctx.textAlign = "left";
	for (const [i, label] of Object.keys(this.options).entries()) {
	  if (i == this.selectedIndex) {
		ctx.fillText("👉", midX - 48, Math.round(ctx.canvas.height*0.5 + 12*i));
	  }
	  ctx.fillText(label.toUpperCase(), midX - 24, Math.round(ctx.canvas.height*0.5 + 12*i));
	}
	ctx.textAlign = oldAlign;
	ctx.font = oldFont;
  }

  blast(ctx, assets) {
  }
}

class GamePlayScene {
  constructor(levelData) {
	this.player = new Player({x: 100, y: constants.VIEWABLE_HEIGHT - Player.avatarHeight});
	this.currentLevel = new Level(levelData, constants.PLAYABLE_WIDTH, constants.VIEWABLE_HEIGHT, this.player);
  }

  update(dt, input) {
	this.currentLevel.update(dt, input);
	this.player.update(dt, input, this.currentLevel);
  }

  draw(ctx, assets) {
	this.currentLevel.draw(ctx, assets);
	this.player.draw(ctx, assets, this.currentLevel.offset);
  }

  blast(ctx, assets) {
	this.currentLevel.blast(ctx, assets);
	this.player.blast(ctx, assets);
  }
}

class CreditsScene {
  constructor() {
  }

  update(dt, input) {
  }

  draw(ctx, assets) {
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.fillStyle = "orange";
	const oldAlign = ctx.textAlign;
	const oldFont = ctx.oldFont;
	ctx.textAlign = "center";
	ctx.font = "bold 24px serif";
	const midX = Math.round(ctx.canvas.width/2);
	ctx.fillText("CREDITS", midX, Math.round(ctx.canvas.height/3));
	ctx.fillText("HERE", midX, Math.round(ctx.canvas.height/2));
  }

  blast(ctx, assets) {
  }
}
