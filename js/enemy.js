function stand(actor, dt) {
}


export const CHARACTERS = {
  ghost: {costume: "ghost.png", role: stand, animations: []},
  zombie: {costume: "zombie.png", role: stand, animations: []},
};

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
	this.velX = Math.sign(this.endX - this.startX)*20;
	this.endXTime = (this.endX - this.startX)/this.velX;
  }

  update(accTime) {
	if (!this.live) {
	  return;
	}
	if (accTime < this.endXTime) {
	  this.x = this.startX + this.velX*accTime;
	} else {	// TODO: introduce "stop and maybe shoot" time here
	  this.x = this.endX - this.velX*(accTime - this.endXTime);
	}
	// TODO: "accelerate" enemy when it's not visible on-screen
  }

  draw(ctx, assets, offset) {
	ctx.drawImage(assets[this.imageSpec.id], this.imageSpec.sx, this.imageSpec.sy, this.imageSpec.sWidth, this.imageSpec.sHeight, Math.round(this.x - offset), Math.round(this.y), this.width, this.height);
  }
}
