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

  static spawn(x, y, color, endX) {
	let enemy = this.#INSTANCES.filter(e => !e.live).pop();
	if (typeof enemy == "undefined") {
	  enemy = new Enemy(x, y, color, endX);
	  this.#INSTANCES.push(enemy);
	  console.log("Created new enemy", enemy);
	} else {
	  enemy.init(x, y, color, endX);
	  console.log("Recycled enemy", enemy);
	}
	return enemy;
  }

  constructor(x, y, color, endX) {
	this.init(x, y, color, endX);
  }

  init(x, y, color, endX) {
	this.color = color;
	this.live = true;
	this.startX = this.x = x;
	this.y = y;
	this.width = 32;
	this.height = 32;
	this.endX = endX;
	this.velX = Math.sign(this.endX - this.startX)*20;
	this.endXTime = (this.endX - this.startX)/this.velX;
	this.imageSpec = {id: "donutSheet", sx: 0, sy: 0, sWidth: this.width, sHeight: this.height};
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
	// TODO: "kill" enemy when it's off-stage
  }

  draw(ctx, assets, offset) {
	ctx.drawImage(assets[this.imageSpec.id], 0, 0, this.imageSpec.sWidth, this.imageSpec.sHeight, Math.round(this.x - offset), Math.round(this.y), this.width, this.height);
  }
}
