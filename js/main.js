import {Input} from "./input.js";
import {Player} from "./player.js";
import {Level} from "./level.js";
import {Editor} from "./editor.js";
import {loadAssets} from "./assets.js";

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
  }

  start() {
	window.requestAnimationFrame(this.getAnimationFrameCallback());
  }

  update(dt) {
	if (this.editor.enabled) {
	  this.editor.update(dt, this.input);
	} else {
	  this.currentLevel.update(dt, this.input);
	  this.player.update(dt, this.input, this.currentLevel, this);
	}
  }

  draw() {
	this.ctx.fillStyle = this.editor.enabled ? "green" : "gray";
	this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

	if (this.editor.enabled) {
	  this.editor.draw(this.ctx, this.assets.images);
	} else {
	  this.currentLevel.draw(this.ctx, this.assets.images);
	  this.player.draw(this.ctx, this.assets.images, this.currentLevel.offset);
	}
  }

  getAnimationFrameCallback() {
	const game = this;
	const runGameStep = function(browserTimeStamp) {
	  Game.dt += Math.min(1, (browserTimeStamp - Game.last) / 1000);
	  while (Game.dt > Game.updateStep) {
		Game.dt -= Game.updateStep;
		game.update(Game.updateStep);
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
