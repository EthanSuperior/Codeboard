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

function hasPerk(perk, noperk) {
    return function () {
        return this.perk ? perk : noperk;
    };
}
// Bloodthirst: Tier 1 Fighter[Bezerker] Ability
registerAbility("Bloodthirst_1", {
    mode: "Passive",
    onactivate: function (player) {
        function selfheal(source, amount) {
            player.health += amount * 0.025 * (player.health.missingPercent / 10);
        }
        player.addEffect("onhit", "bloodthirst_1_Effect", selfheal);
    },
    ondeactivate: function (player) {
        player.removeEffect("onhit", "bloodthirst_1_Effect");
    },
});

// RecklessRage: Tier 2 Fighter[Bezerker] Ability
registerAbility("RecklessRage_1", {
    mode: "Instant",
    cooldown: 45,
    cost: 0.1,
    onactivate: function (player) {
        if (player.hasPerk) this.duration = 12;
        player.health *= 0.5;
        player.damage.percentBuff += 0.2;
        function selfheal(source, amount) {
            if (source == player) amount *= 2;
        }
        player.addEffect("onheal", "RecklessRage_1_Effect", selfheal);
    },
    ondeactivate: function (player) {
        player.damage.percentBuff -= 0.2;
        player.removeEffect("onheal", "RecklessRage_1_Effect");
    },
    duration: 10,
});

registerAbility("RecklessRage_2", {
    mode: "Passive",
    onapply: function (player) {
        function getModPercent() {
            //this is player
            const missPerc = 1 - this.health / this.maxHealth;
            if (missPerc <= 0.3) return 1;
            // Somehow round to nearest .1?
            return 1 + Math.min(0.6, missingHealthPercentage + 0.3);
        }
        player.addModifier("atkspeed", "RecklessRage_2_Modifier", getModPercent);
    },
    onremove: function (player) {
        player.removeModifier("RecklessRage_2_Modifier");
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
