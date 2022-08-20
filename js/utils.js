import {Enemy} from "./enemy.js";
import {Projectile} from "./projectile.js";
import {Prop} from "./prop.js";

export function pointInRectangle(point, rectangle) {
  return point.x > rectangle.x && point.y > rectangle.y && point.x < rectangle.x + rectangle.width && point.y < rectangle.y + rectangle.height;
}

export function getSortedActiveEntities() {
  return Array.from(Enemy.alive()).concat(Array.from(Prop.alive())).sort((e1, e2) => e1.y - e2.y).concat(Array.from(Projectile.alive()));
}
