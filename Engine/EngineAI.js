class EntityController extends Updatable {
    constructor(entity) {
        super();
        this.entity = entity;
    }
}
class PlayerController extends EntityController {
    onupdate = function (delta) {
        this.entity.direction = getPlayerMovementDirection();
        // Stop player if no keys are pressed otherwise change your directionection.
        // if (direction == null) this.speed = 0;
        // else this.direction = direction;
    };
}

class EnemyController extends EntityController {
    constructor() {
        super();
        this.target = null;
        this.agroRange = 140;
    }
    onupdate = function (delta) {
        this.entity.rotateTo(this.target);
    };
}
