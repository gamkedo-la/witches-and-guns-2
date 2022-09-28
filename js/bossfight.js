import {UnicornBrainBoss} from "./enemy.js";
import {Level} from "./level.js";
import {Projectile} from "./projectile.js";


export class BossFight extends Level {
  static classMap = {
	unibrain: UnicornBrainBoss,
	default: UnicornBrainBoss,
  };

  constructor(data, width, height, player) {
	super(data, width, height, player);
	const bossClass = BossFight.classMap[data.boss || "default"];
	this.bossPos = {x: width/2, y: height/2};
	this.boss = new bossClass(this.bossPos.x, this.bossPos.y, 1000);
	this.timer = 0;
	this.player.setBoss(this.boss);
  }

  reset(data) {
	const bossClass = BossFight.classMap[data.boss || "default"];
	this.boss = new bossClass(this.bossPos.x, this.bossPos.y, 1000);
	this.timer = 0;
	this.finished = false;
	this.player.setBoss(this.boss);
  }

  update(dt) {
	this.timer += dt;
	this.boss.update(this.timer, this.player);
	for (const projectile of Projectile.alive()) {
	  projectile.update(dt);
	}
	if (!(this.boss.live || this.boss.needsUpdate)) {
	  this.finished = true;
	  this.player.unsetBoss();
	}
	this.activeEntities = [this.boss].concat(Array.from(Projectile.alive()));
  }
}
