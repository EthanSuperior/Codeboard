# Codeboard - _BYU Game Dev Club_

## Introduction

The Codeboard engine was created by Evan Chase with valuable assistance from Brandon Graham, designed specifically for the BYU Game Dev Club.

The aim of Codeboard is to provide a user-friendly environment with minimal coding requirements, catering to individuals with little to no coding experience. It serves as a tool to facilitate game development within the BYU Game Dev Club community.

### License - [CC0 License](https://creativecommons.org/publicdomain/zero/1.0/)

Codeboard is released under the Creative Commons Zero (CC0) license, allowing users to freely copy, modify, and distribute the work for any purpose without seeking permission. The contributors have waived all copyright and related rights to the extent possible under law.

For more details, view the full legal text at: [CC0 License](https://creativecommons.org/publicdomain/zero/1.0/)

### Contributors

-   Evan Chase
-   Brandon Graham

#### Beta Testers

-   Spencer Chase

---

## TODO LIST:

-   Finish onboxcollide and make oncirclecollide
-   Check how to make events not bubble down all UI layers, but be consumed by things like btns etc. (double scroll etc)
    -   Check with console.log to see what onX's are actually being called, maybe a break or something in propagate for those?
-   Player Class
-   Save Player Class Data
-   Level System?
-   Add Animations and .frames =>not lerp and playAnimation() => lerp/task
-   Add comments && doc strings
-   Add Example Template
-   Make layer an arg of UI and Entity
-   Make Tile Layer
-   Spacial Partitioning
-   Nav Mesh
-   Android
-   Pathfinding
-   Particle System
-   Add Platformer and Tile Template
    -   https://www.freecodecamp.org/news/learning-javascript-by-making-a-game-4aca51ad9030/
    -   https://jobtalle.com/2d_platformer_physics.html
    -   https://www.educative.io/answers/how-to-make-a-simple-platformer-using-javascript
    -   https://eloquentjavascript.net/15_event.html

## Code Structure

```
LayerManager
│   ┌───GlobalLayer
└───Layer
    ├───RootUI
    │   └───UIElements
    ├───SpacialMap
    │   └───Entity
    └───AsyncManager
        ├───Task
        └───Lerp

Layer => LayerManager
├───UI => UIRoot{IO}
├───Entity => SpacialMap{IO}
└───Async => AsyncManager{dT}

SpacialMap {IO}
├───Tile{Entity}
└───NavMesh
    ├───Collisions
    └───Pathfinding

AsyncManager
├───Lerp
├───Sound
├───Task
└───Animations?

Entity => EntityManager & registerEntity
├───Types
├───Events (onDamage,IO,etc)
├───Controller
├───Stats
├───Conditions
├───Modifiers
├───Abilities
└───Drops[Spread/Jitter]

EntityController
├───AI/Player => direction
├───StateMachine?
└───lateUpdate for Abilities?

Abilities
├───Properties
│   ├───CD/Rate
│   ├───Hold/Channel/Charge/Loop/etc
│   └───Callback
├───Levels?Teirs?Ranks?
├───Attacking
├───Passives
└───Spells->AssignOwnership

PlayerClass
└───InputMap

SpriteSheet
└───Atlasing/Animation

PlayerTracker
├───Quest System
├───Save System
├───Inventory
└───Event Scheduler

Inventory
├───UI
│   ├───DragDrop
│   └───Selection
├───Items/Pots
└───Equipment

GameSettings
├───Canvas Size
├───Game Mode
└───Level

ParticalSystem
├───onUpdate&onDraw
└───Entities?

Networking
├───Event RPCs
├───UUID Sync
├───UUID=>Event
└───Prediction
```
