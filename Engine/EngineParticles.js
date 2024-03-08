// ParticleSystem
// ├───onUpdate&onDraw
// ├───Direct Image Manipulation
// └───Entities?

const ParticleSystem = new (class extends Updatable {
    particles = {};
    emitters = [];
    addEmitter = (emitter) => {
        this.emitters.push(emitter);
        emitter.raise("spawn");
        emitter.remove = () => {
            this.emitters.splice(this.emitters.indexOf(emitter), 1);
            emitter.raise("onremove");
        };
        return emitter;
    };
    addParticle = (particle) => {
        particle.zIdx ??= currentLayer.layerNum ?? 0;
        this.particles[particle.zIdx] ??= [];
        this.particles[particle.zIdx].push(particle);
        particle.raise("spawn");
        particle.remove = () => {
            this.particles[particle.zIdx].splice(this.particles[particle.zIdx].indexOf(particle), 1);
            particle.raise("onremove");
        };
        return particle;
    };
    propagate = (call, ...args) => {
        this.raise("on" + call, ...args);
        for (const e of this.emitters) e.raise(call, ...args);
        for (const l in this.particles) for (const p of this.particles[l]) p.raise(call, ...args);
    };
    draw = () => {
        for (const l in this.particles) {
            const imageData = MultiCanvas.ctx[l].getImageData(0, 0, game.width, game.height);
            for (const p of this.particles[l]) p.draw(imageData);
            MultiCanvas.ctx[l].putImageData(imageData, 0, 0);
        }
    };
})();

