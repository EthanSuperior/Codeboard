class EntityManager {
    static types = {};
    static names = [];
    static subtypes = {};
}
// Entity => EntityManager & registerEntity
// ├───Types
// ├───Events (onDamage,IO,etc)
// ├───Controller
// ├───Stats
// ├───Conditions
// ├───Modifiers
// ├───Abilities
// └───Drops[Spread/Jitter]
class Entity extends Interactable {
    constructor() {
        super();
        this.x = 0;
        this.y = 0;
        this.size = 10;
        this.color = "black";
        this.velocity = new Vector();
        AddPublicAccessors(this, "velocity", ["speed", "magnitude"]);
        this.exp = 0;
        this.neededXP = 0;
        this.level = 0;
        this.staticX = false;
        this.staticY = false;
        this.freezeDirection = false;
        this.facingDirection = 0;
        this.groupName = "Entity";
        this.controller = new EntityController(this);
        // const abilities_to_add = Object.entries(this.abilities ?? {});
        // for (let i = 0; i < abilities_to_add.length; i++)
        //     this.addAbility(abilities_to_add[i][1], { keys: abilities_to_add[i][0] });
        this.abilities = {};
        this.effects = {};
        this.stats ??= {};
    }
    get position() {
        return { x: this.x, y: this.y };
    }
    set position({ x, y }) {
        this.x = x;
        this.y = y;
    }
    get direction() {
        return this.velocity.direction;
    }
    set direction(direction) {
        if (this.freezeDirection) return;
        this.velocity.direction = direction;
    }
    propagate = (call, ...args) => {
        const oncall = "on" + call;
        this.raise(oncall, ...args);
        // Call raise on all abilities
        const abilityNames = Object.keys(this.abilities ?? {});
        for (let i = 0; i < abilityNames.length; i++) this.abilities[abilityNames[i]].raise(call, ...args);
        const effectNames = Object.keys(this.effects[oncall] ?? {});
        for (let i = 0; i < effectNames.length; i++) this.effects[oncall][effectNames[i]].call(this, ...args);
    };
    evaluateEffects = (call, amount, ...args) => {
        const oneffects = this.effects["on" + call] ?? {};
        const effectNames = Object.keys(oneffects);
        for (let i = 0; i < effectNames.length; i++)
            amount = oneffects[effectNames[i]].call(this, amount, ...args) ?? amount;
        return amount;
    };
    update = (delta) => {
        this.controller.update(delta);
        if (this.acceleration) this.speed = clamp(this.speed + this.acceleration, 0, this.maxSpeed);
        this.raise("onupdate", delta);
        if (this.speed && this.direction !== null) {
            this.facingDirection = this.direction;
            if (!this.staticX) this.x += Math.cos(this.direction) * this.speed * delta;
            if (!this.staticY) this.y += Math.sin(this.direction) * this.speed * delta;
        }
        if (this.acceleration && this.direction == null) this.speed = 0;
        if (this.pixelPerfect) {
            this.x = Math.round(this.x - 0.5) + 0.5;
            this.y = Math.round(this.y - 0.5) + 0.5;
        }
        if (this.collisions) this.forPossibleCollisons(this.checkCollision);

        const abilityNames = Object.keys(this.abilities);
        for (let i = 0; i < abilityNames.length; i++) this.abilities[abilityNames[i]].update(delta);
    };
    shouldinteract = (mX, mY) => detectCircle(this.x - this.size / 2, this.y - this.size / 2, this.size / 2, mX, mY);
    forPossibleCollisons = (func, ...args) => {
        for (let group of this.collisions) {
            for (let e of this.layer.getEntities(group)) {
                if (group === this.groupName && e.id === this.id) continue;
                this.do(func, e, ...args);
            }
        }
    };
    checkCollision = (e) => {
        if (this.distanceTo(e) <= (this.size + e.size) / 2) {
            this.raise("collide", e);
        }
    };
    collide = (other) => this.raise("oncollide", other);
    spawn = () => {
        if (this.acceleration) this.maxSpeed ??= this.speed;
        this.layer.addEntity(this);
        this.raise("onspawn");
        if (this.lifespan) this.lifeTimer = scheduleTask(() => this.despawn(), { time: this.lifespan });
    };
    do = (func, ...args) => func.call(this, ...args);
    draw = () => {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.rotate) ctx.rotate(this.direction + Math.PI / 2 + (this.rotationalOffset ?? 0));
        drawEntity(this);
        const abilityNames = Object.keys(this.abilities);
        for (let i = 0; i < abilityNames.length; i++) this.abilities[abilityNames[i]].draw();
        this.raise("ondraw");
        ctx.restore();
        if (game.debug) this.shouldinteract(this.size / 2, this.size / 2);
    };
    despawn = () => {
        this.raise("ondespawn");
        if (this.lifeTimer) clearTask(this.lifeTimer);
        this.layer.removeEntity(this);
    };
    angleTowards = (entity) => {
        this.direction = angleTo(this, entity);
    };
    distanceTo = (entity) => distanceTo(this, entity);
    levelup = () => {
        this.level++;
        this.raise("onlevelup");
    };
    addAbility = (ability, options) => {
        this.abilities[ability] = new AbilityManager.types[ability](this, options);
        this.abilities[ability].attach();
    };
    removeAbility = (ability) => {
        this.abilities[ability]?.raise("remove");
        delete this.abilities[ability];
    };
    addEffect = (trigger, effectName, callback) => {
        if (!this.effects[trigger]) this.effects[trigger] = {};
        this.effects[trigger][effectName] = callback;
    };
    removeEffect = (trigger, effectName) => {
        if (!this.effects[trigger]) return;
        delete this.effects[trigger][effectName];
    };
    debugString = () => {
        return JSON.stringify(
            player,
            (k, v) =>
                k === "layer"
                    ? "{...}"
                    : ["controller", "abilities", "parent", "layer"].includes(k)
                    ? Object.keys(v) ?? ""
                    : v,
            1
        ).replace("/  /g", "\n");
    };
    get xp() {
        return this.exp;
    }
    set xp(value) {
        this.exp = value;
        if (!this.neededXP) return;
        while (this.exp >= this.neededXP) {
            this.exp -= this.neededXP;
            this.raise("levelup");
        }
    }
}

