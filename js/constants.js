export const constants = {
  TIME_SLOT: 250,	// ms
  VIEWABLE_WIDTH: 426,
  VIEWABLE_HEIGHT: 240,
  PLAYABLE_WIDTH: 800,
  DODGE_ENABLED: true, // set to false for regular movement only
  DODGE_DOUBLE_TAP_TIMING: 250, // ms between double taps to trigger a dodge
  DODGE_TIMESPAN: 250, // how long you get the speed boost for
  DODGE_SPEED_BOOST: 4 // speed is multiplied by this
};
Object.freeze(constants);
