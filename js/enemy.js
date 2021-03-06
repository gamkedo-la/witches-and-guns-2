import {constants} from "./constants.js";
import {Player} from "./player.js";
import {Projectile} from "./projectile.js";


export class Enemy {
  static #INSTANCES = [];
  static alive = function* () {
	for (const enemy of this.#INSTANCES) {
	  if (enemy.live) {
		yield enemy;
	  }
	}
  }

  static spawn(x, y, imageSpec, endX) {
	let enemy = this.#INSTANCES.filter(e => !e.live).pop();
	if (typeof enemy == "undefined") {
	  enemy = new Enemy(x, y, imageSpec, endX);
	  this.#INSTANCES.push(enemy);
	  console.log("Created new enemy", enemy);
	} else {
	  enemy.init(x, y, imageSpec, endX);
	  console.log("Recycled enemy", enemy);
	}
	return enemy;
  }

  constructor(x, y, imageSpec, endX) {
	this.init(x, y, imageSpec, endX);
  }

  init(x, y, imageSpec, endX) {
	this.imageSpec = imageSpec;
	this.live = true;
	this.startX = this.x = x;
	this.y = y;
	this.width = 32;
	this.height = 32;
	this.endX = endX;
	this.speed = 64;
	this.velX = Math.sign(this.endX - this.startX)*this.speed;
	this.endXTime = (this.endX - this.startX)/this.velX;
	this.endAttackTime = this.endXTime + 2;
	this.attacked = false;
	this.hitTargetHooks = [];
  }

  update(accTime, player) {
	if (!this.live) {
	  return;
	}
	if (accTime < this.endXTime) {
	  this.x = this.startX + this.velX*accTime;
	} else if (accTime < this.endAttackTime) {
	  this.x = this.startX + this.velX*this.endXTime;
	  if (!this.attacked && typeof(player) !== "undefined") {	// NOTE: player can be undefined in editor
		const projectile = Projectile.get(
		  1.5,
		  6,
		  {x: this.x + this.width/2, y: this.y + this.height/2},
		  {x: player.avatarPos.x + Player.avatarWidth*1.5, y: player.avatarPos.y, height: Player.avatarHeight/2},
		  1,
		  this.hitTargetHooks,
		);
		console.log("SHOT", projectile);
		this.attacked = true;
	  }
	} else {
	  this.x = this.endX - this.velX*(accTime - this.endAttackTime);
	  if (this.x + this.width < 0 || this.x > constants.PLAYABLE_WIDTH) {
		this.live = false;
	  }
	}
	// TODO: "accelerate" enemy when it's not visible on-screen
  }

  draw(ctx, assets, offset) {
	ctx.drawImage(assets[this.imageSpec.id], this.imageSpec.sx, this.imageSpec.sy, this.imageSpec.sWidth, this.imageSpec.sHeight, Math.round(this.x - offset), Math.round(this.y), this.width, this.height);
  }
}
