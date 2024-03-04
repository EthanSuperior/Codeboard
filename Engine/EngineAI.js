class EntityController extends Updatable {
    constructor(entity) {
        super();
        this.entity = entity;
    }
}
class PlayerController extends EntityController {
    onupdate = function (delta) {
        this.entity.direction = getPlayerMovementDirection();
    };
}

class EnemyController extends EntityController {
    constructor(entity, target) {
        super(entity);
        this.target = target ?? null;
        this.agroRange = 140;
    }
    onupdate = function (delta) {
        this.entity.angleTowards(this.target);
    };
}
