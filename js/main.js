import {Input} from "./input.js";
import {Player} from "./player.js";
import {Level} from "./level.js";
import {Enemy} from "./enemy.js";
import {Editor} from "./editor.js";

class Game {
  static dt = 0;
  static updateStep = 1/60;
  static last = window.performance && window.performance.now ? window.performance.now() : new Date().getTime();

  constructor(loadedAssets) {
	const canvas = document.getElementById("gameCanvas");
	this.ctx = canvas.getContext("2d");
	this.assets = loadedAssets;

	this.input = new Input(canvas);
	this.editor = new Editor();
	this.input.onRelease(Input.EDIT, event => {
	  this.editor.toggle();
	  this.currentLevel.reset();
	});
	this.player = new Player({x: 100, y: this.ctx.canvas.height - Player.avatarHeight});
	this.currentLevel = new Level(this.editor.data, this.ctx.canvas.width, this.ctx.canvas.height);
	// this.currentLevel.scroll(this.player.avatarPos.x);
  }

  start() {
	window.requestAnimationFrame(this.getAnimationFrameCallback());
  }

  update(dt) {
	if (this.editor.enabled) {
	  this.editor.update(dt, this.input);
	} else {
	  this.currentLevel.update(dt, this.input);
	  this.player.update(dt, this.input, this.currentLevel);
	}
  }

  draw() {
	this.ctx.fillStyle = this.editor.enabled ? "green" : "gray";
	this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

	if (this.editor.enabled) {
	  this.editor.draw(this.ctx, this.assets);
	} else {
	  this.currentLevel.draw(this.ctx, this.assets);
	  this.player.draw(this.ctx, this.assets);
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

const assetSpecs = [
  {id: "player", path: "images/julhilde.png"},
  {id: "tile", path: "images/tile.png"},
  {id: "levelBG", path: "images/background.gif"},
  {id: "editorUI", path: "images/editorUI.png"},
  {id: "donutSheet", path: "images/donut.png"},
];

async function loadAsset(spec) {
  const image = new Image();
  image.src = spec.path;
  await image.decode();
  return [spec.id, image];
}

function loadAssets() {
  return Promise.all(assetSpecs.map(spec => {
	return loadAsset(spec);
  }));
}

window.onload = function() {
  loadAssets().then(assetsArr => {
	const game = new Game(Object.fromEntries(assetsArr));
	game.start();
  });
};
