class Layer extends Interactable {
    constructor({ id } = {}, calls = {}) {
        super(id);
        this.entities = { Entity: new IterableWeakRef() };

        const keys = Object.keys(Entity.types);
        for (let i = 0; i < keys.length; i++) this.entities[keys[i]] = new IterableWeakRef();
        MergeOntoObject(this, calls);
    }
    // Base Methods
    open = () => this.propagate("open");
    close = () => this.propagate("close");
    // Timing Methods
    tasks = [];
    ispaused = false;
    pause = () => {
        this.tasks.forEach((t) => t.pause());
        this.sounds.forEach((s) => s.pause());
        this.music?.pause();
    };
    resume = () => {
        this.tasks.forEach((t) => t.resume());
        if (LayerManager.interacted) this.sounds.forEach((s) => s.play());
        if (LayerManager.interacted) this.music?.play();
    };
    scheduleTask = (func, options = {}, ...args) => {
        if (options.delay) {
            const { delay, ...newOp } = options;
            return this.scheduleTask(this.scheduleTask, { time: delay }, newOp);
        }
        let task = options.id && this.findTask(options.id);
        if (task) {
            task.func = func;
            task.args = args;
            task.time = 1_000 * options.time ?? task.time;
            task.loop = !!(options.loop ?? task.loop);
        } else {
            task = new Task(func, options, ...args);
            task.manager = this;
            this.tasks.push(task);
            if (options.expires) this.scheduleTask(() => clearTask(task.id), { time: options.expires });
        }
        task.refresh();
        return task.id;
    };
    findTask = (id) => this.tasks.find((t) => t.id === id);
    clearTask = (id) => {
        const idx = this.tasks.findIndex((e) => e.id === id);
        if (idx < 0) return;
        this.tasks.splice(idx, 1)[0].pause();
    };

    // Sound Methods
    sounds = new IterableWeakRef();
    playSoundEffect = (source, options = {}) => {
        if (!LayerManager.interacted) return;
        const { playrate, volume } = options;
        let soundBite = new Audio(source);
        if (playrate) soundBite.playbackRate = playrate;
        if (volume) soundBite.volume = volume;
        soundBite.addEventListener("canplaythrough", soundBite.play);
        this.sounds.push(soundBite);
        soundBite.addEventListener("ended", () => (soundBite.play = () => {}));
    };
    playMusic = (source, options = {}) => {
        if (!LayerManager.interacted) return (this.interact = () => this.playMusic(source, options));
        const { playrate, volume } = options;
        if (this.music === undefined) {
            this.music = new Audio();
            this.music.loop = true;
            this.music.addEventListener("canplaythrough", this.music.play);
        }
        if (playrate) this.music.playbackRate = playrate;
        if (volume) this.music.volume = volume;
        this.music.src = source;
    };
    // Gameplay Methods
    cameraX;
    cameraY;
    scaleX;
    scaleY;
    updateRate = 0;
    propagate = (call, ...args) => {
        this.raise("on" + call, ...args);
        this.children.forEach((c) => c?.raise(call, ...args));
        this.getEntities().forEach((c) => c?.raise(call, ...args));
    };
    // Game Update Events
    update = (delta) => {
        if (!this.tickRate) this.propagate("update", delta);
        else {
            this.update.accumulatedTime ??= 0;
            this.update.accumulatedTime += delta;
            while (this.update.accumulatedTime >= this.tickRate) {
                this.update.accumulatedTime -= this.tickRate;
                this.propagate("update", this.tickRate);
            }
        }
    };
    draw = () => {
        this.raise("ondraw");
        this.children.forEach((c) => c.raise("draw"));
        ctx.save();
        if (this.cameraX !== undefined && this.cameraY !== undefined) {
            if (this.pixelPerfect) {
                this.cameraX = Math.round(this.cameraX);
                this.cameraY = Math.round(this.cameraY);
            }
            ctx.translate(game.width / 2 - this.cameraX, game.height / 2 - this.cameraY);
        }
        if (this.scaleX && this.scaleY) ctx.scale(this.scaleX, this.scaleY);
        this.getEntities().forEach((c) => c.raise("draw"));
        ctx.restore();
    };
    getEntities = (groupName) => {
        if (!groupName) {
            return Object.values(Entity.types)
                .map((t) => t.group[this.position])
                .flat();
        } else {
            return Entity.types[groupName].group[this.position];
        }
    };
    removeEntity(entity) {
        const idx = entity.layer.getEntities(entity.groupName).findIndex((e) => e.id === entity.id);
        if (idx == -1) return;
        entity.layer.getEntities(entity.groupName).splice(idx, 1);
    }
}

