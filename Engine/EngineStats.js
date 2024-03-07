class Stat {
    constructor(value) {
        let { initial, ...otherProps } = typeof value === "object" ? value : { initial: value };
        this.internal = {
            max: initial,
            base: initial,
            current: otherProps.current ?? initial,
            maxBase: otherProps.maxBase,
            cap: otherProps.cap,
        };
        this.dynamic = 0;
        this.modifiers = [];
    }
    get missing() {
        return this.internal.max - this.internal.current;
    }
    get current() {
        if (this.dynamic && this.#calculateMax() !== this.internal.max) this.calculate(this.#copyinternal);
        return this.internal.current;
    }
    set current(val) {
        if (Number.isNaN(val)) debugger;
        if (this.internal.current === val) return;
        this.internal.current = Math.min(val, this.internal.max);
        this.change();
    }
    get max() {
        return this.internal.max;
    }
    get missingPercent() {
        return this.missing / this.max;
    }
    get base() {
        return this.internal.base;
    }
    set base(val) {
        const prior = this.#copyinternal;
        this.internal.base = val;
        this.calculate(prior);
    }
    get percent() {
        return this.internal.current / this.internal.max;
    }
    set percent(val) {
        this.current = this.internal.max * val;
    }
    get maxBase() {
        return this.internal.maxBase;
    }
    set maxBase(val) {
        const prior = this.#copyinternal;
        this.internal.maxBase = val;
        if (this.internal.maxBase !== undefined) this.internal.base = Math.min(this.internal.base, val);
        this.calculate(prior);
    }
    get cap() {
        return this.internal.cap;
    }
    set cap(val) {
        const prior = this.#copyinternal;
        this.internal.cap = val;
        if (this.internal.cap !== undefined) this.internal.max = Math.min(this.internal.max, val);
        this.calculate(prior);
    }
    get #copyinternal() {
        return { ...this.internal };
    }
    change = () => {
        this.onchange?.call(obj, this);
    };
    #calculateMax = () => {
        let x = this.internal.base;
        this.modifiers.forEach((modifier) => {
            const { value, op } = modifier;
            switch (op) {
                case "*":
                    x *= value;
                    break;
                case "+":
                    x += value;
                    break;
                default:
                    x = value;
            }
        });
        return this.internal.cap !== undefined ? x : Math.min(x, this.internal.cap);
    };
    calculate = (prior) => {
        this.internal.current = this.percent * this.internal.base;
        this.internal.max = this.internal.base;

        this.modifiers.forEach((modifier) => {
            const { value, op } = modifier;
            switch (op) {
                case "*":
                    this.internal.current *= value;
                    this.internal.max *= value;
                    break;
                case "+":
                    this.internal.current += value;
                    this.internal.max += value;
                    break;
                default:
                    this.internal.current = value;
                    this.internal.max = value;
            }
        });
        if (this.internal.cap !== undefined) this.internal.max = Math.min(this.internal.max, this.internal.cap);
        this.internal.current = Math.min(this.internal.current, this.internal.max);
        Object.keys(prior).forEach(
            (k) => (prior[k] = this.internal[k] !== undefined ? this.internal[k] - (prior[k] || 0) : undefined)
        );
        this.onrecalculate?.call(obj, this, prior);
    };
    buff = (name, value, { op = "*", priority = 10 } = {}) => {
        if (typeof value === "function") this.dynamic++;
        this.modifiers.push({ name, priority, value, op });
        this.calculate(this.#copyinternal);
    };
    remove = (name) => {
        const idx = this.modifiers.findIndex((mod) => mod.name === name);
        if (idx === -1) return;
        const removed = this.modifiers.splice(idx, 1)[0];
        if (typeof removed.value === "function") this.dynamic--;
        this.calculate(this.#copyinternal);
    };
    [Symbol.toPrimitive](hint) {
        return this.current;
    }
}

const addStat = (obj, propertyName, initial) => {
    // Possible temporary hp etc?
    propertyName = propertyName.toLowerCase();
    const subStat = propertyName.slice(3);
    if (propertyName.startsWith("max")) {
        if (!obj[subStat]) addStat(obj, subStat, initial);
        obj[subStat].maxBase = initial;
        delete obj.stats[propertyName];
        return;
    }
    if (propertyName.startsWith("cap")) {
        if (!obj[subStat]) addStat(obj, subStat, initial);
        obj[subStat].cap = initial;
        delete obj.stats[propertyName];
        return;
    }
    if (obj[propertyName]) initial = obj[propertyName];
    const stat = new Stat(initial);
    Object.defineProperty(obj, propertyName, {
        get() {
            return stat;
        },
        set(newVal) {
            stat.current = newVal;
        },
    });
    AddAccessor(obj, "on" + propertyName + "change", stat.onchange);
    obj.stats[propertyName] = stat;
};