class ParticleEmitter extends Updatable {
    constructor(x, y, { rate = 1, shape = "circle", ...options } = {}, particleProps = {}) {
        super();
        this.x = x;
        this.y = y;
        this.rate = rate;
        this.options = options;
        this.extraProps = {};
        this.shape = shape;
        this.currentTime = rate;
        this.particleProps = particleProps;
        this.lastEmittedDirection = randomRange(0, Math.PI * 2);
        ParticleSystem.addEmitter(this);
    }
    update = (delta) => {
        this.currentTime += delta;
        if (this.currentTime >= this.rate) {
            this.currentTime -= this.rate;
            new Particle({ ...this.extraProps, ...this.particleProps });
        }
    };
    set shape(shape) {
        this.extraProps = {
            x: () => this.x,
            y: () => this.y,
            angle: () => (this.lastEmittedDirection = randomRange(0, Math.PI * 2)),
        };
        if (shape === "spiral") this.extraProps.angle = () => (this.lastEmittedDirection += 0.314);
        else if (shape === "line") this.extraProps.x = () => this.x + randomInt(-30, 30);
        else if (shape === "verticalLine") this.extraProps.y = () => this.y + randomInt(-30, 30);
        else if (shape === "square") {
            this.extraProps.x = () => this.x + randomInt(-30, 30);
            this.extraProps.y = () => this.y + randomInt(-30, 30);
        } else if (shape === "circle") this.extraProps.angle = () => (this.lastEmittedDirection += 0.314 * 2);
        else if (shape === "cone")
            this.extraProps.angle = () =>
                (this.lastEmittedDirection = +(this.options.angle ?? 0) + randomSomething(Math.PI / 10));
    }
}
class Particle extends Updatable {
    constructor({
        x,
        y,
        color,
        shape,
        speed,
        theta,
        frame,
        angle,
        deltaAngle,
        deltaSpeed,
        deltaTheta,
        deltaThetaX,
        deltaThetaY,
        thetaX,
        thetaY,
        lifespan,
    } = {}) {
        super();
        this.x = +(x ?? 0);
        this.y = +(y ?? 0);
        this.colors = enforceArray(color);
        this.shape = getArrayDepth(shape) != 3 ? [shape] : shape;
        this.deltaTheta = +(deltaTheta ?? 0);
        this.deltaThetaX = +(deltaThetaX ?? 0);
        this.deltaThetaY = +(deltaThetaY ?? 0);
        this.deltaAngle = +(deltaAngle ?? 0);
        this.deltaSpeed = +(deltaSpeed ?? 0);
        this.lifespan = +(lifespan ?? 1);
        this.velocity = new Vector(+(angle ?? 0), +(speed ?? 0));
        this.thetaX = +(thetaX ?? 0);
        this.thetaY = +(thetaY ?? 0);
        this.theta = +(theta ?? 0);
        this.frame = +(frame ?? 0);
        this.framelength = 0.1;
        this.frametime = this.framelength;
        this.matrix = createTransformationMatrix(0, 0, 0, this.thetaX, this.thetaY, this.theta);
        ParticleSystem.addParticle(this);
    }
    draw = (imgData) => {
        this.data = imgData;
        this.ondraw(imgData);
    };
    update = (delta) => {
        this.lifespan -= delta;
        this.frametime -= delta;
        if (this.frametime <= 0) {
            this.frametime += this.framelength;
            this.frame = (this.frame + 1) % this.shape.length;
        }
        if (this.lifespan <= 0) this.remove();
        if (this.velocity.speed) {
            this.x += this.velocity.x * delta;
            this.y += this.velocity.y * delta;
        }
        if (this.deltaTheta) this.theta += this.deltaTheta * delta;
        if (this.deltaThetaX) this.thetaX += this.deltaThetaX * delta;
        if (this.deltaThetaY) this.thetaY += this.deltaThetaY * delta;
        if (this.deltaAngle) this.velocity.direction += this.deltaAngle * delta;
        if (this.deltaSpeed) this.velocity.speed += this.deltaSpeed * delta;
        this.matrix = createTransformationMatrix(0, 0, 0, this.thetaX, this.thetaY, this.theta);
    };
    ondraw = () => {
        const shape = this.shape[this.frame];
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[0].length; x++) {
                const val = shape[y][x];
                if (val === 0) continue;

                const finalPos = multiplyMatrixAndPoint(this.matrix, [
                    x - (shape[0].length - 1) / 2,
                    y - (shape.length - 1) / 2,
                ]);
                let posX = finalPos[0] + this.x;
                let posY = finalPos[1] + this.y;
                if (posX < 0 || posY < 0 || posX >= game.width || posY >= game.height) continue;
                this.setPixel(Math.round(posX), Math.round(posY), this.colors[val - 1]);
            }
        }
    };
    getPixelLoc = (x, y) => 4 * (x + y * game.width);
    setPixel = (x, y, color) => {
        const { r, g, b, a } = hexToRgb(color);
        // console.log(x, y, this.r, this.g, this.b, this.a);
        this.data.data[this.getPixelLoc(x, y) + 0] = r;
        this.data.data[this.getPixelLoc(x, y) + 1] = g;
        this.data.data[this.getPixelLoc(x, y) + 2] = b;
        if (a) this.data.data[this.getPixelLoc(x, y) + 3] = a;
    };
}
class ParticleShapes {
    static letter(which) {
        if (which === " ") return ParticleShapes[" "];
        if (!which) which = String.fromCharCode(randomInt(65, 90));
        which = which.toUpperCase();
        which = which.charCodeAt(0) - 65;
        return [
            [
                [0, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 0, 1, 1],
                [1, 1, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
            ],
            [
                [1, 1, 1, 0],
                [1, 1, 1, 1],
                [1, 0, 1, 1],
                [1, 1, 1, 0],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 1, 1, 1],
            ],
            [
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 0, 0],
                [1, 0, 0, 0],
                [1, 0, 1, 1],
                [1, 1, 1, 1],
            ],
            [
                [1, 1, 1, 0],
                [1, 1, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 1, 1, 0],
            ],
            [
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 0, 1, 1],
                [1, 1, 0, 0],
                [1, 0, 0, 0],
                [1, 0, 1, 1],
                [1, 1, 1, 1],
            ],
            [
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 0, 0],
                [1, 1, 1, 0],
                [1, 0, 0, 0],
                [1, 0, 0, 0],
            ],
            [
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 0, 0],
                [1, 0, 1, 1],
                [1, 0, 0, 1],
                [1, 1, 1, 1],
            ],
            [
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
            ],
            [
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [0, 1, 1, 0],
                [0, 1, 1, 0],
                [0, 1, 1, 0],
                [0, 1, 1, 0],
                [1, 1, 1, 1],
            ],
            [
                [0, 1, 1, 1],
                [0, 1, 1, 1],
                [0, 0, 1, 1],
                [0, 0, 1, 1],
                [0, 0, 1, 1],
                [1, 0, 1, 1],
                [0, 1, 1, 1],
            ],
            [
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 1, 1, 1],
                [1, 1, 1, 0],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
            ],
            [
                [1, 0, 0, 0],
                [1, 0, 0, 0],
                [1, 0, 0, 0],
                [1, 0, 0, 0],
                [1, 0, 0, 0],
                [1, 0, 1, 1],
                [1, 1, 1, 1],
            ],
            [
                [1, 1, 0, 0, 0, 1, 1],
                [1, 1, 1, 0, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1],
                [1, 1, 0, 1, 0, 1, 1],
                [1, 1, 0, 1, 0, 1, 1],
                [1, 1, 0, 1, 0, 1, 1],
            ],
            [
                [1, 0, 0, 1],
                [1, 1, 0, 1],
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 0, 1],
                [1, 0, 0, 1],
            ],
            [
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 1, 1, 1],
            ],
            [
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 0, 1, 1],
                [1, 1, 1, 1],
                [1, 0, 0, 0],
                [1, 0, 0, 0],
                [1, 0, 0, 0],
            ],
            [
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 0, 0, 1],
                [1, 0, 0, 1],
                [1, 0, 1, 1],
                [1, 1, 1, 0],
                [0, 0, 1, 1],
            ],
            [
                [1, 1, 1, 0],
                [1, 1, 1, 1],
                [1, 0, 1, 1],
                [1, 1, 1, 1],
                [1, 0, 1, 0],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
            ],
            [
                [0, 1, 1, 1],
                [1, 1, 1, 1],
                [1, 0, 1, 1],
                [1, 1, 0, 0],
                [0, 1, 1, 1],
                [1, 0, 1, 1],
                [1, 1, 1, 1],
            ],
            [
                [1, 1, 1, 1],
                [1, 1, 1, 1],
                [0, 1, 1, 0],
                [0, 1, 1, 0],
                [0, 1, 1, 0],
                [0, 1, 1, 0],
                [0, 1, 1, 0],
            ],
            [
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 1, 1, 1],
                [1, 1, 1, 1],
            ],
            [
                [1, 0, 0, 1],
                [1, 0, 0, 1],
                [1, 0, 0, 1],
                [1, 0, 0, 1],
                [1, 0, 1, 1],
                [1, 1, 1, 1],
                [0, 1, 1, 0],
            ],
            [
                [1, 0, 0, 0, 0, 0, 1],
                [1, 0, 0, 1, 0, 0, 1],
                [1, 0, 0, 1, 0, 1, 1],
                [1, 0, 0, 1, 0, 1, 1],
                [1, 0, 1, 1, 0, 1, 1],
                [1, 1, 1, 1, 1, 1, 1],
                [1, 1, 1, 0, 1, 1, 1],
            ],
            [
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 1, 1, 0],
                [0, 1, 1, 0],
                [0, 1, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
            ],
            [
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 0, 1, 1],
                [1, 1, 1, 1],
                [0, 1, 1, 0],
                [0, 1, 1, 0],
                [0, 1, 1, 0],
            ],
            [
                [1, 1, 1, 1],
                [1, 1, 0, 1],
                [0, 0, 1, 1],
                [0, 1, 1, 0],
                [1, 1, 0, 0],
                [1, 0, 1, 1],
                [1, 1, 1, 1],
            ],
        ][which];
    }
    static " " = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ];
    static 0 = [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
    ];
    static 1 = [
        [0, 1, 1, 0],
        [1, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [1, 1, 1, 1],
    ];
    static 2 = [
        [1, 1, 1, 1],
        [0, 0, 1, 1],
        [1, 1, 1, 1],
        [1, 0, 0, 0],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
    ];
    static 3 = [
        [1, 1, 1, 1],
        [0, 0, 1, 1],
        [1, 1, 1, 1],
        [0, 0, 1, 1],
        [0, 0, 1, 1],
        [1, 1, 1, 1],
    ];
    static 4 = [
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
        [0, 0, 1, 1],
        [0, 0, 1, 1],
        [0, 0, 1, 1],
    ];
    static 5 = [
        [1, 1, 1, 1],
        [1, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
    ];
    static 6 = [
        [1, 1, 1, 1],
        [1, 0, 0, 0],
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
    ];
    static 7 = [
        [1, 1, 1, 1],
        [0, 0, 1, 1],
        [0, 0, 1, 1],
        [0, 0, 1, 1],
        [0, 0, 1, 1],
        [0, 0, 1, 1],
    ];
    static 8 = [
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
    ];
    static 9 = [
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
        [0, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
    ];
    static drawLetter(x, y, char) {
        ParticleSystem.addParticle(
            new Particle({
                x: x,
                y: y,
                color: "#ff0000",
                shape: ParticleShapes["rune" + char],
                lifespan: 100,
            })
        ).c = char;
    }
    static drawText(x, y, text) {
        text = text.toUpperCase();
        for (let i = 0; i < text.length; i++) {
            // if (text[i] === "W" || text[i] === "M") x += 2;
            ParticleShapes.drawLetter(x + i * 6, y, text[i]);
            // if (text[i] === "W" || text[i] === "M") x++;
        }
    }
    static cross = [
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [1, 1, 1, 1, 1],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
    ];
    static runeA = [
        [0, 0, 1, 1, 0],
        [0, 1, 0, 0, 1],
        [0, 1, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [1, 1, 0, 0, 0],
    ];
    static runeB = [
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1],
    ];
    static runeC = [
        [0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 1, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
    ];
    static runeD = [
        [1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0],
        [1, 1, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 1, 1],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
    ];
    static runeE = [
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 0],
        [1, 0, 0, 0, 0],
        [1, 0, 0, 0, 0],
        [1, 0, 0, 0, 0],
        [1, 0, 0, 0, 0],
        [1, 1, 1, 1, 1],
    ];
    static runeF = [
        [1, 1, 1, 1, 1],
        [1, 0, 1, 0, 1],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
    ];
    static runeG = [
        [0, 0, 0, 1, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 1, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 1, 0],
    ];
    static runeH = [
        [1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
    ];
    static runeI = [
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
    ];
    static runeJ = [
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
    ];
    static runeK = [
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [1, 0, 1, 0, 1],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
    ];
    static runeL = [
        [0, 1, 0, 0, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 0, 0, 0],
    ];
    static runeM = [
        [1, 0, 0, 0, 1],
        [0, 0, 0, 0, 1],
        [0, 0, 0, 0, 1],
        [0, 0, 0, 0, 1],
        [0, 0, 0, 0, 1],
        [0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1],
    ];
    static runeN = [
        [1, 0, 0, 1, 0],
        [1, 0, 0, 1, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 1, 0, 0, 0],
        [1, 0, 0, 0, 0],
    ];
    static runeO = [
        [1, 1, 1, 1, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 1, 0, 0, 0],
        [1, 0, 0, 0, 0],
    ];
    static runeP = [
        [0, 1, 0, 1, 0],
        [0, 0, 0, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 0, 0, 0],
        [0, 1, 0, 1, 0],
    ];
    static runeQ = [
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1],
        [0, 0, 0, 0, 1],
        [0, 0, 0, 0, 1],
        [0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1],
    ];
    static runeR = [
        [1, 0, 0, 0, 1],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [1, 0, 0, 0, 1],
    ];
    static runeS = [
        [0, 1, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 1, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
    ];
    static runeT = [
        [1, 1, 1, 1, 1],
        [0, 0, 0, 0, 1],
        [0, 0, 0, 0, 1],
        [0, 0, 0, 0, 1],
        [0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1],
    ];
    static runeU = [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
    ];
    static runeV = [
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1],
    ];
    static runeW = [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [1, 0, 0, 0, 1],
        [0, 0, 0, 0, 0],
    ];
    static runeX = [
        [1, 0, 0, 0, 1],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 1, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [1, 0, 0, 0, 0],
    ];
    static runeY = [
        [0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0],
    ];
    static runeZ = [
        [0, 0, 1, 0, 0],
        [0, 1, 0, 1, 0],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
    ];
    static "rune " = [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
    ];
}
