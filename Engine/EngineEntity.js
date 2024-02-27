class EntityManager {
    static types = {};
    static names = [];
    static subtypes = {};
}
class Entity extends Interactable {
    constructor() {
        super();
        this.x = 0;
        this.y = 0;
        this.size = 0;
        this.velocity = new Vector();
        AddPublicAccessors(this, "velocity", ["speed", "direction", "magnitude"]);
        this.exp = 0;
        this.neededXP = 0;
        this.level = 0;
        this.staticX = false;
        this.staticY = false;
        this.facingDirection = 0;
        this.groupName = "Entity";
        this.controller = new EntityController();
    }
    update = (delta) => {
        this.controller.update(delta);
        if (this.acceleration) this.speed = clamp(this.speed + this.acceleration, 0, this.maxSpeed);
        this.raise("onupdate", delta);
        // if (this.groupName == "Player") console.log(this, this.direction, this.speed);
        if (this.speed && this.direction !== null) {
            this.facingDirection = this.direction;
            if (!this.staticX) this.x += Math.cos(this.direction) * this.speed * delta;
            if (!this.staticY) this.y += Math.sin(this.direction) * this.speed * delta;
        }
        if (this.pixelPerfect) {
            this.x = Math.round(this.x - 0.5) + 0.5;
            this.y = Math.round(this.y - 0.5) + 0.5;
        }
        if (this.collisions) this.checkCollision();
    };
    shouldinteract = (mX, mY) =>
        detectRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size, mX, mY);

    checkCollision = () => {
        for (let group of this.collisions) {
            for (let e of this.layer.getEntities(group)) {
                if (group === this.groupName && e.id === this.id) continue;
                // if (this.groupName === "Bullet")
                if (this.distanceTo(e) <= (this.size + e.size) / 2) {
                    // console.log(
                    //     this.distanceTo(e),
                    //     (this.size + e.size) / 2,
                    //     this.distanceTo(e) <= (this.size + e.size) / 2
                    // );
                    // game.background = "red";
                    this.raise("collide", e);
                }
                //  else game.background = "black";
            }
        }
    };
    collide = (other) => this.raise("oncollide", other);
    spawn = () => {
        if (this.acceleration) this.maxSpeed ??= this.speed;
        if (this.hp) this.maxHP ??= this.hp;
        this.layer.addEntity(this);
        this.raise("onspawn");
        if (this.lifespan) this.lifeTimer = scheduleTask(() => this.despawn(), { time: this.lifespan });
    };
    do = (func, ...args) => func.call(this, ...args);
    draw = () => {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.rotate) ctx.rotate(this.direction + Math.PI / 2 + (this.rotationalOffset ?? 0));
        const halfSize = this.size / 2;
        if (this.img) {
            ctx.save();
            ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
            UI.drawImage(this.img, -halfSize, -halfSize, { width: this.size, height: this.size });
            ctx.restore();
            //TODO: ONLOAD ANIMATION CODE
        } else {
            ctx.fillStyle = this.color;
            if (this.shape == "circle") {
                ctx.beginPath();
                ctx.arc(0, 0, halfSize, 0, 2 * Math.PI);
                ctx.fill();
                ctx.closePath();
            } else if (this.shape == "triangle") {
                ctx.beginPath();
                ctx.moveTo(0, -halfSize);
                ctx.lineTo(-halfSize, halfSize);
                ctx.lineTo(halfSize, halfSize);
                ctx.fill();
                ctx.closePath();
            } else if (this.shape == "arrow") {
                ctx.beginPath();
                ctx.moveTo(0, -halfSize);
                ctx.lineTo(-halfSize, halfSize);
                ctx.lineTo(0, halfSize / 2);
                ctx.lineTo(halfSize, halfSize);
                ctx.fill();
                ctx.closePath();
            } else ctx.fillRect(-halfSize, -halfSize, this.size, this.size);
        }
        this.raise("ondraw");
        ctx.restore();
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
    Object.defineProperty(newSubclass, "subtypes", {
        set(value) {
            types = value;
        },
        get() {
            return types;
        },
    });
    // Object.defineProperty(newSubclass, "group", {
    //     value: Array.from({ length: LayerManager.layers.length }, () => []),
    // });
    // newSubclass.group = newSubclass.group[-1] = [];
    // Object.defineProperty(globalThis, lowerName + "Group", {
    //     get() {
    //         return newSubclass.group;
    //     },
    //     set(value) {
    //         newSubclass.group = value;
    //     },
    // });
    globalThis["spawn" + upperName] = (subType, additional) => {
        const newEntity = new newSubclass();
        MergeOntoObject(newEntity, game.settings);
        MergeOntoObject(newEntity, options);
        MergeOntoObject(newEntity, subType);
        MergeOntoObject(newEntity, additional);
        newEntity.layer = LayerManager.currentLayer;
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

class EntityController extends Updatable {}
class PlayerController extends EntityController {
    onupdate = (delta) => {
        this.direction = getPlayerMovementdirectionection();
        // Stop player if no keys are pressed otherwise change your directionection.
        // if (direction == null) this.speed = 0;
        // else this.direction = direction;
    };
}
