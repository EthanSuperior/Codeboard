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
    keydown = (e) => this.propagate("keydown", this.modkeyevent(e));
    keyup = (e) => this.propagate("keyup", this.modkeyevent(e));
    // Mouse IO Events
    mousedown = (e) => {
        e = this.modmouseevent(e);
        this.propagate("mousedown", e);
        if (this.shouldinteract(e.mouseX, e.mouseY)) this.raise("mymousedown", e);
    };
    mymousedown = (e) => this.raise("onmymousedown", e);
    mouseup = (e) => {
        e = this.modmouseevent(e);
        this.propagate("mouseup", e);
        if (this.shouldinteract(e.mouseX, e.mouseY)) this.raise("mymouseup", e);
    };
    mymouseup = (e) => this.raise("onmymouseup", e);
    mousemove = (e) => {
        e = this.modmouseevent(e);
        this.propagate("mousemove", e);
        if (this.shouldinteract(e.mouseX, e.mouseY)) {
            this.raise("mymousemove", e);
            this.hovered = true;
        } else this.hovered = false;
    };
    mymousemove = (e) => this.raise("onmymousemove", e);
    click = (e) => {
        e = this.modmouseevent(e);
        this.propagate("click", e);
        if (this.shouldinteract(e.mouseX, e.mouseY)) this.raise("myclick", e);
    };
    myclick = (e) => this.raise("onmyclick", e);
    dblclick = (e) => {
        e = this.modmouseevent(e);
        this.propagate("dblclick", e);
        if (this.shouldinteract(e.mouseX, e.mouseY)) this.raise("mydblclick", e);
    };
    mydblclick = (e) => this.raise("onmydblclick", e);
    wheel = (e) => {
        e = this.modmouseevent(e);
        this.propagate("wheel", e);
        if (this.shouldinteract(e.mouseX, e.mouseY)) this.raise("mywheel", e);
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
    //TODO FIX ME FIXME
    set cameraX(value) {
        LayerManager.currentLayer.cameraX = value;
    }
    set cameraY(value) {
        LayerManager.currentLayer.cameraY = value;
    }
})();

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.appendChild(canvas);
const keys = {};
const mouse = { x: 0, y: 0 };
