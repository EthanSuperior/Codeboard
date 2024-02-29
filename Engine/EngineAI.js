class EntityController extends Updatable {}
class PlayerController extends EntityController {
    onupdate = (delta) => {
        this.direction = getPlayerMovementdirectionection();
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
    onupdate = (delta) => {
        this.rotateTo(this.target);
    };
}
