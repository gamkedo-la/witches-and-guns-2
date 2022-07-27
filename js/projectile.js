import {Entity} from "./entity.js";

export class Projectile extends Entity {
  static INSTANCES = [];
  constructor(x, y, width, height, imageSpec, target, speed, damage, hooks) {
	super(x, y, width, height, imageSpec, target, speed, damage, hooks);
	this.init(x, y, width, height, imageSpec, target, speed, damage, hooks);
  }

  init(x, y, width, height, imageSpec, target, speed, damage, hooks) {
	super.init(x, y, width, height, imageSpec, target, speed, damage, hooks);
	this.radius = width;
	this.target = target;
	this.velocity = {
	  x: speed*(this.target.x - this.x),
	  y: speed*(this.target.y - this.y)
	};
	this.hooks = hooks;
	this.reachedTarget = false;
	return this;
  }

  update(dt) {
	this.x += this.velocity.x*dt;
	this.y += this.velocity.y*dt;
	this.reachedTarget = this.velocity.y > 0 ? this.y > this.target.y + this.target.height : this.y < this.target.y;
	if (this.reachedTarget) {
	  this.live = false;
	  this.hooks.forEach(hook => hook(dt, this));
	}
  }

  draw(ctx, assets, offset) {
	const shotDrawPos = {
	  x: this.reachedTarget ? this.target.x : this.x,
	  y: this.reachedTarget ? this.target.y : this.y,
	};
	ctx.drawImage(assets[this.imageSpec.id], this.imageSpec.sx, this.imageSpec.sy, this.imageSpec.sWidth, this.imageSpec.sHeight, Math.round(shotDrawPos.x - offset - this.imageSpec.sWidth/2), Math.round(shotDrawPos.y - this.imageSpec.sHeight*1.5), this.imageSpec.sWidth, this.imageSpec.sHeight);
  }
}
