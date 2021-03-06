import {Enemy} from "./enemy.js";
import {Projectile} from "./projectile.js";
import {constants} from "./constants.js";

export class Player {
  static avatarHeight = 32;
  static avatarWidth = 8;
  static reticleSpeed = 270;
  static avatarSpeed = 120;
  static timeBetweenShots = 1/9;

  static getAxis = function(up, down, left, right) {
	let axis = { x: 0, y: 0 };

	if (up) axis.y += -1;
	else if (down) axis.y += 1;

	if (left) axis.x += -1;
	else if (right) axis.x += 1;

	return axis;
  }

  static clampNorm = function(vel, max) {
	const n = Math.sqrt(Math.pow(vel.x, 2) + Math.pow(vel.y, 2));
	const f = Math.min(n, max) / n;
	return {x: f*vel.x, y: f*vel.y};
  }

  // TODO: move to game code
  static onHitTarget = function(dt, shot) {
	for (const enemy of Enemy.alive()) {
	  const dist = Math.sqrt(Math.pow(enemy.x + enemy.width/2 - shot.target.x, 2) + Math.pow(enemy.y + enemy.height/2 - shot.target.y, 2));
		if (dist <= 16) {
		  enemy.live = false;
		}
	}
  }

  constructor(startPos) {
	this.avatarPos = {x: 100, y: startPos.y};
	this.reticlePos = {x: startPos.x + 4, y: startPos.y - 100};
	this.shots = [];
	this.shotDelay = 0;
	this.hitTargetHooks = [Player.onHitTarget];
	this.isShooting = false;
	this.shootingSound = "playerShooting1";
  }

  update(dt, input, level, game) {
	this.shots = this.shots.filter(shot => shot.live);
	if (!input.shoot) {
	  if (input.left) {
		this.avatarPos.x = Math.max(0, this.avatarPos.x - Player.avatarSpeed*dt);
	  }
	  if (input.right) {
		this.avatarPos.x = Math.min(level.width - Player.avatarWidth, this.avatarPos.x + Player.avatarSpeed*dt);
	  }
	  this.isShooting = false;
	} else if (this.shotDelay <= 0) {
	  this.isShooting = true;
	  this.shots.push(Projectile.get(
		8,
		Player.avatarWidth/2,
		{x: this.avatarPos.x + Player.avatarWidth/2, y: this.avatarPos.y},
		{x: this.reticlePos.x, y: this.reticlePos.y, height: 3},
		10,
		this.hitTargetHooks,
	  ));
	  this.shotDelay = Player.timeBetweenShots;
	  const source = game.audioCtx.createBufferSource();
	  source.buffer = game.assets.sounds[this.shootingSound];
	  this.shootingSound = this.shootingSound == "playerShooting1" ? "playerShooting2" : "playerShooting1";
	  source.connect(game.audioCtx.destination);
	  source.start();
	}
	this.shotDelay -= dt;
	const cv = Player.getAxis(input.up, input.down, input.left, input.right);
	if (!(cv.x === 0 && cv.y === 0)) {
	  const vel = Player.clampNorm({
		x: cv.x*Player.reticleSpeed,
		y: cv.y*Player.reticleSpeed,
	  }, Player.reticleSpeed);
	  this.reticlePos.x += vel.x*dt;
	  this.reticlePos.y += vel.y*dt;
	}
	const screenX = this.avatarPos.x - level.offset;
	if (screenX > constants.VIEWABLE_WIDTH*(2/3)) {
	  level.scrollRight(dt);
	}
	if (screenX < constants.VIEWABLE_WIDTH/3) {
	  level.scrollLeft(dt);
	}
	if (this.reticlePos.x < level.offset + Player.avatarWidth/2) {
	  this.reticlePos.x = level.offset + Player.avatarWidth/2;
	}
	if (this.reticlePos.x  > level.offset + constants.VIEWABLE_WIDTH - Player.avatarWidth/2) {
	  this.reticlePos.x = level.offset + constants.VIEWABLE_WIDTH - Player.avatarWidth/2;
	}
	if (this.reticlePos.y < Player.avatarWidth/2) {
	  this.reticlePos.y = Player.avatarWidth/2;
	}
	if (this.reticlePos.y  > constants.VIEWABLE_HEIGHT - Player.avatarHeight) {
	  this.reticlePos.y = constants.VIEWABLE_HEIGHT - Player.avatarHeight;
	}
  }

  draw(ctx, assets, offset) {
	ctx.strokeStyle = this.isShooting ? "lime" : "red";
	ctx.beginPath();
	ctx.arc(Math.round(this.reticlePos.x - offset), Math.round(this.reticlePos.y), Math.round(Player.avatarWidth), 0, 2*Math.PI);
	ctx.stroke();
	ctx.drawImage(assets.player, 50, 0, 20, 32, Math.round(this.avatarPos.x - offset), Math.round(this.avatarPos.y), 20, 32);
  }
}
