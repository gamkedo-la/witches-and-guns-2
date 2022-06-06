import {constants} from "./constants.js";
import {Enemy} from "./enemy.js";

function lerp(from, to, amount) {
    return (1 - amount) * from + amount * to;
}

export class Level {
  static gridWidth = 25;
  static gridHeight = 10;
  static tileSize = 16; // pixels
  static #TIMER = 0;
  static #SCROLL_SPEED = 8;

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
	this.offset = 0;	// number of pixels camera has moved to the right
	this.tiles = Array.of(Level.gridWidth*Level.gridHeight);
	this.tiles.fill({});
  }

  scroll(pos) {
	this.offset = lerp(this.offset, (constants.PLAYABLE_WIDTH/constants.VIEWABLE_WIDTH)*pos, 0.12);
	if (this.offset < 0) {
	  this.offset = 0;
	}
	if (this.offset > constants.PLAYABLE_WIDTH - constants.VIEWABLE_WIDTH) {
	  this.offset = constants.PLAYABLE_WIDTH - constants.VIEWABLE_WIDTH;
	}
  }

  update(dt) {
	Level.#TIMER += dt;

	if (Level.#TIMER*1000 > constants.TIME_SLOT) {
	  Level.#TIMER = 0;
	  const enemySpecs = this.levelData[this.waveIndex++];
	  if (typeof enemySpecs != "undefined") {
		for (let i=0; i<enemySpecs.length; i++) {
		  const data = enemySpecs[i];
		  Enemy.spawn(data.x, data.y, data.color, data.updater);
		}
		console.log("Time for a new wave!", this.waveIndex);
	  }
	  this.waveIndex = this.waveIndex % this.levelData.length;
	}
  }

  draw(ctx, assets) {
	ctx.drawImage(assets.levelBG, Math.round(this.offset), 0, ctx.canvas.width, ctx.canvas.height, 0, 0, ctx.canvas.width, ctx.canvas.height);
  }
}
