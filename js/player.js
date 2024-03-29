import {Animation} from "./animation.js";
import {Enemy} from "./enemy.js";
import {Projectile} from "./projectile.js";
import {constants} from "./constants.js";
import {getSortedActiveEntities, pointInRectangle} from "./utils.js";
import {Item} from "./item.js";
import {Prop} from "./prop.js";

export class Player {
  static avatarHeight = 49;
  static avatarWidth = 28;
  static reticleSpeed = 270;
  static avatarSpeed = 120;
  static timeToRespawn = 3;
  static respawnInvincibilityTime = 2;
  static player1ImageSpec = {
	id: "player1Back",
	sx: 8,
	sy: 0,
	sWidth: 27,
	sHeight: 48,
	animations: {
	  move: [
		{id: "player1Side", sx: 0, sy: 0, sWidth: 49, sHeight: 50, time: 90},
		{id: "player1Side", sx: 50, sy: 0, sWidth: 51, sHeight: 50, time: 90},
		{id: "player1Side", sx: 0, sy: 50, sWidth: 49, sHeight: 50, time: 90},
		{id: "player1Side", sx: 50, sy: 50, sWidth: 51, sHeight: 50, time: 90},
	  ],
	  // shoot: [],
	  // death: [],
	}
  };
  static player2ImageSpec = {
	id: "player2",
	sx: 0,
	sy: 0,
	sWidth: 28,
	sHeight: 49,
	animations: {
	  move: [
		{id: "player2", sx: 31, sy: 0, sWidth: 34, sHeight: 49, time: 180},
		{id: "player2", sx: 31, sy: 49, sWidth: 34, sHeight: 49, time: 180},
		{id: "player2", sx: 31, sy: 0, sWidth: 34, sHeight: 49, time: 180},
		{id: "player2", sx: 31, sy: 100, sWidth: 34, sHeight: 49, time: 180},
	  ],
	  // shoot: [],
	  // death: [],
	}
  };

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

  setBoss(boss) {
	this.boss = boss;
  }

  unsetBoss() {
	this.boss = null;
  }

  getTargets() {
	const targets = getSortedActiveEntities().reverse();
	if (this.boss && this.boss.live) {
	  targets.push(this.boss);
	}
	return targets;
  }

  getHitTargetHook() {
	const player = this;
	const hook = function(dt, shot) {
	  for (const entity of player.getTargets()) {
		if (!entity.live) {
		  continue;
		}
		const dist = Math.sqrt(Math.pow(entity.x + entity.width/2 - shot.target.x, 2) + Math.pow(entity.y + entity.height/2 - shot.target.y, 2));
		if (dist <= 16) {
		  entity.hurt(5);
		  if (entity.hp <= 0) {
			player.score += entity.bounty;
			if (entity instanceof Enemy) {
			  player.levelStats.kills++;
			} else if (entity instanceof Prop) {
			  player.levelStats.vandalism++;
			}
		  }
		  break;
		}
	  }
	};
	return hook;
  }

  constructor(startPos, imageSpec, gun) {
	this.lives = 4;
	this.score = 0;
	this.avatarPos = {x: 100, y: startPos.y};
	this.reticlePos = {x: startPos.x + 4, y: startPos.y - 100};
	this.shots = [];
	this.shotDelay = 0;
	this.isShooting = false;
	this.blastQueue = [];
	this.wasKilled = false;
	this.respawnTimer = 0;
	this.respawning = true;
	this.invincibleTimer = 0;
	this.gun = gun;
	this.levelStats = {
	  kills: 0,
	  items: 0,
	  vandalism: 0,
	};
	this.facing = "front";
	this.imageSpec = imageSpec;
	this.currentAnimation = null;
  }

  resetLevelStats() {
	this.levelStats.kills = 0;
	this.levelStats.items = 0;
	this.levelStats.vandalism = 0;
  }

