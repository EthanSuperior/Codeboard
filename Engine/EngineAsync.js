const lerp = (start, end, progress) => start + progress * (end - start);
function startLerp(obj, lerpFunc, duration, { layer } = {}) {
    Entity.types["Lerp"] ??= { group: [] };
    const lerpEntity = new Entity();
    lerpEntity.currentTime = 0;
    lerpEntity.groupName = "Lerp";
    lerpEntity.onupdate = (delta) => {
        lerpEntity.currentTime += delta;
        progress = clamp(lerpEntity.currentTime / duration, 0, 1);
        lerpFunc.call(obj, progress);
        if (progress == 1) lerpEntity.despawn();
    };
    layer ??= LayerManager.currentLayer;
    lerpEntity.layer = layer;
    layer.addEntity(lerpEntity);
    Entity.types["Lerp"].group.push(lerpEntity);
}
function propertyLerp(obj, prop, start, end, duration) {
    startLerp(obj, (t) => (obj[prop] = lerp(start, end, t)), duration);
}
function colorLerp(obj, lerpFunc, startColorHex, endColorHex, duration) {
    const startColor = hexToRgb(startColorHex);
    const endColor = hexToRgb(endColorHex);
    startLerp(
        obj,
        (progress) => {
            const r = Math.round(lerp(startColor.r, endColor.r, progress));
            const g = Math.round(lerp(startColor.g, endColor.g, progress));
            const b = Math.round(lerp(startColor.b, endColor.b, progress));
            lerpFunc.call(obj, rgbToHex({ r, g, b }));
        },
        duration
    );
}
class Task extends Identifiable {
    constructor(func, { time, loop, id, immediate } = {}, ...args) {
        super(id);
        this.func = func;
        this.args = args;
        this.time = 1_000 * (time ?? 0);
        this.loop = !!loop;
        this.ispaused = false;
        this.startTime = Date.now();
        this.remaining = this.time;
        this.timeout = () => {
            if (this.ispaused) return;
            this.func(...this.args);
            if (this.loop) this.start(this.time);
            else this.manager.clearTask(this.id);
        };
        if (immediate) this.func(...this.args);
    }
    start = (delay) => {
        if (this.ispaused) return;
        this.startTime = Date.now();
        clearTimeout(this.timer);
        this.timer = setTimeout(this.timeout, delay);
    };
    pause = () => {
        if (this.ispaused) return;
        this.ispaused = true;
        clearTimeout(this.timer);
        this.remaining = this.time - (Date.now() - this.startTime);
    };
    resume = () => {
        this.peek();
        this.ispaused = false;
        clearTimeout(this.timer);
        this.start(this.remaining);
    };
    refresh = () => {
        if (this.ispaused) return;
        this.pause();
        this.resume();
    };
    peek = () => {
        if (this.ispaused) return this.remaining;
        this.remaining = this.time - (Date.now() - this.startTime);
        return this.remaining;
    };
    extend = (addtionalTime) => {
        this.time += 1_000 * addtionalTime;
        this.resume();
    };
}

const scheduleTask = (func, options, ...args) => {
    if (options?.global) return LayerManager.global.scheduleTask(func, options, ...args);
    else return LayerManager.currentLayer.scheduleTask(func, options, ...args);
};
const clearTask = (id, options) => {
    if (options?.global) return LayerManager.global.clearTask(id);
    else return LayerManager.currentLayer.clearTask(id);
};
const findTask = (id, options) => {
    if (options?.global) return LayerManager.global.findTask(id);
    else return LayerManager.currentLayer.findTask(id);
};

const pause = () => LayerManager.pause();
const resume = () => LayerManager.resume();

const togglePause = () => (LayerManager.ispaused ? resume : pause)();
