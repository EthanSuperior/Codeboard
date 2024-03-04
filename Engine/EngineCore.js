Function.prototype[Symbol.toPrimitive] = function (hint) {
    if (hint === "number") return this();
    return this.toString();
};
class Identifiable {
    constructor(id) {
        this.id = id || crypto.randomUUID();
    }
    raise = (call, ...args) => {
        if (this.hasOwnProperty(call)) this[call].call(this, ...args);
    };
    propagate = (call, ...args) => this.raise("on" + call, ...args);
}
class Updatable extends Identifiable {
    draw = () => this.propagate("draw");
    pause = () => this.propagate("pause");
    resume = () => this.propagate("resume");
    update = (delta) => this.propagate("update", delta);
}
class Interactable extends Updatable {
    pageinteract = () => this.propagate("pageinteract");
    // Helper Utils
    modmouseevent = (e) => e;
    // shouldinteract = (e) => false;
    shouldinteract = (mX, mY) => false;
    modkeyevent = (e) => e;
    // IO Events
    keydownEvents = {};
    keydown = (e) => {
        this.propagate("keydown", this.modkeyevent(e));
        for (let k in this.keydownEvents) if (e.code == k) this.keydownEvents[k]();
    };
    keyupEvents = {};
    keyup = (e) => {
        this.propagate("keyup", this.modkeyevent(e));
        for (let k in this.keyupEvents) if (e.code == k) this.keyupEvents[k]();
    };
    keypressEvents = {};
    keypress = (e) => {
        this.propagate("keypress", this.modkeyevent(e));
        for (let k in this.keypressEvents) if (e.code == k) this.keypressEvents[k]();
    };
    // Mouse IO Events
    mousedownEvent;
    mousedown = (e) => {
        e = this.modmouseevent(e);
        this.propagate("mousedown", e);
        if (this.shouldinteract(e.mouseX, e.mouseY)) this.raise("mymousedown", e);
        this.mousedownEvent?.call(this);
    };
    mymousedown = (e) => this.raise("onmymousedown", e);
    mouseupEvent;
    mouseup = (e) => {
        e = this.modmouseevent(e);
        this.propagate("mouseup", e);
        if (this.shouldinteract(e.mouseX, e.mouseY)) this.raise("mymouseup", e);
        this.mouseupEvent?.call(this);
    };
    mymouseup = (e) => this.raise("onmymouseup", e);
    mousemoveEvent;
    mousemove = (e) => {
        e = this.modmouseevent(e);
        this.propagate("mousemove", e);
        if (this.shouldinteract(e.mouseX, e.mouseY)) {
            this.raise("mymousemove", e);
            this.hovered = true;
        } else this.hovered = false;
        this.mousemoveEvent?.call(this);
    };
    mymousemove = (e) => this.raise("onmymousemove", e);
    clickEvents = {};
    click = (e) => {
        e = this.modmouseevent(e);
        this.propagate("click", e);
        if (this.shouldinteract(e.mouseX, e.mouseY)) this.raise("myclick", e);
        for (let k in this.clickEvents) this.clickEvents[k]();
    };
    myclick = (e) => this.raise("onmyclick", e);
    dblclickEvents = {};
    dblclick = (e) => {
        e = this.modmouseevent(e);
        this.propagate("dblclick", e);
        if (this.shouldinteract(e.mouseX, e.mouseY)) this.raise("mydblclick", e);
        for (let k in this.dblclickEvents) this.dblclickEvents[k]();
    };
    mydblclick = (e) => this.raise("onmydblclick", e);
    wheelEvents = {};
    wheel = (e) => {
        e = this.modmouseevent(e);
        this.propagate("wheel", e);
        if (this.shouldinteract(e.mouseX, e.mouseY)) this.raise("mywheel", e);
        for (let k in this.wheelEvents) this.wheelEvents[k]();
    };
    mywheel = (e) => this.raise("onmywheel", e);
}
class IterableWeakRef {
    #list = [];
    [Symbol.iterator]() {
        let index = this.#list.length;
        return {
            next: () => {
                while (index > 0) {
                    const value = this.#list[--index].deref();
                    if (value === undefined) {
                        this.#list.splice(index, 1);
                        continue;
                    }
                    return { value, done: false };
                }
                return { done: true };
            },
        };
    }
    push = (value) => {
        this.#list.push(new WeakRef(value));
    };
    forEach = (callback) => {
        for (const value of this) {
            callback(value);
        }
    };
    remove(id) {
        const indexToRemove = this.#list.findIndex((weakRef) => {
            const value = weakRef.deref();
            return value && value.id === id;
        });
        if (indexToRemove !== -1) this.#list.splice(indexToRemove, 1);
    }
}

const game = new (class GameSettings {
    draw = () => LayerManager.draw();
    /**
     * Clears the screen and fills it with the specified background color.
     * @type {function}
     */
    ondraw = () => {
        fillScreen({ color: this.background });
        MultiCanvas.ctx["debug"].clearRect(0, 0, canvas.width, canvas.height);
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
    get diagonal() {
        return Math.hypot(this.width, this.height);
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
    //TODO FIX ME FIXME
    set cameraX(value) {
        LayerManager.currentLayer.cameraX = value;
    }
    set cameraY(value) {
        LayerManager.currentLayer.cameraY = value;
    }
})();

const keys = {};
const mouse = { x: 0, y: 0 };
