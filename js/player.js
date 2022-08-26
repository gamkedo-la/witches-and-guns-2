import {Enemy} from "./enemy.js";
import {Projectile} from "./projectile.js";
import {constants} from "./constants.js";
import {getSortedActiveEntities} from "./utils.js";

export class Player {
  static avatarHeight = 32;
  static avatarWidth = 20;
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

  getHitTargetHook() {
	const player = this;
	const hook = function(dt, shot) {
	  for (const entity of getSortedActiveEntities().reverse()) {
		const dist = Math.sqrt(Math.pow(entity.x + entity.width/2 - shot.target.x, 2) + Math.pow(entity.y + entity.height/2 - shot.target.y, 2));
		if (dist <= 16) {
		  entity.hurt(5);
		  if (entity.hp <= 0) {
			player.score += entity.bounty;
		  }
		  break;
		}
	  }
	};
	return hook;
  }

  constructor(startPos) {
	this.lives = 4;
	this.score = 0;
	this.avatarPos = {x: 100, y: startPos.y};
	this.reticlePos = {x: startPos.x + 4, y: startPos.y - 100};
	this.shots = [];
	this.shotDelay = 0;
	this.isShooting = false;
	this.shootingSound = "playerShooting1";
	this.blastQueue = [];
  }

  update(dt, input, level) {
	if (this.lives <= 0) {
	  return;
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
	  this.shots.push(Projectile.spawn(
		this.avatarPos.x + Player.avatarWidth/2,	// starting x
		this.avatarPos.y,	// starting y
		Player.avatarWidth/4,	// width (radius)
		Player.avatarWidth/4,	// height (not used)
		{id: "bullets", sx: 1, sy: 1, sWidth: 8, sHeight: 8},	// image spec
		{x: this.reticlePos.x, y: this.reticlePos.y, width: 3, height: 3},	// target position
		8,	// speed
		10,	// damage
		[this.getHitTargetHook()],
	  ));
	  this.blastQueue.push(this.shootingSound);
	  this.shootingSound = this.shootingSound == "playerShooting1" ? "playerShooting2" : "playerShooting1";
	  this.shotDelay = Player.timeBetweenShots;
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
  }

  draw(ctx, assets, offset) {
	ctx.strokeStyle = this.isShooting ? "lime" : "red";
	ctx.beginPath();
	ctx.arc(Math.round(this.reticlePos.x - offset), Math.round(this.reticlePos.y), Math.round(Player.avatarWidth/2), 0, 2*Math.PI);
	ctx.stroke();
	ctx.drawImage(assets.player, 50, 0, 20, 32, Math.round(this.avatarPos.x - offset), Math.round(this.avatarPos.y), 20, 32);
	ctx.strokeStyle = "green";
	ctx.strokeRect(Math.round(this.avatarPos.x - offset), Math.round(this.avatarPos.y), Player.avatarWidth, Player.avatarHeight);
	this.drawScore(ctx, assets);
  }

  drawScore(ctx, assets) {
	const oldAlign = ctx.textAlign;
	const oldFont = ctx.oldFont;
	ctx.fillStyle = "white";
	ctx.font = "16px sans";
	ctx.textAlign = "right";
	const scoreStr = (this.score).toString().padStart(8, "0");
	ctx.fillText(scoreStr, Math.round(ctx.canvas.width/4), 16);
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

  die(enemy, shot) {
	if (this.lives <= 0) {
	  return;
	}
	this.lives--;
	console.log("KILLED BY", enemy, "WITH", shot, "LIVES REMAINING", this.lives);
  }
}
