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
    constructor(owner, { cooldown, tickrate, chargeTime, duration, mode, key, keys = [], ...options } = {}) {
        super();
        this.owner = owner;
        this.cooldown = cooldown || 0;
        this.tickrate = tickrate || 0;
        this.duration = duration || 0;
        this.chargeTime = chargeTime || 0;
        this.isactive = false;
        this.oncooldown = false;
        this.deltaTimer = -1 / 1e-10;
        this.tickTimer = 0;

        // Properly bind methods
        for (const [k, v] of Object.entries(options))
            if (typeof v === "function") this[k] = v.bind(this);
            else this[k] = v;

        this.keybinds = keys || key;

        this.mode = mode || "Instant";
    }
    notify = (state) => {
        if (this.noNotice) return;
        UI.Popup(`${state} ${this.abilityName}`, game.width / 2, game.height / 2 - this.owner.size, {
            center: true,
            color: "black",
            font: "12px monospace",
        });
    };
    activate = () => {
        if (this.deltaTimer > 0 || this.isactive) return;
        this.isactive = true;
        this.raise("onactivate", this.owner);
        if (this.keybinds?.length !== 0) this.notify("Activated");
        this.deltaTimer = this.duration !== Infinity ? this.duration : 0;
        this.tickTimer = 0;
        this.tick();
    };
    draw = () => {
        this.propagate("draw");
        if (this.isactive) {
            this.propagate("activedraw", this.deltaTimer / this.duration);
            if (this.tickrate !== 0) this.propagate("tickdraw", 1 - this.tickTimer / this.tickrate);
            if (this.deltaTimer <= 0) this.deactivate();
        } else if (this.deltaTimer < 0)
            if (this.charging) this.propagate("chargedraw", clamp(-this.deltaTimer / this.chargeTime, 0, 1));
            else this.propagate("ideldraw", this.deltaTimer);
        else if (this.cooldown !== 0) this.propagate("cooldowndraw", 1 - this.deltaTimer / this.cooldown);
    };
    onupdate = (delta) => {
        // if (this.pause) return;
        this.deltaTimer -= delta;
        this.tickTimer -= delta;
        if (this.oncooldown && this.deltaTimer <= 0) {
            this.oncooldown = false;
            this.notify("Ready");
        }
        if (this.isactive && this.tickTimer <= 0) this.tick();
    };
    tick = () => {
        this.propagate("tick", this.owner);
        this.tickTimer += this.tickrate;
    };
    deactivate = () => {
        if (!this.isactive) return;
        this.isactive = false;
        this.propagate("deactivate", this.owner);
        this.deltaTimer = this.cooldown;
        if (this.cooldown !== 0) this.oncooldown = true;
        if (this.duration !== 0 && this.keybinds?.length !== 0) this.notify("Ended");
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
                this.chargedPercent = clamp(-this.deltaTimer / this.chargeTime, 0, 1);
                this.deltaTimer = 0;
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
