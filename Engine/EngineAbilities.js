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
    constructor(owner, { cooldown, tickrate, duration, mode, key, keys = [], ...options } = {}) {
        super();
        this.owner = owner;
        this.cooldown = cooldown || 0;
        this.deltaTimer = 0;
        this.tickrate = tickrate || 0;
        this.duration = duration || 0;
        this.isactive = false;

        // Properly bind methods
        for (const [k, v] of Object.entries(options)) if (typeof v === "function") this[k] = v.bind(this);

        this.keybinds = keys || key;

        this.mode = mode || "Instant";
    }
    activate = () => {
        if (this.deltaTimer > 0 || this.isactive) return;
        this.isactive = true;
        this.raise("onactivate", this.owner);
        if (this.duration !== 0 && this.duration !== Infinity)
            this.owner.layer.scheduleTask(() => this.deactivate(), { time: this.duration });
        if (this.keybinds?.length !== 0)
            UI.Popup(this.abilityName, game.width / 2, game.height / 2 - this.owner.size, {
                center: true,
                color: "black",
                font: "8px monospace",
            });
    };
    draw = () => {
        if (!this.isactive) {
            if (this.deltaTimer < 0) return;
            this.propagate("cooldowndraw", this.deltaTimer / this.cooldown);
            return;
        }
        this.propagate("draw");
        if (this.duration === 0) this.deactivate();
    };
    onupdate = (delta) => {
        // if (this.pause) return;
        this.deltaTimer -= delta;
        if (!this.isactive) return;
        if (this.deltaTimer > 0) return;
        this.tick();
    };
    tick = () => {
        this.propagate("tick", this.owner);
        this.deltaTimer = this.tickrate;
    };
    deactivate = () => {
        if (!this.isactive) return;
        this.isactive = false;
        this.propagate("deactivate", this.owner);
        this.deltaTimer = this.cooldown;
        if (this.duration !== 0 && this.duration !== Infinity && this.keybinds?.length !== 0)
            UI.Popup(this.abilityName, game.width / 2, game.height / 2 - this.owner.size, {
                center: true,
                color: "black",
                font: "8px monospace",
            });
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
                this.deltaTimer = 0;
                this.charging = true;
            };
            this.#keyup = () => {
                this.charging = false;
                this.tickrate = -this.deltaTimer;
                this.activate();
            };
        } else if (val === "Channel") {
            if (!this.duration) this.duration = Infinity;
            this.#keydown = this.activate;
            this.#keyup = this.deactivate;
        } else if (val === "Toggle") {
            this.#keypress = () => {
                if (this.isactive) this.deactivate();
                else this.activate();
            };
        } else if (val === "Passive") {
            this.duration = Infinity;
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
    if (obj[propertyName]) initial = obj[propertyName];
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
            if (Number.isNaN(val)) debugger;
            if (bounds.current === val) return;
            bounds.current = statBlock.adjust?.call(obj, statBlock, current, val) ?? val;
            statBlock.change();
        }
        recalculate(missing, prior) {
            bounds.base = Math.min(bounds.base, bounds.maxBase ?? bounds.base);
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
            bounds.current = statBlock.max * val;
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
