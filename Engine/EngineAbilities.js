/* TODO
Abilities
├───Properties
│   ├───CD/Rate
│   ├───Hold/Channel/Charge/Loop/etc
│   └───Callback
├───Levels?Teirs?Ranks?
├───Attacking
├───Passives
└───Spells->AssignOwnership
*/
class Ability extends Updatable {
    constructor(owner, { onactivate = (player) => {}, ondeactivate = (player) => {}, ontick = (player) => {} }) {
        this.owner = owner;
        this.boundKey = "";
        this.bindMode = "Instant";
        this.cooldown = 0;
        this.cooldownRemaining = 0;
        this.chargeTime = 0;
        this.loop = false;
        this.duration = 0;
        this.onactivate.bind(this, owner);
        this.ondeactivate.bind(this, owner);
        this.ontick.bind(this, owner);
    }
    activate = () => {
        this.isactive = true;
        this.propagate("activate", this.owner);
    };
    onupdate = (delta) => {
        if (this.pause) return;
        this.cooldownRemaining -= delta;
        if (!this.isactive) return;
        if (this.cooldownRemaining > 0) return;
        this.tick();
        this.cooldownRemaining = this.cooldown;
    };
    tick = () => {
        this.propagate("tick", this.owner);
    };
    deactivate = () => {
        this.isactive = false;
        this.propagate("deactivate", this.owner);
    };
    get keybind() {
        return this.boundKey;
    }
    set keybind(key) {
        this.boundKey = key;
        this.owner.keydownEvents[key] = this.activate;
    }
}

class Instant extends Ability {
    constructor(owner, callback) {
        super(owner, { activate: callback });
    }
}
class Hold extends Ability {
    constructor(owner, start, stop, { repeat = (player) => {}, rate } = {}) {
        super(owner, {
            activate: start,
            tick: repeat,
            deactivate: stop,
        });
        this.cooldown = rate;
    }
}

function registerAbility() {}

// TODO: REGISTER EFFECT
