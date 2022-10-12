export const constants = {
  TIME_SLOT: 250,	// ms
  VIEWABLE_WIDTH: 426,
  VIEWABLE_HEIGHT: 240,
  PLAYABLE_WIDTH: 500,
  DODGE_ENABLED: true, // set to false for regular movement only
  DODGE_DOUBLE_TAP_TIMING: 250, // ms between double taps to trigger a dodge
  DODGE_TIMESPAN: 250, // how long you get the speed boost for
  DODGE_SPEED_BOOST: 4, // speed is multiplied by this
  GUN_BARREL_OFFSETX: 12, // so the bullets don't fly out of your head
  GUN_BARREL_OFFSETY: 8,
  PROJECTILE_TRAILS_ENABLED: true, // false to remove all trails
  BULLET_TRAIL_ALPHA: 0.25, // 1.0 is fully opaque
  BULLET_TRAIL_XOFFSET: -4, // the bullet sprites are not centered so we need to shift from the corner to the middle
  BULLET_TRAIL_YOFFSET: -4,
  
};
Object.freeze(constants);
