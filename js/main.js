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
	this.editor = new Editor(loadedAssets.levels, {
	  play: levelData => this.scene = new PlayTestScene(new Player({x: 100, y: constants.VIEWABLE_HEIGHT - Player.avatarHeight}), levelData, this.editor),
	  edit: levelData => this.scene = this.editor,
	  exit: () => this.scene = this.menu,
	});
	const creditsScene = new CreditsScene({exit: () => this.scene = this.menu});
	this.menu = new MenuScene({
	  play: () => this.scene = new GamePlayScene(this.assets.levels),
	  editor: () => this.scene = this.editor,
	  credits: () => this.scene = creditsScene,
	});
	this.scene = this.menu;
  }

  start() {
	window.requestAnimationFrame(this.getAnimationFrameCallback());
  }

  update(dt) {
	this.scene.update(dt, this.input);
	this.input.justReleasedKeys.clear();
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
  constructor(options) {
	this.options = options;
	this.selectedIndex = 0;
  }

  update(dt, input) {
	const numOptions = Object.keys(this.options).length;
	if (input.justReleasedKeys.has("ArrowDown")) {
	  this.selectedIndex++;
	  this.selectedIndex = this.selectedIndex % numOptions;
	}
	if (input.justReleasedKeys.has("ArrowUp")) {
	  this.selectedIndex--;
	  if (this.selectedIndex < 0) {
		this.selectedIndex = numOptions + this.selectedIndex;
	  } else {
		this.selectedIndex = this.selectedIndex % numOptions;
	  }
	}
	if (input.justReleasedKeys.has("Enter")) {
	  const option = Object.keys(this.options)[this.selectedIndex];
	  this.options[option]();
	}
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


class LevelScene {
  constructor(player, levelData, parent) {
	this.player = player;
	this.level = new Level(levelData, constants.PLAYABLE_WIDTH, constants.VIEWABLE_HEIGHT, this.player);
	this.level.reset(levelData);
	this.parent = parent;
  }

  update(dt, input) {
	this.level.update(dt, input);
	if (this.level.finished) {
	  this.exit();
	  return;
	}
	this.player.update(dt, input, this.level);
  }

  draw(ctx, assets) {
	this.level.draw(ctx, assets);
	this.player.draw(ctx, assets, this.level.offset);
  }

  blast(ctx, assets) {
	this.level.blast(ctx, assets);
	this.player.blast(ctx, assets);
  }

  exit() {
	this.parent.tallyUp();
  }
}

class TallyUpScene {
  constructor(parent) {
	this.parent = parent;
	this.timer = 0;
  }

  update(dt, input) {
	this.timer += dt;
	if (this.timer > 3) {
	  this.parent.loadNextLevel();
	  return;
	}
  }

  draw(ctx, assets) {
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.fillStyle = "cyan";
	const oldAlign = ctx.textAlign;
	const oldFont = ctx.oldFont;
	ctx.textAlign = "center";
	ctx.font = "bold 24px serif";
	const midX = Math.round(ctx.canvas.width/2);
	ctx.fillText("TALLY UP", midX, Math.round(ctx.canvas.height*0.4));
	ctx.fillText("HERE", midX, Math.round(ctx.canvas.height*0.6));
	ctx.textAlign = oldAlign;
	ctx.oldFont = oldFont;
  }

  blast(ctx, assets) {
  }
}

class GamePlayScene {
  constructor(levels, hooks) {
	this.player = new Player({x: 100, y: constants.VIEWABLE_HEIGHT - Player.avatarHeight});
	this.levels = levels;
	this.nextLevelIdx = 0;
	this.loadNextLevel();
	this.hooks = hooks;
  }

  tallyUp() {
	this.subscene = new TallyUpScene(this);
  }

  loadNextLevel() {
	const levelId = Object.keys(this.levels)[this.nextLevelIdx];
	this.subscene = new LevelScene(this.player, this.levels[levelId], this);
	console.log("LOADED LEVEL", levelId);
	this.nextLevelIdx = (this.nextLevelIdx + 1) % Object.keys(this.levels).length;
  }

  update(dt, input) {
	this.subscene.update(dt, input);
  }

  draw(ctx, assets) {
	this.subscene.draw(ctx, assets);
  }

  blast(ctx, assets) {
	this.subscene.blast(ctx, assets);
  }

  exit() {
	this.hooks.exit();
  }
}


class PlayTestScene extends LevelScene {
  constructor(player, levelData, editor) {
	super(player, levelData, editor);
	this.level.disableLevelTimer();
  }

  update(dt, input) {
	if (input.justReleasedKeys.has(Input.EDIT)) { 
	  this.exit();
	  return;
	}
	super.update(dt, input);
  }

  exit() {
	this.parent.toggle();
  }
}


class CreditsScene {
  constructor(hooks) {
	this.hooks = hooks;
  }

  exit() {
	this.hooks.exit();
  }

  update(dt, input) {
	if (input.justReleasedKeys.has("Escape")) {
	  this.exit();
	}
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