class GlobalLayer extends Layer {
    settings = {};
    constructor() {
        super({ layerNum: -1, id: "global" });
    }
    keydown = (e) => {
        keys[e.code] = true;
        if (typeof DownKeyEvents !== "undefined") for (let a in DownKeyEvents) if (e.code == a) DownKeyEvents[a]();
        this.propagate("keydown", e);
    };
    keyup = (e) => {
        keys[e.code] = false;
        if (typeof UpKeyEvents !== "undefined") for (let a in UpKeyEvents) if (e.code == a) UpKeyEvents[a]();
        this.propagate("keyup", e);
    };
    mousedown = (e) => {
        this.setMousePos(e);
        if (typeof MouseEvents !== "undefined" && MouseEvents.Down) MouseEvents.Down(e);
        this.propagate("mousedown", e);
    };
    mouseup = (e) => {
        this.setMousePos(e);
        if (typeof MouseEvents !== "undefined" && MouseEvents.Up) MouseEvents.Up(e);
        this.propagate("mouseup", e);
    };
    mousemove = (e) => {
        this.setMousePos(e);
        if (typeof MouseEvents !== "undefined" && MouseEvents.Move) MouseEvents.Move(e);
        this.propagate("mousemove", e);
    };
    click = (e) => {
        this.setMousePos(e);
        if (typeof MouseEvents !== "undefined" && MouseEvents.Click) MouseEvents.Click(e);
        this.propagate("click", e);
    };
    dblclick = (e) => {
        this.setMousePos(e);
        if (typeof MouseEvents !== "undefined" && MouseEvents.DblClick) MouseEvents.DblClick(e);
        this.propagate("dblclick", e);
    };
    wheel = (e) => {
        this.setMousePos(e);
        if (typeof MouseEvents !== "undefined" && MouseEvents.Wheel) MouseEvents.Wheel(e);
        this.propagate("wheel", e);
    };
    setMousePos = (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        e.mouseX = mouse.x;
        e.mouseY = mouse.y;
        e.canvasX = mouse.x;
        e.canvasY = mouse.y;
    };
}

/**
 * Represents the main game layer in the application.
 * @extends Layer
 * @class
 */
class GameLayer extends Layer {
    /**
     * Constructs a new instance of the GameLayer class.
     */
    constructor() {
        super({ id: "game" });
    }
    /**
     * Clears the screen and fills it with the specified background color.
     * @type {function}
     */
    ondraw = () => {
        UI.fillScreen({ color: this.background });
    };
    /**
     * Get the width of the game.
     * @type {number}
     */
    get width() {
        return canvas.width / (this.scaleX ?? 1);
    }
    /**
     * Set the width of the game.
     * @type {number}
     */
    set width(value) {
        canvas.width = value * (this.scaleX ?? 1);
    }
    /**
     * Get the height of the game.
     * @type {number}
     */
    get height() {
        return canvas.height / (this.scaleY ?? 1);
    }
    /**
     * Set the height of the game.
     * @type {number}
     */
    set height(value) {
        canvas.height = value * (this.scaleY ?? 1);
    }
}

class LayerManager extends Interactable {
    static instance = new LayerManager("LayerManager");
    static lastTimestamp;
    static ispaused = true;
    propagate = (call, ...args) => {
        if (!LayerManager.global.ispaused) LayerManager.global.raise(call, ...args);
        if (!!LayerManager.children.length && !LayerManager.currentLayer.ispaused)
            LayerManager.currentLayer.raise(call, ...args);
    };
    static get global() {
        return LayerManager.children[-1];
    }
    static set global(val) {
        LayerManager.children[-1] = val;
    }
    static get children() {
        return LayerManager.instance.children;
    }
    static get propagate() {
        return LayerManager.instance.propagate;
    }
    static {
        function registerListener(eventName) {
            document.addEventListener(eventName, LayerManager.instance[eventName]);
        }
        window.onblur = LayerManager.pause;
        window.onfocus = LayerManager.resume;
        window.onload = () => {
            if (typeof load !== "undefined") load();
            LayerManager.resume();
        };
        document.addEventListener("mousedown", LayerManager.oninteract, { once: true });
        document.addEventListener("keydown", LayerManager.oninteract, { once: true });
        // document.addEventListener("contextmenu", (e) => e.preventDefault());
        registerListener("keydown");
        registerListener("keyup");
        registerListener("mousemove");
        registerListener("mousedown");
        registerListener("mouseup");
        registerListener("click");
        registerListener("dblclick");
        registerListener("wheel");
    }
    static get currentLayer() {
        return LayerManager.children[LayerManager.children.length - 1];
    }
    static update = (timestamp) => {
        // Fraction of a second since last update.
        const delta = (timestamp - LayerManager.lastTimestamp) / 1000;
        LayerManager.lastTimestamp = timestamp;
        LayerManager.propagate("update", delta);
        LayerManager.propagate("draw");
        LayerManager.updateframe = requestAnimationFrame(LayerManager.update);
    };
    static oninteract() {
        document.removeEventListener("mousedown", LayerManager.oninteract, { once: true });
        document.removeEventListener("keydown", LayerManager.oninteract, { once: true });
        LayerManager.interacted = true;
        LayerManager.propagate("interact");
    }
    static pause() {
        LayerManager.ispaused = true;
        cancelAnimationFrame(LayerManager.updateframe);
        LayerManager.global.pause();
        LayerManager.children.forEach((l) => l.pause());
    }
    static resume() {
        LayerManager.ispaused = false;
        cancelAnimationFrame(LayerManager.updateframe);
        LayerManager.lastTimestamp = document.timeline.currentTime;
        LayerManager.updateframe = requestAnimationFrame(LayerManager.update);
        LayerManager.global.resume();
        LayerManager.currentLayer?.resume();
    }
    static add(layer) {
        LayerManager.currentLayer?.pause();
        LayerManager.instance.add(layer);
        Object.values(Entity.types).forEach((t) => t.group.push([]));
        layer.resume();
        layer.position = LayerManager.children.length - 1;
        return layer;
    }
    static remove(layer) {
        layer.pause();
        LayerManager.instance.remove(layer.id);
        Object.values(Entity.types).forEach((t) => t.group.pop());
        LayerManager.currentLayer?.resume();
    }
}

LayerManager.global = new GlobalLayer();
LayerManager.global.position = -1;
globalThis.global = LayerManager.global;
globalThis.game = new GameLayer();
LayerManager.add(globalThis.game);
