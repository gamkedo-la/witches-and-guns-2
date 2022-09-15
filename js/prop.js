import {Entity} from "./entity.js";

export class Prop extends Entity {
  static INSTANCES = [];
  static KINDS = {
	GRAVE_1: {
	  imageSpec: {
		id: "graveyardProps", sx: 0, sy: 0, sWidth: 32, sHeight: 32
	  },
	},
	GRAVE_2: {
	  imageSpec: {
		id: "graveyardProps", sx: 32, sy: 0, sWidth: 32, sHeight: 32
	  },
	},
	GRAVE_3: {
	  imageSpec: {
		id: "graveyardProps", sx: 64, sy: 0, sWidth: 32, sHeight: 32
	  },
	},
	BUSH_1: {
	  imageSpec: {
		id: "graveyardProps", sx: 0, sy: 32, sWidth: 32, sHeight: 32
	  }
	},
	BUSH_2: {
	  imageSpec: {
		id: "graveyardProps", sx: 32, sy: 32, sWidth: 32, sHeight: 32
	  },
	},
	BUSH_3: {
	  imageSpec: {
		id: "graveyardProps", sx: 64, sy: 32, sWidth: 32, sHeight: 32
	  },
	},
	ROCK_1: {
	  imageSpec: {
		id: "graveyardProps", sx: 0, sy: 64, sWidth: 32, sHeight: 32
	  },
	},
	ROCK_2: {
	  imageSpec: {
		id: "graveyardProps", sx: 32, sy: 64, sWidth: 32, sHeight: 32
	  },
	}
  };
  init(x, y, width, height, imageSpec) {
	super.init(x, y, width, height, imageSpec, 10);
	this.hp = 40;
  }
}
