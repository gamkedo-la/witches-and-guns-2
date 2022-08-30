import {Animation} from "./animation.js";

export class Entity {
  // NOTE: INSTANCES static attribute must be provided by subclasses
  static alive = function* () {
	for (const entity of this.INSTANCES) {
	  if (entity.needsUpdate) {
		yield entity;
	  }
	}
  }

  static spawn(...args) {
	let entity = this.INSTANCES.filter(e => !(e.live || e.needsUpdate)).pop();
	if (typeof entity == "undefined") {
	  entity = new this(...args);
	  this.INSTANCES.push(entity);
	  console.log("Created new entity", entity);
	} else {
	  console.log("Recycling entity", entity);
	  entity.init(...args);
	}
	return entity;
  }
  constructor(x, y, width, height, imageSpec, ...rest) {
	this.init(x, y, width, height, imageSpec, ...rest);
  }

  init(x, y, width, height, imageSpec, bounty, ...rest) {
	this.live = true;
	this.needsUpdate = true;
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.imageSpec = imageSpec;
	this.hp = 10;
	this.blastQueue = [];
	this.beingHurt = false;
	this.enableHurtFX = true;
	this.bounty = bounty || 10;
	this.currentAnimation = null;
	this.prevAccTime = 0;
	this.hp = 10;
  }

  update(accTime, player) {
	const dt = accTime - this.prevAccTime;
	this.prevAccTime = accTime;
	if (this.live && this.hp <= 0) {
	  this.die();
	}
	if (this.beingHurt && performance.now() - this.hurtTime >= 90) {
	  this.beingHurt = false;
	}
	if (this.currentAnimation !== null) {
	  this.currentAnimation.update(dt);
	}
	this.needsUpdate = this.live || (this.currentAnimation !== null && this.currentAnimation.playing);
  }

  draw(ctx, assets, offset) {
	if (this.currentAnimation !== null && this.currentAnimation.playing) {
	  this.currentAnimation.draw(ctx, assets, this.x - offset, this.y);
	  return;
	}
	if (!this.live) {
	  return;
	}
	ctx.drawImage(assets[this.imageSpec.id], this.imageSpec.sx, this.imageSpec.sy, this.imageSpec.sWidth, this.imageSpec.sHeight, Math.round(this.x - offset), Math.round(this.y), this.width, this.height);
	if (this.beingHurt && this.enableHurtFX) {
	  const oldCompOp = this.globalCompositeOperation;
	  ctx.globalCompositeOperation = "source-over";
	  ctx.fillStyle = "red";
	  const oldAlpha = ctx.globalAlpha;
	  ctx.globalAlpha = 0.6;
	  ctx.arc(Math.round(this.x + this.width/2 - offset), Math.round(this.y + this.height/2), Math.round(this.width/2), 0, Math.PI*2);
	  ctx.fill();
	  ctx.globalCompositeOperation = oldCompOp;
	  ctx.globalAlpha = oldAlpha;
	}
  }

  blast(ctx, assets) {
	while (this.blastQueue.length > 0) {
	  const soundSpec = this.blastQueue.pop();
	  const source = ctx.createBufferSource();
	  source.buffer = assets[soundSpec];
	  source.connect(ctx.destination);
	  source.start();
	}
  }

  hurt(damage) {
	if (this.live && !this.beingHurt) {
	  this.hp -= damage;
	  this.beingHurt = true;
	  this.hurtTime = performance.now();
	  if (this.imageSpec.animations && this.imageSpec.animations.hurt) {
		this.currentAnimation = new Animation(this.imageSpec.animations.hurt);
	  }
	}
  }

  die() {
	if (this.imageSpec.animations && this.imageSpec.animations.death) {
	  this.currentAnimation = new Animation(this.imageSpec.animations.death);
	}
	this.live = false;
	this.beingHurt = false;
  }
}