// On mouse over:
// UI.Text("", 10, 80, {
//     font: "8px monospace",
//     width: 400,
//     linewrap: true,
//     color: "white",
//     onupdate: () => (playerStats.text = player.debugString()),
// });

function registerEntity(name, options, types) {
    const upperName = name[0].toUpperCase() + name.slice(1);
    const lowerName = name[0].toLowerCase() + name.slice(1);
    const newSubclass =
        name === "Player"
            ? class extends Entity {
                  groupName = upperName;
              }
            : class extends Entity {
                  groupName = upperName;
              };
    AddAccessor(newSubclass, "subtypes", { initial: types });
    globalThis["spawn" + upperName] = (subType, additional) => {
        let newEntity = new newSubclass();
        newEntity = MergeOntoObject(newEntity, game.baseEntity);
        newEntity = MergeOntoObject(newEntity, options);
        newEntity = MergeOntoObject(newEntity, subType);
        newEntity = MergeOntoObject(newEntity, additional);
        newEntity.layer = LayerManager.currentLayer;
        if (newEntity.stats) for (let stat in newEntity.stats) addStat(newEntity, stat, newEntity.stats[stat]);

        newEntity.raise("spawn");
        return newEntity;
    };
    globalThis["forEvery" + upperName + "Do"] = (func, ...args) => {
        LayerManager.getEntities(upperName).forEach((e) => e.do(func, ...args));
    };
    EntityManager.types[upperName] = newSubclass;
    EntityManager.names.push(upperName);
    if (types) {
        EntityManager.subtypes[upperName] = types;
        const typeKeys = Object.keys(types);
        for (let i = 0; i < typeKeys.length; i++) {
            const type = typeKeys[i];
            types[type].type = type;
        }
        globalThis[lowerName + "Types"] = types;
        globalThis["forEvery" + upperName + "TypeDo"] = (func, ...args) => {
            const keys = Object.keys(newSubclass.subtypes);
            for (let i = 0; i < keys.length; i++) func.call(newSubclass.subtypes[keys[i]], ...args);
        };
    }
}
