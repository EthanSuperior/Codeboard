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

class Particle extends Updatable {
    constructor({ x, y, color, shape, speed, theta, frame, deltaAngle, deltaSpeed, deltaTheta, lifespan } = {}) {
        super();
        this.x = x;
        this.y = y;
        this.colors = enforceArray(color);
        this.shape = getArrayDepth(shape) != 3 ? [shape] : shape;
        this.deltaTheta = deltaTheta;
        this.deltaAngle = deltaAngle;
        this.deltaSpeed = deltaSpeed;
        this.lifespan = lifespan ?? 10;
        this.velocity = new Vector(0, speed);
        this.theta = theta ?? 0;
        this.frame = frame ?? 0;
        this.framelength = 0.1;
        this.frametime = this.framelength;
        this.matrix = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
        ];
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
        if (this.deltaAngle) this.velocity.direction += this.deltaAngle * delta;
        if (this.deltaSpeed) this.velocity.speed += this.deltaSpeed * delta;
        this.matrix = createTransformationMatrix(0, 0, 0, 0, 0, this.theta);
    };
    ondraw = () => {
        const shape = this.shape[this.frame];
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[0].length; x++) {
                const val = shape[y][x];
                if (val === 0) continue;

                const finalPos = multiplyMatrixAndPoint(this.matrix, [x, y]);
                let posX = finalPos[0] + this.x - (shape[0].length - 1) / 2;
                let posY = finalPos[1] + this.y - (shape.length - 1) / 2;
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
class ParticleEmitter extends Updatable {
    rate = 0;
    currentTime = 0;
    constructor(x, y, rate, particleProps = {}) {
        super();
        this.x = x;
        this.y = y;
        this.rate = rate;
        this.particleProps = particleProps;
        ParticleSystem.addEmitter(this);
    }
    update = (delta) => {
        this.currentTime += delta;
        if (this.currentTime >= this.rate) {
            this.currentTime -= this.rate;
            ParticleSystem.addParticle(new Particle({ ...this.particleProps, x: this.x, y: this.y }));
        }
    };
}
class DefaultParticleShapes {
    static " " = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ];
    static A = [
        [0, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
    ];
    static B = [
        [1, 1, 1, 0],
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 0],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
    ];
    static C = [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 0, 0],
        [1, 0, 0, 0],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
    ];
    static D = [
        [1, 1, 1, 0],
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 0],
    ];
    static E = [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 0, 0],
        [1, 0, 0, 0],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
    ];
    static F = [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 0, 0],
        [1, 1, 1, 0],
        [1, 0, 0, 0],
        [1, 0, 0, 0],
    ];
    static G = [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 0, 0],
        [1, 0, 1, 1],
        [1, 0, 0, 1],
        [1, 1, 1, 1],
    ];
    static H = [
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
    ];
    static I = [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [1, 1, 1, 1],
    ];
    static J = [
        [0, 1, 1, 1],
        [0, 1, 1, 1],
        [0, 0, 1, 1],
        [0, 0, 1, 1],
        [0, 0, 1, 1],
        [1, 0, 1, 1],
        [0, 1, 1, 1],
    ];
    static K = [
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 0],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
    ];
    static L = [
        [1, 0, 0, 0],
        [1, 0, 0, 0],
        [1, 0, 0, 0],
        [1, 0, 0, 0],
        [1, 0, 0, 0],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
    ];
    static M = [
        [1, 1, 0, 0, 0, 1, 1],
        [1, 1, 1, 0, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 0, 1, 0, 1, 1],
        [1, 1, 0, 1, 0, 1, 1],
        [1, 1, 0, 1, 0, 1, 1],
    ];
    static N = [
        [1, 0, 0, 1],
        [1, 1, 0, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
    ];
    static O = [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
    ];
    static P = [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
        [1, 0, 0, 0],
        [1, 0, 0, 0],
        [1, 0, 0, 0],
    ];
    static Q = [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 0],
        [0, 0, 1, 1],
    ];
    static R = [
        [1, 1, 1, 0],
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
        [1, 0, 1, 0],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
    ];
    static S = [
        [0, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 0, 0],
        [0, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
    ];
    static T = [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 1, 1, 0],
    ];
    static U = [
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
    ];
    static V = [
        [1, 0, 0, 1],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
        [0, 1, 1, 0],
    ];
    static W = [
        [1, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 1, 0, 0, 1],
        [1, 0, 0, 1, 0, 1, 1],
        [1, 0, 0, 1, 0, 1, 1],
        [1, 0, 1, 1, 0, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 0, 1, 1, 1],
    ];
    static X = [
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 1, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
    ];
    static Y = [
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 1, 1, 0],
    ];
    static Z = [
        [1, 1, 1, 1],
        [1, 1, 0, 1],
        [0, 0, 1, 1],
        [0, 1, 1, 0],
        [1, 1, 0, 0],
        [1, 0, 1, 1],
        [1, 1, 1, 1],
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
                shape: DefaultParticleShapes[char],
                lifespan: 100,
            })
        );
    }
    static drawText(x, y, text) {
        text = text.toUpperCase();
        for (let i = 0; i < text.length; i++) {
            if (text[i] === "W" || text[i] === "M") x += 2;
            drawLetter(x + i * 5, y, text[i]);
            if (text[i] === "W" || text[i] === "M") x++;
        }
    }
}
