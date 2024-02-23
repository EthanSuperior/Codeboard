class Vector {
    constructor(direction = null, speed = 0) {
        this.direction = direction;
        this.speed = speed;
    }
    set x(value) {
        const velY = this.y;
        // this.speed = Math.hypot(value, velY);
        this.direction = Math.atan2(velY, value);
    }
    get x() {
        return this.speed * Math.cos(this.direction);
    }
    get xSign() {
        return Math.abs(this.x) < 1e-10 ? 0 : Math.sign(this.x);
    }
    set y(value) {
        const velX = this.x;
        // this.speed = Math.hypot(velX, value);
        this.direction = Math.atan2(value, velX);
    }
    get y() {
        return this.speed * Math.sin(this.direction);
    }
    get ySign() {
        return Math.abs(this.y) < 1e-10 ? 0 : Math.sign(this.y);
    }
    get magnitude() {
        return this.speed;
    }
    set magnitude(val) {
        this.speed = val;
    }
}
function detectRect(x, y, w, h, ptX, ptY) {
    return ptX >= x && ptX <= x + w && ptY >= y && ptY <= y + h;
}
function detectCircle(x, y, r, ptX, ptY) {
    return Math.hypot(ptX - x, ptY - y) <= r;
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
