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
    attach = () => {
        this.propagate("attach", this.owner);
    };
    remove = () => {
        this.deactivate();
        this.propagate("remove", this.owner);
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
            if (this.deltaTimer <= 0 && this.duration !== Infinity) this.deactivate();
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
        if (!this.isactive && this.mode === "Passive") this.activate();
        else if (this.isactive && this.tickTimer <= 0) this.tick();
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
