import {constants} from "./constants.js";
import {Enemy} from "./enemy.js";

function lerp(from, to, amount) {
    return (1 - amount) * from + amount * to;
}

export class Level {
  static gridWidth = 25;
  static gridHeight = 10;
  static tileSize = 16; // pixels
  static #WAVE_TIMER = 0;
  static #SCROLL_SPEED = 256;

  static getXForGridIndex(i) {
	return i % Level.gridWidth;
  }

  static getYForGridIndex(i) {
	return Math.floor(i/Level.gridWidth);
  }

  constructor(data, width, height) {
	const tilesCanvas = document.createElement("canvas");
	this.tilesCtx = tilesCanvas.getContext("2d");
	this.levelData = data;
	this.waveIndex = 0;
	this.width = width;
	this.offset = 0;	// number of pixels camera has moved to the right
	this.tiles = Array.of(Level.gridWidth*Level.gridHeight);
	this.tiles.fill({});
	this.enemyClock = 0;
  }

  reset() {
	this.enemyClock = 0;
	this.waveIndex = 0;
	this.offset = 0;
  }

  scrollLeft(dt) {
	this.offset = Math.max(0, this.offset - Level.#SCROLL_SPEED*dt);
  }
  scrollRight(dt) {
	this.offset = Math.min(this.offset + Level.#SCROLL_SPEED*dt, this.width - constants.VIEWABLE_WIDTH);
  }

  update(dt) {
	Level.#WAVE_TIMER += dt;

	if (Level.#WAVE_TIMER*1000 > constants.TIME_SLOT) {
	  Level.#WAVE_TIMER = 0;
	  const enemySpecs = this.levelData[this.waveIndex++];
	  if (typeof enemySpecs != "undefined") {
		for (let i=0; i<enemySpecs.length; i++) {
		  const data = enemySpecs[i];
		  Enemy.spawn(data.x, data.y, data.imageSpec, data.endX);
		}
		console.log("Time for a new wave!", this.waveIndex);
	  }
	  this.waveIndex = this.waveIndex % this.levelData.length;
	}
	this.enemyClock += dt;
	for (const enemy of Enemy.alive()) {
	  enemy.update(this.enemyClock);
	  if (enemy.x + enemy.width < 0 || enemy.x > this.width) {
		enemy.live = false;
	  }
	}
  }

  draw(ctx, assets) {
	ctx.drawImage(assets.levelBG, Math.round(this.offset), 0, ctx.canvas.width, ctx.canvas.height, 0, 0, ctx.canvas.width, ctx.canvas.height);
	for (const enemy of Enemy.alive()) {
	  enemy.draw(ctx, assets, this.offset);
	}
  }
}
