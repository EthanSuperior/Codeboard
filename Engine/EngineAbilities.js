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
    #mode;
    #keyup;
    #keydown;
    #keypress;
    #keybinds;
    constructor(
        owner,
        { cooldown, chargeTime, duration, mode, onactivate, ondeactivate, ontick, key, keys = [], ...options } = {}
    ) {
        super();
        this.owner = owner;
        this.cooldown = cooldown || 0;
        this.cooldownRemaining = 0;
        this.chargeTime = options.chargeTime || 0;
        this.duration = duration || 0;
        this.isactive = false;

        // Properly bind methods
        this.onactivate = onactivate ? onactivate.bind(this) : () => {};
        this.ondeactivate = ondeactivate ? ondeactivate.bind(this) : () => {};
        this.ontick = ontick ? ontick.bind(this) : () => {};
        this.keybinds = keys || key;

        this.mode = mode || "Instant";
    }
    activate = () => {
        if (this.cooldownRemaining > 0 || this.isactive) return;
        this.isactive = true;
        this.raise("onactivate", this.owner);
        this.cooldownRemaining = this.cooldown; // Reset cooldown
        this.owner.layer.scheduleTask(
            () => {
                console.log(this.duration);
                this.deactivate();
            },
            { time: this.duration }
        );
        //FIXME make it work with duration
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
    get mode() {
        return this.#mode;
    }
    set mode(val) {
        this.#mode = val;
        this.#keydown = undefined;
        this.#keyup = undefined;
        this.#keypress = undefined;
        if (val === "Charge") {
            this.#keydown = () => {
                if (this.charging) return;
                this.cooldownRemaining = 0;
                this.charging = true;
            };
            this.#keyup = () => {
                this.charging = false;
                this.chargeTime = -this.cooldownRemaining;
                this.activate();
            };
        } else if (val === "Channel") {
            if (!this.duration) this.duration = Number.MAX_VALUE;
            this.#keydown = this.activate;
            this.#keyup = this.deactivate;
        } else if (val === "Toggle") {
            this.#keypress = () => {
                if (this.isactive) this.deactivate();
                else this.activate();
            };
        } else if (val === "Passive") {
            this.duration = Number.MAX_VALUE;
            this.activate();
        } else this.#keypress = this.activate;
    }
    get keybinds() {
        return this.#keybinds;
    }
    set keybinds(keys) {
        this.keydownEvents = {};
        this.keypressEvents = {};
        this.keyupEvents = {};
        this.#keybinds = Array.isArray(keys) ? keys : [keys];
        for (const key of this.#keybinds) {
            this.keydownEvents[key] = (e) => this.#keydown?.call(this, e);
            this.keyupEvents[key] = (e) => this.#keyup?.call(this, e);
            this.keypressEvents[key] = (e) => this.#keypress?.call(this, e);
        }
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
            bounds.base = Math.min(bounds.base, bounds.maxBase);
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
        get missingPercent() {
            return this.missing / statBlock.max;
        }
        get base() {
            return bounds.base;
        }
        set base(val) {
            const missing = statBlock.missing,
                prior = statBlock.current;
            bounds.base = val;
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
        }
        get percent() {
            return bounds.current / statBlock.max;
        }
        set percent(val) {
            const missing = statBlock.missing,
                prior = statBlock.current;
            bounds.current = statBlock.max * val;
            statBlock.recalculate(missing, prior);
        }
        get percentBuff() {
            return bounds.percent;
        }
        set percentBuff(val) {
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

function registerAbility(name, options = {}) {
    const upperName = name[0].toUpperCase() + name.slice(1);
    const newAbility = class extends Ability {
        abilityName = upperName;
        constructor(owner, extraOptions = {}) {
            super(owner, { ...options, ...extraOptions });
        }
    };
    AbilityManager.types[upperName] = newAbility;
    AbilityManager.names.push(upperName);
}
