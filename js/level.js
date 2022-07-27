import {constants} from "./constants.js";
import {Enemy} from "./enemy.js";
import {Projectile} from "./projectile.js";
import {Prop} from "./prop.js";

function lerp(from, to, amount) {
    return (1 - amount) * from + amount * to;
}

export class Level {
  static #TIMER = 0;
  static #WAVE_TIMER = 0;
  static #SCROLL_SPEED = 256;

  constructor(data, width, height, player) {
	this.levelData = data;
	this.width = width;
	this.offset = 0;	// number of pixels camera has moved to the right
	this.enemies = [];
	this.props = data.props.map(
	  propSpec => Prop.spawn(propSpec.x, propSpec.y, propSpec.width, propSpec.height, propSpec.imageSpec)
	);
	this.player = player;
	this.entitiesToDraw = [];
  }

  reset(data) {
	Level.#TIMER = 0;
	Level.#WAVE_TIMER = 0;
	this.levelData = data;
	this.offset = 0;
	for (const enemy of Enemy.alive()) {
	  enemy.live = false;
	}
	for (const prop of this.props) {
	  prop.live = true;
	}
  }

  scrollLeft(dt) {
	this.offset = Math.max(0, this.offset - Level.#SCROLL_SPEED*dt);
  }
  scrollRight(dt) {
	this.offset = Math.min(this.offset + Level.#SCROLL_SPEED*dt, this.width - constants.VIEWABLE_WIDTH);
  }

  update(dt) {
	Level.#TIMER += dt;
	Level.#WAVE_TIMER += dt;
	const timeIndex = Math.floor(Level.#TIMER*1000/constants.TIME_SLOT);
	if (Level.#WAVE_TIMER*1000 > constants.TIME_SLOT) {
	  if (typeof(this.enemies[timeIndex - 1]) === "undefined") {
		this.enemies[timeIndex - 1] = [];
	  }
	  for (const walkway of Object.keys(this.levelData.walkways).sort()) {
		for (const enemySpec of (this.levelData.walkways[walkway][timeIndex - 1] || [])) {
		  const count = enemySpec.count || 1;
		  for (let i=0; i<count; i++) {
			const endX = enemySpec.endX + i*enemySpec.width;
			const enemy = Enemy.spawn(
			  enemySpec.x + i*enemySpec.width,
			  Number(walkway) - enemySpec.height,
			  enemySpec.width,
			  enemySpec.height,
			  enemySpec.imageSpec,
			  endX,
			  enemySpec.timeToAttack,
			  enemySpec.timeToReturn,
			);
			if (i < count) {
			  const nextEnemy = new Enemy(
				enemySpec.x + (i + 1)*enemySpec.width,
				Number(walkway) - enemySpec.height,
				enemySpec.width,
				enemySpec.height,
				enemySpec.imageSpec,
				endX + (i + 1)*enemySpec.width,
				enemySpec.timeToAttack,
				enemySpec.timeToReturn,
			  );
			  enemy.timeToAttack += enemy.endXTime - nextEnemy.endXTime;
			}
			this.enemies[timeIndex - 1].push(enemy);
		  }
		}
	  }
	  Level.#WAVE_TIMER = 0;
	}
	for (let i=0; i<=timeIndex; i++) {
	  if (typeof this.enemies[i] === "undefined") {
		continue;
	  }
	  for (const enemy of this.enemies[i]) {
		if (enemy.live) {
		  enemy.update(Level.#TIMER - i*constants.TIME_SLOT/1000, this.player);
		}
	  }
	}
	for (const projectile of Projectile.alive()) {
	  projectile.update(dt);
	}
	// TODO: reset when timer reaches max
  }

  draw(ctx, assets) {
	ctx.drawImage(assets.levelBG, Math.round(this.offset), 0, ctx.canvas.width, ctx.canvas.height, 0, 0, ctx.canvas.width, ctx.canvas.height);
	for (const enemy of Enemy.alive()) {
	  enemy.draw(ctx, assets, this.offset);
	}
	for (const walkway of Object.keys(this.levelData.walkways).map(Number).sort((a, b) => a - b).map(ww => ww.toString())) {
	  for (const prop of this.props.filter(prop => prop.live && prop.y < Number(walkway))) {
		prop.draw(ctx, assets, this.offset);
	  }
	}
	for (const projectile of Projectile.alive()) {
	  projectile.draw(ctx, assets, this.offset);
	}
  }
}
