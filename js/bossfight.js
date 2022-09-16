import {Boss} from "./enemy.js";
import {Level} from "./level.js";
import {Projectile} from "./projectile.js";


export class BossFight extends Level {
  constructor(data, width, height, player) {
	super(data, width, height, player);
	this.boss = Boss.spawn(width/2, height/2, 45, 32, {id: "expressoGangsterSheet", sx: 0, sy: 0, sWidth: 45, sHeight: 32, animations: {}}, 1000, width/2, {death: "espressoDeath"});
	this.boss.hp = 100;
	this.timer = 0;
  }

  reset(data) {
	this.boss = Boss.spawn(100, 100, 45, 32, {id: "expressoGangsterSheet", sx: 0, sy: 0, sWidth: 45, sHeight: 32, animations: {}}, 1000, 100, {death: "espressoDeath", shoot: "espressoAttack2"});
	this.boss.hp = 100;
	this.timer = 0;
	this.finished = false;
  }

  update(dt) {
	this.timer += dt;
	this.boss.update(this.timer, this.player);
	for (const projectile of Projectile.alive()) {
	  projectile.update(dt);
	}
	if (!(this.boss.live || this.boss.needsUpdate)) {
	  this.finished = true;
	}
	this.activeEntities = [this.boss].concat(Array.from(Projectile.alive()));
  }
}
