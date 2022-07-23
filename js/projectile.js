export class Projectile {
  static #INSTANCES = [];
  static get(speed, radius, initialPos, target, damage, hooks, imageSpec) {
	const deadInstances = Projectile.#INSTANCES.filter(p => !p.live);
	if (deadInstances.length) {
	  return deadInstances[0].recycle(speed, radius, initialPos, target, damage, hooks, imageSpec);
	} else {
	  const projectile = new Projectile(speed, radius, initialPos, target, damage, hooks, imageSpec);
	  Projectile.#INSTANCES.push(projectile);
	  return projectile;
	}
  }

  static alive = function* () {
	for (const projectile of this.#INSTANCES) {
	  if (projectile.live) {
		yield projectile;
	  }
	}
  }

  /**
   * Create a projectile
   * @param {number} speed - velocity vector
   * @param {{x: number, y: number}} initialPos - initial projectile position
   * @param {{x: number, y: number}} target - projectile target rectangle
   * @param {number} damage - damage projectile deals
   * @param {function[]} hooks - callbacks to call when projectile reaches target
   */
  constructor(speed, radius, initialPos, target, damage, hooks, imageSpec) {
	this.#init(speed, radius, initialPos, target, damage, hooks, imageSpec);
  }

  update(dt) {
	this.position.x += this.velocity.x*dt;
	this.position.y += this.velocity.y*dt;
	this.reachedTarget = this.velocity.y > 0 ? this.position.y > this.target.y + this.target.height : this.position.y < this.target.y;
	if (this.reachedTarget) {
	// if (this.position.y - this.target.height < Math.sign(this.velocity.y)*this.target.y) {
	  this.live = false;
	  this.hooks.forEach(hook => hook(dt, this));
	}
  }

  #init(speed, radius, initialPos, target, damage, hooks, imageSpec) {
	this.position = initialPos;
	this.radius = radius;
	this.target = target;
	this.velocity = {
	  x: speed*(this.target.x - this.position.x),
	  y: speed*(this.target.y - this.position.y)
	};
	this.hooks = hooks;
	this.live = true;
	this.reachedTarget = false;
	this.imageSpec = imageSpec;
	return this;
  }

  recycle(speed, radius, initialPos, target, damage, hooks, imageSpec) {
	this.#init(speed, radius, initialPos, target, damage, hooks, imageSpec);
	return this;
  }

  draw(ctx, assets, offset) {
	const shotDrawPos = {
	  x: this.reachedTarget ? this.target.x : this.position.x,
	  y: this.reachedTarget ? this.target.y : this.position.y,
	};
	ctx.drawImage(assets[this.imageSpec.id], this.imageSpec.sx, this.imageSpec.sy, this.imageSpec.sWidth, this.imageSpec.sHeight, Math.round(shotDrawPos.x - offset - this.imageSpec.sWidth/2), Math.round(shotDrawPos.y - this.imageSpec.sHeight*1.5), this.imageSpec.sWidth, this.imageSpec.sHeight);
  }
}
