// Changing the stats
// player.health += amount // heal amount hp
// player.health.percent += 0.2    // heal 20% hp
// player.health.percentBuff += amount // add amount% buff

// Getting information
// player.health  							// their current hp
// player.health.max						// their current maxhp
// player.health.percent 				// there current hp/maxhp [0-1]
// player.health.missing 			 	// there current amount missing (maxhp-hp)
// player.health.missingPercent // there current amount missing [0-1] ((maxhp-hp)/maxhp)

// function onattack(amount, target) // bob attacks jim[target] amount
// function oninjure(amount, source) // jim is injured by bob[source] amount
// function onheal(amount, target) // jim heals bob[target] amount
// function onrecover(amount, source) // bob is recovered by jim[source] amount
function hasPerk(perk, noperk) {
    return function () {
        return this.perk ? perk : noperk;
    };
}

const basicDrawCalls = {
    onideldraw: function () {},
    onchargedraw: function (percent) {
        ctx.globalCompositeOperation = "hue";
        drawCircle(0, 0, 0, this.duration + this.size * percent, { fill: this.color });
        ctx.globalCompositeOperation = "source-over";
    },
    oncooldowndraw: function (percent) {
        ctx.globalCompositeOperation = "hue";
        drawCircle(0, 0, 0, this.size * (1 - percent), { stroke: this.color, strokeWidth: 2 });
        ctx.globalCompositeOperation = "source-over";
    },
    onactivedraw: function (percent) {
        ctx.globalCompositeOperation = "hue";
        drawCircle(0, 0, 0, this.size + this.deltaTimer / 2, { stroke: this.color, strokeWidth: this.deltaTimer });
        ctx.globalCompositeOperation = "source-over";
    },
    ontickdraw: function (percent) {
        ctx.globalCompositeOperation = "hue";
        drawProgressCircle(0, 0, this.size, 0, percent, -Math.PI / 2, { fill: this.color });
        ctx.globalCompositeOperation = "source-over";
    },
};

// Bloodthirst: Tier 1 Fighter[Bezerker] Ability
registerAbility("Bloodthirst_1", {
    mode: "Passive",
    onactivate: function (player) {
        function selfheal(amount, target) {
            player.recover(amount * 2.5 * (player.health.missingPercent / 10), player);
        }
        player.addEffect("onattack", "bloodthirst_1_Effect", selfheal);
    },
    ondeactivate: function (player) {
        player.removeEffect("onhit", "bloodthirst_1_Effect");
    },
});

// RecklessRage: Tier 2 Fighter[Bezerker] Ability
registerAbility("RecklessRage_1", {
    mode: "Instant",
    cost: 0.1,
    duration: 10,
    cooldown: 45,
    onactivate: function (player) {
        if (player.hasPerk) this.duration = 12;
        player.health.percent *= 0.5;
        player.damage.percentBuff += 0.2;
        function selfheal(amount, source) {
            if (source == player) return amount * 2;
        }
        player.addEffect("onrecover", "RecklessRage_1_Effect", selfheal);
    },
    ondeactivate: function (player) {
        player.damage.percentBuff -= 0.2;
        player.removeEffect("onheal", "RecklessRage_1_Effect");
    },
    size: 16,
    color: "red", // rgbToHex({ r: 255, g: 0, b: 0 }),
    ...basicDrawCalls,
});

registerAbility("RecklessRage_2", {
    mode: "Passive",
    onapply: function (player) {
        function getModPercent() {
            return 1 / (16 * clamp(0.7 + player.health.missingPercent, 1, 1.6));
        }
        player.attackspeed.buff("RecklessRage_2_Modifier", getModPercent);
    },
    onremove: function (player) {
        player.attackspeed.remove("RecklessRage_2_Modifier");
    },
});

registerAbility("Dash_1", {
    mode: "Instant",
    onactivate: function (player) {
        console.log("dashed");
    },
});

