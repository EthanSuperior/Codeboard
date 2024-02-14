class Entity extends Identifiable {
    static types = {};
    x = 0;
    y = 0;
    size = 0;
    dir = null;
    speed = 0;
    exp = 0;
    neededXP = 0;
    level = 0;
    staticX = false;
    staticY = false;
    groupName = "Entity";
    update = (delta) => {
        if (this.acceleration) this.speed = clamp(this.speed + this.acceleration, 0, this.maxSpeed);
        this.raise("onupdate", delta);
        if (this.speed && this.dir !== null && this.dir !== undefined) {
            if (!this.staticX) this.x += Math.cos(this.dir) * this.speed * delta;
            if (!this.staticY) this.y += Math.sin(this.dir) * this.speed * delta;
        }
        if (this.pixelPerfect) {
            this.x = Math.round(this.x - 0.5) + 0.5;
            this.y = Math.round(this.y - 0.5) + 0.5;
        }
        if (this.collisions) this.checkCollision();
    };
    checkCollision = () => {
        for (let group of this.collisions) {
            for (let e of this.layer.getEntities(group)) {
                if (group === this.groupName && e.id === this.id) continue;
                if (this.groupName === "Bullet")
                    console.log(
                        this.distanceTo(e),
                        (this.size + e.size) / 2,
                        this.distanceTo(e) <= (this.size + e.size) / 2
                    );
                if (this.distanceTo(e) <= (this.size + e.size) / 2) {
                    game.background = "red";
                    this.raise("collide", e);
                } else game.background = "black";
            }
        }
    };
    collide = (other) => this.raise("oncollide", other);
    spawn = () => {
        if (this.acceleration) this.maxSpeed ??= this.speed;
        if (this.hp) this.maxHP ??= this.hp;
        Entity.types[this.groupName].group[this.layer.position].push(this);
        this.raise("onspawn");
        if (this.lifespan) this.lifeTimer = scheduleTask(() => this.despawn(), { time: this.lifespan });
    };
    do = (func, ...args) => func.call(this, ...args);
    draw = () => {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.rotate) ctx.rotate(this.dir + Math.PI / 2 + (this.rotationalOffset ?? 0));
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
    despawn = () => despawnEntity(this);
    angleTowards = (entity) => {
        this.dir = angleTo(this, entity);
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
    set velocityX(value) {
        const velY = this.velocityY;
        if (this.acceleration) this.speed = Math.hypot(value, velY);
        this.dir = Math.atan2(velY, value);
    }
    get velocityX() {
        return this.speed * Math.cos(this.dir);
    }
    get velocityXSign() {
        return Math.abs(this.velocityX) < 1e-10 ? 0 : Math.sign(this.velocityX);
    }
    set velocityY(value) {
        const velX = this.velocityX;
        if (this.acceleration) this.speed = Math.hypot(velX, value);
        this.dir = Math.atan2(value, velX);
    }
    get velocityY() {
        return this.speed * Math.sin(this.dir);
    }
    get velocityYSign() {
        return Math.abs(this.velocityY) < 1e-10 ? 0 : Math.sign(this.velocityY);
    }
}

function registerEntity(name, options, types) {
    const upperName = name[0].toUpperCase() + name.slice(1);
    const lowerName = name[0].toLowerCase() + name.slice(1);
    const newSubclass = class extends Entity {
        static group;
        static get subtypes() {
            return types;
        }
        static set subtypes(value) {
            types = value;
        }
        groupName = name;
    };
    newSubclass.group = Array.from({ length: LayerManager.children.length }, () => []);
    newSubclass.group[-1] = [];
    newSubclass.prototype.groupName = name;
    Object.defineProperty(globalThis, lowerName + "Group", {
        get() {
            return newSubclass.group;
        },
        set(value) {
            newSubclass.group = value;
        },
    });
    globalThis["spawn" + upperName] = (subType, additional) => {
        const newEntity = new newSubclass();
        Object.assign(newEntity, game.settings);
        Object.assign(newEntity, options);
        Object.assign(newEntity, subType);
        Object.assign(newEntity, additional);

        Object.keys(newEntity).forEach((key) => {
            if (key.startsWith("on")) {
                const eventName = key.substring(2);
                if (!newEntity[eventName]) newEntity[eventName] = (...args) => newEntity.raise(key, ...args);
            }
        });
        newEntity.layer = LayerManager.currentLayer;
        newEntity.raise("spawn");
        return newEntity;
    };
    globalThis["forEvery" + upperName + "Do"] = (func, ...args) => {
        for (let i = newSubclass.group[-1].length - 1; i >= 0; i--) newSubclass.group[i]?.do(func, ...args);
        if (LayerManager.children.length != 0) {
            const entities = LayerManager.currentLayer.getEntities(name);
            for (let i = entities.length - 1; i >= 0; i--) entities[i]?.do(func, ...args);
        }
    };
    if (types) {
        for (let type in types) types[type].type = type;
        globalThis[lowerName + "Types"] = types;
        globalThis["forEvery" + upperName + "TypeDo"] = (func, ...args) => {
            for (let type in newSubclass.subtypes) func.call(newSubclass.subtypes[type], ...args);
        };
    }
    Entity.types[name] = newSubclass;
}

function despawnEntity(entity) {
    if (!entity) return;
    entity.raise("ondespawn");
    if (entity.lifeTimer) clearTask(entity.lifeTimer);
    entity.layer.removeEntity(entity);
}
