class Vector {
    #direction;
    #speed;
    constructor(direction = null, speed = 0) {
        this.#direction = direction;
        this.#speed = speed;
    }
    get direction() {
        return this.#direction;
    }
    set direction(val) {
        this.#direction = val;
    }
    get speed() {
        return this.#speed;
    }
    set speed(val) {
        this.#speed = val;
    }
    set x(value) {
        const velY = this.y;
        this.#speed = Math.hypot(value, velY);
        this.#direction = Math.atan2(velY, value);
    }
    get x() {
        if (this.#direction == null) return 0;
        return this.#speed * Math.cos(this.#direction);
    }
    get xSign() {
        return Math.abs(this.x) < 1e-10 ? 0 : Math.sign(this.x);
    }
    set y(value) {
        const velX = this.x;
        this.#speed = Math.hypot(velX, value);
        this.#direction = Math.atan2(value, velX);
    }
    get y() {
        if (this.#direction == null) return 0;
        return this.#speed * Math.sin(this.#direction);
    }
    get ySign() {
        return Math.abs(this.y) < 1e-10 ? 0 : Math.sign(this.y);
    }
    get magnitude() {
        return this.#speed;
    }
    set magnitude(val) {
        this.#speed = val;
    }
}

/**
SpacialMap {IO}
├───Tile{Entity}
└───NavMesh
    ├───Collisions
    └───Pathfinding
 */
class SpacialMap extends Interactable {
    entities = {};
    constructor(layer) {
        super();
        this.layer = layer;
    }
    propagate = (call, ...args) => {
        this.raise("on" + call, ...args);
        const keys = EntityManager.names;
        for (let j = 0; j < keys.length; j++) {
            const key = keys[j];
            if (!this.entities[key]) continue;
            for (let i = this.entities[key].length - 1; i >= 0; i--) this.entities[key][i].raise(call, ...args);
        }
    };
    getEntities = (groupName) => {
        if (!groupName) return Object.values(this.entities).flatMap((a) => a);
        else return this.entities[groupName] ?? [];
    };
    modmouseevent = (e) => {
        const newE = cloneMouseEvent(e);
        if (this.layer.cameraX) newE.mouseX += this.layer.cameraX;
        if (this.layer.cameraY) newE.mouseY += this.layer.cameraY;
        return newE;
    };
    addEntity = (child) => {
        this.entities[child.groupName] ??= [];
        this.entities[child.groupName].push(child);
    };
    removeEntity = (child) => {
        const id = typeof child === "string" ? child : child && typeof child.id === "string" ? child.id : null;
        const idx = this.entities[child.groupName].findIndex((e) => e.id === id);
        if (idx !== -1) this.entities[child.groupName].splice(idx, 1);
    };
    //TODO FINISH THIS AND ENTITY MANAGER
    //ADD REMOVE_FROM_PARENTS
    //Redo Lerps not to use Entity
}

function detectRect(x, y, w, h, ptX, ptY) {
    return ptX >= x && ptX <= x + w && ptY >= y && ptY <= y + h;
}
function detectCircle(x, y, r, ptX, ptY) {
    const squaredDistance = (x - ptX) ** 2 + (y - ptY) ** 2;
    return squaredDistance <= r ** 2;
}
function detectBox(x1, y1, w1, h1, x2, y2, w2, h2, ptX, ptY) {
    return (
        (ptX >= x1 && ptX <= x1 + w1 && ptY >= y1 && ptY <= y1 + h1) ||
        (ptX >= x2 && ptX <= x2 + w2 && ptY >= y2 && ptY <= y2 + h2)
    );
}
function detectCone(x, y, direction, arcLength, radius, ptX, ptY) {
    if (!detectCircle(x, y, radius, ptX, ptY)) return false;

    const angleToTarget = Math.atan2(ptY - y, ptX - x);
    const angleDiff = Math.abs(angleToTarget - direction);

    // Normalize angle difference to be between -π and π
    const normalizedDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
    return normalizedDiff <= arcLength / 2;
}
function detectEntity(entityOne, entityTwo, radius) {
    radius ??= (entityOne.size + entityTwo.size) / 2;
    return distanceTo(entityOne, entityTwo) <= radius;
}
function outOfBounds(entity, { padding } = {}) {
    if (padding === undefined) padding = entity.size ?? 0;
    return (
        entity.y < -padding ||
        entity.y > game.height + padding ||
        entity.x < -padding ||
        entity.x > game.width + padding
    );
}
function distanceTo(from, to) {
    return Math.hypot(from.x - to.x, from.y - to.y);
}
function angleTo(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x);
}
function getPlayerMovementdirectionection({ useCardinal } = {}) {
    let direction = null;

    // Check for horizontal movement
    if ((keys["ArrowLeft"] || keys["KeyA"]) && !(keys["ArrowRight"] || keys["KeyD"])) {
        direction = Math.PI; // Left
    } else if ((keys["ArrowRight"] || keys["KeyD"]) && !(keys["ArrowLeft"] || keys["KeyA"])) {
        direction = 0; // Right
    }

    // Check for vertical movement
    if ((keys["ArrowUp"] || keys["KeyW"]) && !(keys["ArrowDown"] || keys["KeyS"])) {
        direction = -Math.PI / 2; // Up
    } else if ((keys["ArrowDown"] || keys["KeyS"]) && !(keys["ArrowUp"] || keys["KeyW"])) {
        direction = Math.PI / 2; // Down
    }

    if (useCardinal) return direction;

    // Adjust for diagonals
    if ((keys["ArrowUp"] || keys["KeyW"]) && (keys["ArrowLeft"] || keys["KeyA"])) {
        direction = (-3 * Math.PI) / 4; // Up-Left
    }
    if ((keys["ArrowUp"] || keys["KeyW"]) && (keys["ArrowRight"] || keys["KeyD"])) {
        direction = -Math.PI / 4; // Up-Right
    }
    if ((keys["ArrowDown"] || keys["KeyS"]) && (keys["ArrowLeft"] || keys["KeyA"])) {
        direction = (3 * Math.PI) / 4; // Down-Left
    }
    if ((keys["ArrowDown"] || keys["KeyS"]) && (keys["ArrowRight"] || keys["KeyD"])) {
        direction = Math.PI / 4; // Down-Right
    }

    return direction;
}
function onboxcollide(other) {
    const thisLeft = this.x - this.size / 2;
    const thisRight = this.x + this.size / 2;
    const thisTop = this.y - this.size / 2;
    const thisBottom = this.y + this.size / 2;

    const otherLeft = other.x - other.size / 2;
    const otherRight = other.x + other.size / 2;
    const otherTop = other.y - other.size / 2;
    const otherBottom = other.y + other.size / 2;

    const xOverlap = thisRight > otherLeft && thisLeft < otherRight;
    const yOverlap = thisBottom > otherTop && thisTop < otherBottom;
    if (xOverlap) {
        // Handle the collision based on the relative velocities
        if (other.velocity.xSign === 1) {
            other.x = thisLeft - other.size / 2;
            other.velocity.x = 0;
        } else if (other.velocity.xSign === -1) {
            other.x = thisRight + other.size / 2;
            other.velocity.x = 0;
        }
    }
    if (yOverlap) {
        if (other.velocity.ySign === 1) {
            other.y = thisTop - other.size / 2;
            other.velocity.y = 0;
        } else if (other.velocity.ySign === -1) {
            other.y = thisBottom + other.size / 2;
            other.velocity.y = 0;
        }
    }
}