const classAbilities = {
    Fighter: {
        Both: { 1: ["Heavy Blow", "Shoulder Check", "Dash"], 2: ["Unshaken"], 3: ["Juggernaut"] },
        Bezerker: {
            1: ["RecklessSwing", "Bloodthirst"],
            2: ["RecklessRage", "WarBanner"],
            3: ["Executioner"],
        },
        Knight: {
            1: ["DisorientingSwing", "SturdyDefense"],
            2: ["Brace", "DefendersBanner"],
            3: ["UnbreakableDefense"],
        },
    },
    Paladin: {
        Both: {
            1: ["Cleanse", "BanishTheDarkness", "Bless", "BlessedDefender", "OneFocus"],
            2: ["MantleOfProtection", "SmiteTheUnclean"],
            3: ["AngelicIntervention"],
        },
        Crusader: {
            2: ["HolyVigor"],
            3: ["CrusadersResolve"],
        },
        DivineDefender: {
            2: ["HolySacrifice"],
            3: ["DefendersResolve"],
        },
    },
    Ranger: {
        Both: {
            1: ["VersatileFighter", "Flurry", "Dodge", "FocusPower", "FocusSpeed"],
            2: ["RefocusStalk", "SilentStepQuickStrike"],
            3: ["MasterOfArms"],
        },
        DancingBlade: {
            2: ["AstralCompanionPanther"],
            3: ["SweepingStrikes"],
        },
        DancingString: {
            2: ["AstralCompanionHawk"],
            3: ["VolleyFire"],
        },
    },
    Bard: {
        Both: {
            1: ["BitingWords", "LoudNoises", "ReplenishingWord"],
            2: ["VeteranPerformer"],
            3: ["Ventriloquist", "TheShowMustGoOn"],
        },
        WickedTongue: {
            1: ["WailingSong"],
            2: ["TragicTale", "Cacophony"],
        },
        SoothingBallad: {
            1: ["HasteningWords"],
            2: ["HeroesTale", "TriumphantShout"],
        },
    },
    Monk: {
        Both: {
            1: ["HeavyPalms", "SpringingTiger", "MeasuredSteps", "MonksFocus", "FuriousBlows"],
            2: ["LightStep"],
            3: ["Duel", "EyeOfTheStorm"],
        },
        WayOfTheCalmRain: {
            2: ["SuddenDownpour", "WayOfTheBalancedChi"],
        },
        WayOfTheThunderousFist: {
            2: ["Flurry", "DisruptChi"],
        },
    },
    Cleric: {
        Both: {
            1: ["Smite"],
            2: ["Cleanse"],
        },
        Consecration: {
            1: ["HealingGround", "CleansingGround", "ProtectedGround", "GroundOfSwiftness"],
            2: ["UnitedGround", "BanishingGround"],
            3: ["HallowedGround", "SanctifiedGround"],
        },
        Divine: {
            1: ["BlessingOfHealing", "PurgingLight", "DivinePlea", "DivineProtection"],
            2: ["DivineVestment", "PrayerOfPleading"],
            3: ["HolyProtection", "AngelicAid"],
        },
    },
    Engineer: {
        Both: {
            1: ["AutoTurret", "RocketBoots"],
            2: ["MineLayer"],
            3: [],
        },
        Arsenal: {
            1: ["GrenadeThrow", "RocketLauncher", "FieldRepair"],
            2: ["ConcussionGrenade", "ExperimentalShieldGenerator"],
            3: ["AmmoDepot", "WarMech"],
        },
        Tinker: {
            1: ["Mortar", "FlameTurret", "RepairStation"],
            2: ["TremorMachine", "JammingField"],
            3: ["SummonRecalibration", "SupplyStation"],
        },
    },
    Necromancer: {
        Both: {
            2: ["SkeletonZombieGraveyard"],
            3: [],
        },
        UnholyLife: {
            1: ["PutridExpulsion", "EtherealOoze", "UnholyGrasp", "SummonZombie", "SummonGhoul"],
            2: ["SpectralWalk", "TheTruePlague"],
            3: ["DarkPit", "LifeDrain"],
        },
        SkeletalLich: {
            1: ["BoneStrike", "ImpalingSpike", "Ossification", "SummonSkeleton", "SummonSkeletalWarrior"],
            2: ["HookLineAndSinker", "BoneMetal"],
            3: ["HailOfBones", "BoneCoffin"],
        },
    },
};
