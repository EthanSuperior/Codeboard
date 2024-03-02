class AbilityManager {
    static types = {};
    static names = [];
}

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

// Cooldown is currently tickrate, make it actually cooldown... and add tickrate as a seperate thing
class Ability extends Interactable {
    constructor(owner, options = {}) {
        super();
        this.owner = owner;
        this.boundKey = "";
        this.bindMode = options.bindMode || "Charge"; // Default to Instant if not specified
        this.cooldown = options.cooldown || 0;
        this.cooldownRemaining = 0;
        this.chargeTime = options.chargeTime || 0;
        this.loop = options.loop || false;
        this.duration = options.duration || 0;
        this.isactive = false;

        // Properly bind methods
        this.onactivate = options.onactivate ? options.onactivate.bind(this) : () => {};
        this.ondeactivate = options.ondeactivate ? options.ondeactivate.bind(this) : () => {};
        this.ontick = options.ontick ? options.ontick.bind(this) : () => {};
        if (options.key) this.keybind = options.key; // Automatically sets up keybind if provided
    }
    activate = () => {
        if (this.cooldownRemaining > 0 || this.isactive) return; // Prevent activation if still on cooldown
        this.isactive = true;
        this.raise("onactivate", this.owner);
        this.cooldownRemaining = this.cooldown; // Reset cooldown
        this.owner.layer.scheduleTask(this.deactivate, { time: this.duration });
    };
    onupdate = (delta) => {
        // if (this.pause) return;
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
        if (!this.isactive) return;
        this.isactive = false;
        this.propagate("deactivate", this.owner);
    };
    get keybind() {
        return this.boundKey;
    }
    set keybind(key) {
        this.keydownEvents = {};
        this.keypressEvents = {};
        this.keyupEvents = {};
        this.boundKey = key;
        if (this.bindMode == "Charge") {
            this.keydownEvents[key] = () => {
                if (this.charging) return;
                this.cooldownRemaining = 0;
                this.charging = true;
            };
            this.keyupEvents[key] = () => {
                this.charging = false;
                this.chargeTime = -this.cooldownRemaining;
                this.activate();
            };
        } else if (this.bindMode == "Channel") {
            if (!this.duration) this.duration = Math.infinity;
            this.keydownEvents[key] = this.activate;
            this.keyupEvents[key] = this.deactivate;
        } else this.keyupEvents[key] = this.activate;
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
            if (bounds.current === val) return;
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

function registerAbility(name, options) {
    const upperName = name[0].toUpperCase() + name.slice(1);
    const newAbility = class extends Ability {
        abilityName = upperName;
        constructor(owner) {
            super(owner, options);
        }
    };
    AbilityManager.types[upperName] = newAbility;
    AbilityManager.names.push(upperName);
}
