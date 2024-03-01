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

const addStat = (obj, propertyName, initial) => {
    // Possible temporary hp etc?
    propertyName = propertyName.toLowerCase();
    const subStat = propertyName.slice(3);
    if (propertyName.startsWith("max")) {
        if (!obj[subStat]) addStat(obj, subStat, initial);
        obj[subStat].maxBase = initial;
        delete obj.stats[propertyName];
        return;
    }
    if (propertyName.startsWith("cap")) {
        if (!obj[subStat]) addStat(obj, subStat, initial);
        obj[subStat].cap = initial;
        delete obj.stats[propertyName];
        return;
    }
    const bounds = {
        current: 0,
        base: initial,
        percent: 1,
        flat: 0,
        multiplier: 1,
        maxBase: undefined,
        cap: undefined,
    };
    const statBlock = new (class Stat {
        get missing() {
            return statBlock.max - bounds.current;
        }
        get current() {
            return bounds.current;
        }
        set current(val) {
            bounds.current = statBlock.adjust?.call(obj, statBlock, current, val) ?? val;
            statBlock.change();
        }
        recalculate(missing, prior) {
            bounds.current = clamp(statBlock.max - missing, prior, statBlock.max);
        }
        change() {
            statBlock.onchange?.call(obj, statBlock);
        }
        get internal() {
            return bounds;
        }
        set internal(val) {
            bounds = val;
        }
        get max() {
            const result = (bounds.base * bounds.percent + bounds.flat) * bounds.multiplier;
            if (bounds.cap !== undefined) return Math.min(result, bounds.cap);
            return result;
        }
        get base() {
            return bounds.base;
        }
        set base(val) {
            const missing = statBlock.missing,
                prior = statBlock.current;
            bounds.base = bounds.maxBase !== undefined ? Math.min(val, bounds.maxBase) : val;
            statBlock.recalculate(missing, prior);
        }
        get maxBase() {
            return bounds.maxBase;
        }
        set maxBase(val) {
            const missing = statBlock.missing,
                prior = statBlock.current;
            bounds.maxBase = val;
            statBlock.recalculate(missing, prior);
            bounds.base = Math.min(bounds.base, val);
        }
        get percent() {
            return bounds.percent;
        }
        set percent(val) {
            const missing = statBlock.missing,
                prior = statBlock.current;
            bounds.percent = val;
            statBlock.recalculate(missing, prior);
        }
        get flat() {
            return bounds.flat;
        }
        set flat(val) {
            const missing = statBlock.missing,
                prior = statBlock.current;
            bounds.flat = val;
            statBlock.recalculate(missing, prior);
        }
        get multiplier() {
            return bounds.multiplier;
        }
        set multiplier(val) {
            const missing = statBlock.missing,
                prior = statBlock.current;
            bounds.multiplier = val;
            statBlock.recalculate(missing, prior);
        }
        get cap() {
            return bounds.cap;
        }
        set cap(val) {
            const missing = statBlock.missing,
                prior = statBlock.current;
            bounds.cap = val;
            statBlock.recalculate(missing, prior);
        }
        [Symbol.toPrimitive](hint) {
            return statBlock.current;
        }
    })();
    bounds.current = statBlock.max;
    Object.defineProperty(obj, propertyName, {
        get() {
            return statBlock;
        },
        set(newVal) {
            statBlock.current = newVal;
        },
    });
    AddAccessor(obj, "on" + propertyName + "change", statBlock.onchange);
    obj.stats[propertyName] = statBlock;
};

function registerAbility() {}

// TODO: REGISTER EFFECT
