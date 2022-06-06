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

  static spawn(x, y, color, updater) {
	let enemy = this.#INSTANCES.filter(e => !e.live).pop();
	if (typeof enemy == "undefined") {
	  enemy = new Enemy(x, y, color, updater);
	  this.#INSTANCES.push(enemy);
	  console.log("Created new enemy", enemy);
	} else {
	  enemy.init(x, y, color, updater);
	  console.log("Recycled enemy", enemy);
	}
	return enemy;
  }

  constructor(x, y, color, updater) {
	this.init(x, y, color, updater);
  }

  init(x, y, color, updater) {
	this.color = color;
	this.live = true;
	this.x = x;
	this.y = y;
	this.updater = updater;
  }

  update(dt) {
	if (!this.live) {
	  return;
	}
	this.timer += dt;
	// FIXME: we shouldn't need to copy from "updated"
	const updated = this.updater(this, dt);
	this.x = updated.x;
	this.y = updated.y;
	this.live = updated.live;
  }

  draw(ctx) {
	ctx.fillStyle = this.color;
	ctx.beginPath();
	ctx.arc(Math.round(this.x), Math.round(this.y), 10, 0, 2*Math.PI);
	ctx.closePath();
	ctx.fill();
  }
}