  update(dt, input, level) {
	if (this.lives <= 0) {
	  return;
	}
	if (this.currentAnimation !== null) {
	  this.currentAnimation.update(dt);
	}
	if (this.wasKilled) {
	  if (this.respawnTimer < Player.timeToRespawn && (this.currentAnimation === null || !this.currentAnimation.playing)) {
		this.respawnTimer += dt;
		return;
	  } else {
		this.respawnTimer = 0;
		this.wasKilled = false;
		this.invincibleTimer = Player.respawnInvincibilityTime;
	  }
	}
	if (this.invincibleTimer > 0) {
	  this.invincibleTimer -= dt;
	}
	this.shots = this.shots.filter(shot => shot.live);
	if (!input.shoot) {
	  if (input.left) {
        let boost = input.dodgeLeftUntil>performance.now() ? constants.DODGE_SPEED_BOOST : 1;
        this.avatarPos.x = Math.max(0, this.avatarPos.x - Player.avatarSpeed*dt*boost);
	  }
	  if (input.right) {
        let boost = input.dodgeRightUntil>performance.now() ? constants.DODGE_SPEED_BOOST : 1;
		this.avatarPos.x = Math.min(level.width - Player.avatarWidth, this.avatarPos.x + Player.avatarSpeed*dt*boost);
	  }
	  this.isShooting = false;
	} else if (this.shotDelay <= 0) {
	  this.isShooting = true;
      let gunx = constants.GUN_BARREL_OFFSETX; // this was 0 but the art when centered has gun on right anyways
      if (this.facing=="right") gunx = constants.GUN_BARREL_OFFSETX;
      if (this.facing=="left") gunx = -1 * constants.GUN_BARREL_OFFSETX;
      const shots = this.gun.fire(
		this.avatarPos.x + Player.avatarWidth/2 + gunx, // starting x
		this.avatarPos.y + constants.GUN_BARREL_OFFSETY, // starting y
		{x: this.reticlePos.x, y: this.reticlePos.y, width: 3, height: 3},	// target rectangle
		[this.getHitTargetHook()],
	  );
	  this.shots.push(...shots);
	  this.blastQueue.push(this.gun.shootingSound);
	  this.shotDelay = this.gun.timeBetweenShots;
	  this.currentAnimation = typeof(this.imageSpec.animations.shoot) == "undefined" ? null : new Animation(this.imageSpec.animations.death);
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
      // possible dodge due to a double tap
      if (input.dodgeRight) {
      }
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
	const avatarRect = Object.assign({width: Player.avatarWidth, height: Player.avatarHeight}, this.avatarPos);
	for (const item of Item.alive()) {
	  const itemMidPoint = {x: item.x + item.width/2, y: item.y + item.height/2};
	  if (pointInRectangle(itemMidPoint, avatarRect)) {
		// TODO: apply power-up here
		item.die();
		this.levelStats.items++;
	  }
	}
	if (input.right) {
	  if (this.facing !== "right") {
		this.facing = "right";
		this.currentAnimation = new Animation(this.imageSpec.animations.move, false, true);
	  }
	} else if (input.left) {
	  if (this.facing !== "left") {
		this.facing = "left";
		this.currentAnimation = new Animation(this.imageSpec.animations.move, true, true);
	  }
	} else {
	  if (this.facing !== "front") {
		this.facing = "front";
		this.currentAnimation = null;
	  }
	}
  }

  draw(ctx, assets, offset) {
	this.drawScore(ctx, assets);
	this.drawLives(ctx, assets);
	if (this.wasKilled) {
	  return;
	} else {
	  ctx.strokeStyle = this.isShooting ? "lime" : "red";
	  ctx.beginPath();
	  this.gun.drawReticle(ctx, assets, this.reticlePos.x - offset, this.reticlePos.y);
	}
	this.drawAvatar(ctx, assets, offset);
  }

  drawAvatar(ctx, assets, offset) {
	const oldAlpha = ctx.globalAlpha;
	if (this.invincibleTimer > 0 && this.invincibleTimer % 0.5 > 0.2) {
	  ctx.globalAlpha = 0.01;
	}
	const x = Math.round(this.avatarPos.x - offset);
	const y = Math.round(this.avatarPos.y);
	if (this.currentAnimation === null) {
	  ctx.drawImage(assets[this.imageSpec.id], this.imageSpec.sx, this.imageSpec.sy, this.imageSpec.sWidth, this.imageSpec.sHeight, x, y, this.imageSpec.sWidth, this.imageSpec.sHeight);
	} else {
	  this.currentAnimation.draw(ctx, assets, x, y);
	}
	ctx.globalAlpha = oldAlpha;
  }

  drawScore(ctx, assets) {
	const oldAlign = ctx.textAlign;
	const oldFont = ctx.oldFont;
	ctx.fillStyle = "white";
	ctx.font = "16px sans";
	ctx.textAlign = "right";
	const scoreStr = (this.score).toString().padStart(8, "0");
	ctx.fillText(scoreStr, Math.round(ctx.canvas.width/3.5), 16);
	ctx.textAlign = oldAlign;
	ctx.font = oldFont;
  }

  drawLives(ctx, assets) {
	const oldAlign = ctx.textAlign;
	const oldFont = ctx.oldFont;
	ctx.textAlign = "left";
	ctx.font = "10px sans";
	ctx.fillStyle = "pink";
	ctx.fillText("1P:", 4, 16);
	ctx.font = "bold 12px sans";
	ctx.fillStyle = "white";
	ctx.fillText(this.lives.toString(), 24, 16);
	ctx.textAlign = oldAlign;
	ctx.font = oldFont;
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

  takeShot(enemy, shot) {
	if (this.lives <= 0 || this.wasKilled || this.invincibleTimer > 0) {
	  return;
	}
	this.blastQueue.push("playerDeath");
	this.die();
  }

  die() {
	this.lives--;
	this.wasKilled = true;
	this.currentAnimation = typeof(this.imageSpec.animations.death) == "undefined" ? null : new Animation(this.imageSpec.animations.death);
  }
}


export class Gun {
  constructor() {
	this.timeBetweenShots = 1/9;
	this.speed = 8;
	this.damage = 10;
	this.imageSpec = {id: "bullets", sx: 1, sy: 1, sWidth: 8, sHeight: 8};
	this.bulletWidth = Player.avatarWidth/4;
	this.bulletHeight = Player.avatarWidth/4;
	this.shootingSound = "playerShooting1";
  }

  fire(x, y, target, hitTargetHooks) {
	return [Projectile.spawn(x, y, this.bulletWidth, this.bulletHeight, this.imageSpec, target, this.speed, this.damage, hitTargetHooks)];
  }

  drawReticle(ctx, assets, x, y) {
	ctx.arc(Math.round(x), Math.round(y), Math.round(Player.avatarWidth/2), 0, 2*Math.PI);
	ctx.stroke();
  }
}


export class ShotGun extends Gun {
  constructor() {
	super();
	this.timeBetweenShots = 1/5;
	this.speed = 10;
	this.damage = 6;
	this.imageSpec = {id: "bullets", sx: 1, sy: 1, sWidth: 8, sHeight: 8};
	this.bulletWidth = Player.avatarWidth/5;
	this.bulletHeight = Player.avatarWidth/5;
	this.shootingSound = "explosion2";
  }

  fire(x, y, target, hitTargetHooks) {
	return [
	  Projectile.spawn(
		x, y, this.bulletWidth, this.bulletHeight,
		this.imageSpec,
		{x: target.x - 4, y: target.y - 2, width: target.width, height: target.height},
		this.speed, this.damage,
		hitTargetHooks,
	  ),
	  Projectile.spawn(
		x, y, this.bulletWidth, this.bulletHeight,
		this.imageSpec,
		{x: target.x + 4, y: target.y - 2, width: target.width, height: target.height},
		this.speed, this.damage,
		hitTargetHooks,
	  ),
	  Projectile.spawn(
		x, y, this.bulletWidth, this.bulletHeight,
		this.imageSpec,
		{x: target.x - 4, y: target.y + 2, width: target.width, height: target.height},
		this.speed, this.damage,
		hitTargetHooks,
	  ),
	  Projectile.spawn(
		x, y, this.bulletWidth, this.bulletHeight,
		this.imageSpec,
		{x: target.x + 4, y: target.y + 2, width: target.width, height: target.height},
		this.speed, this.damage,
		hitTargetHooks,
	  ),
	];
  }

  drawReticle(ctx, assets, x, y) {
	ctx.strokeRect(Math.round(x), Math.round(y), Math.round(Player.avatarWidth), Math.round(Player.avatarWidth/1.5));
  }
}
