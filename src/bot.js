// cookie bot: auto-play-through cookie clicker
// see also https://github.com/yauhenl/CookieBot

var AutoPlay;

if (!AutoPlay) AutoPlay = {};
AutoPlay.version = "2.016";
AutoPlay.gameVersion = "2.016";
AutoPlay.robotName = "Automated ";
AutoPlay.delay = 0;
AutoPlay.night = false;
AutoPlay.finished = false;
AutoPlay.deadline = 0;

AutoPlay.run = function () {
    if (Game.AscendTimer > 0 || Game.ReincarnateTimer > 0) return;
    if (AutoPlay.delay > 0) {
        AutoPlay.delay--;
        return;
    }
    AutoPlay.now = Date.now();
    if (AutoPlay.nextAchievement === 397) {
        AutoPlay.runJustRight();
        return;
    }
    if (AutoPlay.nightMode()) {
        AutoPlay.cheatSugarLumps(AutoPlay.now - Game.lumpT);
        return;
    }
    if (AutoPlay.now < AutoPlay.deadline) {
        AutoPlay.handleClicking();
        AutoPlay.handleGoldenCookies();
        return;
    }
    AutoPlay.activities = AutoPlay.mainActivity;
    AutoPlay.deadline = AutoPlay.now + 60000; // wait one minute before next step
    AutoPlay.cpsMult = 1;
    for (var i in Game.buffs)
        if (typeof Game.buffs[i].multCpS != 'undefined')
            AutoPlay.cpsMult *= Game.buffs[i].multCpS;
    // if high cps then do not wait
    if (AutoPlay.cpsMult > 100) AutoPlay.setDeadline(0);
    if (AutoPlay.plantPending || AutoPlay.harvestPlant)
        AutoPlay.addActivity("Wait with ascend until plants are harvested!");
    AutoPlay.handleClicking();
    AutoPlay.handleGoldenCookies();
    AutoPlay.handleBuildings();
    AutoPlay.handleUpgrades();
    AutoPlay.handleSeasons();
    AutoPlay.handleDragon();
    AutoPlay.handleWrinklers();
    AutoPlay.handleSugarLumps();
    AutoPlay.handleAscend();
    AutoPlay.handleNotes();
};

AutoPlay.runRightCount = 0;

AutoPlay.runJustRight = function () {
    AutoPlay.activities = "Running just right.";
    AutoPlay.handleAscend();
    if (Game.ObjectsById[Game.ObjectsById.length - 1].amount)
        AutoPlay.doAscend("Starting runJustRight properly.", 0);
    const goal = 1000000000000;
    const notBuy = [0, 1, 2, 3, 4, 5, 6, 129, 324];
    if (Game.cookies < goal / 10) { // buying buildings and upgrades
        for (var i = Game.ObjectsById.length - 2; i >= 0; i--) {
            var me = Game.ObjectsById[i];
            if ((me.getPrice() < Game.cookies) &&
                (me.amount < 10 + Game.ObjectsById[i + 1].amount)) {
                me.buy(1);
                return;
            }
        }
        Game.UpgradesById.forEach(function (e) {
            if (e.unlocked && !e.bought && e.canBuy() && e.pool !== "toggle" &&
                notBuy.indexOf(e.id) < 0) {
                e.buy(true);
            }
        });
    } else {
        var cookieDiff = goal - Game.cookies;
        if (Game.BuildingsOwned === 0) { // almost there
            if (cookieDiff < 0) AutoPlay.runRightCount++;
            if (Math.round(Game.cookiesd) === goal)
                AutoPlay.doAscend("Fixed run just right.", 1);
            else if ((cookieDiff < -goal) && (AutoPlay.now - Game.startDate > 60000))
                AutoPlay.doAscend("runJustRight does not work, retry.", 0);
            else if (cookieDiff < -2000000000) Game.ObjectsById[0].buy(130 + AutoPlay.runRightCount);
            else if (cookieDiff < -6000000) Game.ObjectsById[0].buy(90 + AutoPlay.runRightCount);
            else if (cookieDiff < -30000) Game.ObjectsById[0].buy(50 + AutoPlay.runRightCount);
            else if (cookieDiff < 0) Game.ObjectsById[0].buy(22 + AutoPlay.runRightCount);
            else if (cookieDiff > 10000000) Game.ObjectsById[5].buy(1);
            else if (cookieDiff > 500000) Game.ObjectsById[4].buy(1);
            else if (cookieDiff > 5000) Game.ObjectsById[2].buy(1);
            else if (cookieDiff > 50) Game.ObjectsById[0].buy(1);
            else Game.ClickCookie();
        } else { // now we are selling
            if (cookieDiff / Game.cookiesPs > 1000) Game.ObjectsById[5].buy(1);
            for (var i = Game.ObjectsById.length - 2; i >= 0; i--) {
                var me = Game.ObjectsById[i];
                if (me.amount > 10 + Game.ObjectsById[i + 1].amount) {
                    me.sell(me.amount - (10 + Game.ObjectsById[i + 1].amount));
                    return;
                }
                if (me.amount > 0 &&
                    (4 * me.getReverseSumPrice(me.amount) + Game.cookiesPs > cookieDiff)) {
                    me.sell(100);
                }
            }
        }
    }
};

//===================== Night Mode ==========================
AutoPlay.preNightMode = function () {
    if (AutoPlay.Config.NightMode !== 1) return false;
    var h = (new Date).getHours();
    return (h >= 22);
};

AutoPlay.nightMode = function () {
    if (Game.OnAscend) return false;
    if (AutoPlay.Config.NightMode === 0) return false;
    if (AutoPlay.grinding() && !AutoPlay.endPhase())
        return false; //do not sleep while grinding
    var h = (new Date).getHours();
    if (AutoPlay.Config.NightMode === 1 && h >= 7 && h < 23) { // be active
        if (AutoPlay.night) AutoPlay.useLump();
        AutoPlay.night = false;
        AutoPlay.nightAtTemple(false);
        var gs = Game.Upgrades["Golden switch [on]"];
        if (gs.unlocked) {
            gs.buy();
        }
        AutoPlay.nightAtGarden(false);
        return false;
    }
    if (AutoPlay.night) { //really sleep now
        AutoPlay.activities = 'The bot is sleeping.';
        return true;
    }
    AutoPlay.addActivity('Preparing for the night.');
    var gs = Game.Upgrades["Golden switch [off]"];
    if (gs.unlocked) {
        AutoPlay.handleGoldenCookies();
        var buffCount = 0;
        for (var i in Game.buffs) if (Game.buffs[i].time >= 0) buffCount++;
        if ((buffCount === 1 && Game.hasBuff("Clot")) || h < 7) gs.buy();
        if (!gs.bought) return true; // do not activate spirits before golden switch
    }
    AutoPlay.nightAtTemple(true);
    AutoPlay.nightAtGarden(true);
    AutoPlay.night = true;
    return true;
};

//===================== Handle Cookies and Golden Cookies =====================
AutoPlay.handleGoldenCookies = function () { // pop first golden cookie or reindeer
    if (AutoPlay.Config.GoldenClickMode === 0) return;
    if (Game.shimmerTypes['golden'].n >= 4 &&
        !Game.Achievements['Four-leaf cookie'].won) return;
    for (var sx in Game.shimmers) {
        var s = Game.shimmers[sx];
        if (s.type !== "golden" || s.life < Game.fps || !Game.Achievements["Early bird"].won) {
            s.pop();
            AutoPlay.setDeadline(0);
            return;
        }
        if ((s.life / Game.fps) < (s.dur - 2) && (Game.Achievements["Fading luck"].won)) {
            s.pop();
            AutoPlay.setDeadline(0);
            if (AutoPlay.Config.GoldenClickMode === 1) return;
        }
    }
    AutoPlay.cheatGoldenCookies();
};

AutoPlay.cheatGoldenCookies = function () {
    if (AutoPlay.Config.CheatGolden === 0) return;
    var level = 10 + 30 * (AutoPlay.Config.CheatGolden - 1);
    if (AutoPlay.Config.CheatGolden === 1) {
        if (AutoPlay.wantAscend) return; // already cheated enough
        if (!AutoPlay.grinding() || AutoPlay.endPhase())
            return; // only cheat in grinding
        var daysInRun = (AutoPlay.now - Game.startDate) / 1000 / 60 / 60 / 24;
        if (daysInRun < 20) return; // cheat only after 20 days
        level = ((3 * daysInRun)) - 20;
    }
    if (level > 100) level = 100;
    AutoPlay.addActivity('Cheating golden cookies at level ' + level + '.');
    var levelTime = Game.shimmerTypes.golden.maxTime * level / 140;
    if (Game.shimmerTypes.golden.time < levelTime)
        Game.shimmerTypes.golden.time = levelTime;
    /* golden cookie with building special:
      var newShimmer=new Game.shimmer("golden");
      newShimmer.force="building special";
    */
};

AutoPlay.handleClicking = function () {
    if (AutoPlay.Config.ClickMode === 0) return;
    if (!Game.Achievements["Neverclick"].won && (Game.cookieClicks <= 15)) {
        AutoPlay.addActivity('Waiting for neverclick.');
        return;
    }
    if (Game.ascensionMode === 1 && AutoPlay.endPhase() &&
        !Game.Achievements["True Neverclick"].won && !Game.cookieClicks) {
        AutoPlay.addActivity('Waiting for true neverclick.');
        return;
    }
    if (!Game.Achievements["Uncanny clicker"].won)
        for (var i = 1; i < 6; i++) setTimeout(Game.ClickCookie, 50 * i);
    if (Game.ascensionMode === 1 && Game.Achievements["Hardcore"].won)
        setTimeout(Game.ClickCookie, 150); // extra clicking for speed baking
    if (AutoPlay.Config.ClickMode > 1)
        for (var i = 1; i < 10; i++) setTimeout(AutoPlay.speedClicking, 30 * i);
    Game.ClickCookie();
};

AutoPlay.speedClicking = function () {
    Game.ClickCookie();
    var clickCount = 1 << (10 * (AutoPlay.Config.ClickMode - 2));
    Game.ClickCookie(0, clickCount * Game.computedMouseCps);
};

//===================== Handle Upgrades ==========================
AutoPlay.handleUpgrades = function () {
    if (!Game.Achievements["Hardcore"].won && Game.UpgradesOwned === 0) return;
    Game.UpgradesById.forEach(function (e) {
        if (e.unlocked && !e.bought && e.canBuy() && !AutoPlay.avoidbuy(e))
            e.buy(true);
    });
    if (Game.lumps > 100 && Game.Upgrades["Sugar frenzy"].unlocked &&
        !Game.Upgrades["Sugar frenzy"].bought &&
        (AutoPlay.now - Game.startDate) > 3 * 24 * 60 * 60 * 1000)
        Game.Upgrades["Sugar frenzy"].buy();
};

AutoPlay.avoidbuy = function (up) { //normally we do not buy 227, 71, ...
    switch (up.id) {
        case 71:
            return Game.Achievements["Elder nap"].won &&
                Game.Achievements["Elder slumber"].won &&
                Game.Achievements["Elder calm"].won &&
                (!Game.Achievements["Reincarnation"].won ||
                    Game.Upgrades["Arcane sugar"].bought); // brainsweep
        case 73:
            return Game.Achievements["Elder nap"].won &&
                Game.Achievements["Elder slumber"].won &&
                Game.Achievements["Elder calm"].won; // elder pact
        case 74:
            return Game.Achievements["Elder nap"].won &&
                Game.Achievements["Elder slumber"].won &&
                Game.Upgrades["Elder Covenant"].unlocked; // elder pledge
        case 84:
            return Game.Upgrades["Elder Pledge"].bought ||
                Game.Achievements["Elder calm"].won; // elder covenant
        case 227:
            return true; // choco egg
        default:
            return up.pool === "toggle";
    }
};

//===================== Handle Buildings ==========================
AutoPlay.handleBuildings = function () {
    var buyAmount = 100, checkAmount = 1;
    if (Game.buyMode === -1) Game.storeBulkButton(0);
    if ((AutoPlay.now - Game.startDate) > 10 * 60 * 1000)
        buyAmount = 1; // buy single after 10 minutes
    if (Game.resets && Game.ascensionMode !== 1 &&
        Game.isMinigameReady(Game.Objects["Temple"]) &&
        Game.Objects["Temple"].minigame.slot[0] === 10 && // Rigidel is in slot 0
        Game.BuildingsOwned % 10 === 0 && (AutoPlay.now - Game.startDate) > 2 * 60 * 1000)
        buyAmount = checkAmount = 10;
    var cpc = 0; // relative strength of cookie production
    for (var i = Game.ObjectsById.length - 1; i >= 0; i--) {
        var me = Game.ObjectsById[i];
        var mycpc = me.storedCps / me.price;
        if (mycpc > cpc) cpc = mycpc;
    }
    for (var i = Game.ObjectsById.length - 1; i >= 0; i--) {
        var me = Game.ObjectsById[i];
        if ((me.storedCps / me.price > cpc / 2 || me.amount % 50 >= 40) &&
            (me.getSumPrice(checkAmount) < Game.cookies)) {
            me.buy(buyAmount);
            AutoPlay.setDeadline(0);
            return;
        }
    }
    if (Game.resets && Game.ascensionMode !== 1 &&
        Game.isMinigameReady(Game.Objects["Temple"]) &&
        Game.Objects["Temple"].minigame.slot[0] === 10 &&
        Game.BuildingsOwned % 10 !== 0) { // Rigidel is in slot 0, buy the cheapest
        var minIdx = 0, minPrice = Game.ObjectsById[minIdx].price;
        for (var i = Game.ObjectsById.length - 1; i >= 0; i--)
            if (Game.ObjectsById[i].price < minPrice) {
                minPrice = Game.ObjectsById[i].price;
                minIdx = i;
            }
        Game.ObjectsById[minIdx].buy();
    }
};

//===================== Handle Seasons ==========================
AutoPlay.handleSeasons = function () {
    if (Game.Upgrades["A festive hat"].bought &&
        !Game.Upgrades["Santa's dominion"].unlocked) { // develop santa
        Game.specialTab = "santa";
        Game.UpgradeSanta();
        Game.ToggleSpecialMenu(0);
    }
    if (!Game.Upgrades["Season switcher"].bought || Game.ascensionMode === 1) return;
    if (AutoPlay.seasonFinished(Game.season)) {
        switch (Game.season) {
            case "christmas":
                Game.Upgrades["Bunny biscuit"].buy();
                break; // to easter
            case "easter":
                Game.Upgrades["Lovesick biscuit"].buy();
                break; // to valentine
            case "valentines":
                Game.Upgrades["Ghostly biscuit"].buy();
                break; // to halloween
            default:
                Game.Upgrades["Festive biscuit"].buy();
                break; // to christmas
        }
    } else if (!(AutoPlay.allUnlocked(AutoPlay.allSeasonUpgrades)))
        AutoPlay.addActivity('Waiting for all results in ' + Game.season + '.');
};

AutoPlay.valentineUpgrades = range(169, 174);
AutoPlay.christmasUpgrades = [168].concat(range(152, 166)).concat(range(143, 149));
AutoPlay.easterUpgrades = range(210, 229);
AutoPlay.halloweenUpgrades = range(134, 140);
AutoPlay.allSeasonUpgrades =
    AutoPlay.valentineUpgrades.concat(AutoPlay.christmasUpgrades).concat(AutoPlay.easterUpgrades).concat(AutoPlay.halloweenUpgrades);

AutoPlay.allUnlocked = function (l) {
    return l.every(function (u) {
        return Game.UpgradesById[u].unlocked;
    });
};

AutoPlay.seasonFinished = function (s) {
    if (s === '') return true;
    switch (s) {
        case "valentines":
            return AutoPlay.allUnlocked(AutoPlay.valentineUpgrades);
        case "christmas":
            if (AutoPlay.allUnlocked(AutoPlay.allSeasonUpgrades)) return false;
            else return AutoPlay.allUnlocked(AutoPlay.christmasUpgrades);
        case "easter":
            return (Game.Achievements["Hide & seek champion"].won &&
                AutoPlay.allUnlocked(AutoPlay.easterUpgrades));
        case "halloween":
            return AutoPlay.allUnlocked(AutoPlay.halloweenUpgrades);
        default:
            return true;
    }
};

//===================== Handle Sugarlumps ==========================
AutoPlay.level1Order = [2, 6, 7]; // unlocking in this order for the minigames
AutoPlay.level10Order = [2, 7]; // finishing in this order
AutoPlay.minLumps = AutoPlay.level1Order.length + 55 * AutoPlay.level10Order.length;
AutoPlay.lumpRelatedAchievements = range(307, 320).concat([336, 396, 268, 271]);

AutoPlay.handleSugarLumps = function () {
    if (!Game.canLumps()) return; //do not work with sugar lumps before enabled
    if (Game.ascensionMode === 1) return; //no sugar lumps in born again
    var age = AutoPlay.now - Game.lumpT;
    if (age >= Game.lumpMatureAge && Game.lumpCurrentType === 0 &&
        Game.lumpsTotal > AutoPlay.minLumps && !Game.Achievements["Hand-picked"].won)
        AutoPlay.harvestLump();
//  if(Game.lumpCurrentType==0) AutoPlay.farmGoldenSugarLumps(age);
// not needed now, because we cheat sugar lumps
    if (age >= Game.lumpRipeAge)
        AutoPlay.harvestLump(); // normal harvesting, should check !masterCopy
    AutoPlay.cheatSugarLumps(age);
    AutoPlay.useLump();
    AutoPlay.handleMinigames();
};

AutoPlay.cheatSugarLumps = function (age) {
    AutoPlay.cheatLumps = false;
    if (AutoPlay.Config.CheatLumps === 0) return;
    var cheatReduction = 25;
    if (AutoPlay.Config.CheatLumps === 1) {
        if (AutoPlay.finished) return;
        if (!AutoPlay.endPhase()) return;
        if (AutoPlay.lumpRelatedAchievements.every(
            function (a) {
                return Game.AchievementsById[a].won;
            }))
            return;
        if (AutoPlay.lumpRelatedAchievements.includes(AutoPlay.nextAchievement))
            cheatReduction *= 25;
    }
    AutoPlay.cheatLumps = true;
    AutoPlay.addActivity('Cheating sugar lumps.');
    // divide lump ripe time, making days into hours, minutes or seconds
    if (AutoPlay.Config.CheatLumps === 2) cheatReduction = 25;
    if (AutoPlay.Config.CheatLumps === 3) cheatReduction = 25 * 25;
    if (AutoPlay.Config.CheatLumps === 4) {
        cheatReduction = 25 * 25 * 25;
        AutoPlay.setDeadline(0);
    }
    var cheatDelay = Game.lumpRipeAge / cheatReduction;
    if (age < Game.lumpRipeAge - cheatDelay) Game.lumpT -= cheatDelay * (cheatReduction - 1);
};

AutoPlay.harvestLump = function () {
    Game.clickLump();
    AutoPlay.useLump();
};

AutoPlay.useLump = function () { // recursive call to handle many sugar lumps
    if (!Game.lumps) return;
    for (var i in AutoPlay.level1Order) {
        var me = Game.ObjectsById[AutoPlay.level1Order[i]];
        if (!me.level && Game.lumps) {
            me.levelUp();
            AutoPlay.useLump();
            return;
        }
    }
    for (var i in AutoPlay.level10Order) {
        var me = Game.ObjectsById[AutoPlay.level10Order[i]];
        if (me.level < 10) {
            if (me.level < Game.lumps) {
                me.levelUp();
                AutoPlay.useLump();
            }
            return;
        }
    }
    if (Game.lumps < 99) return; // collect lumps for  better cps
    for (var i = Game.ObjectsById.length - 1; i >= 0; i--) {
        var me = Game.ObjectsById[i];
        if (me.level < 10 && me.level < Game.lumps) {
            me.levelUp();
            AutoPlay.useLump();
            return;
        }
    }
};


/* farming golden sugar lumps - not needed now since we cheat sugar lumps
AutoPlay.copyWindows=[]; // need to init in the code some place
AutoPlay.masterSaveCopy=0;
AutoPlay.masterLoadCopy=0;
AutoPlay.copyCount=100;

// golden sugar lumps = 1 in 2000 (ordinary) -> about 5 years
// this is tested and it works (some kind of cheating) - do this only in endgame
AutoPlay.farmGoldenSugarLumps = function(age) {
  if (Game.Achievements["All-natural cane sugar"].won) return;
  if (AutoPlay.nextAchievement!=Game.Achievements["All-natural cane sugar"].id)
	return;
  if (AutoPlay.masterSaveCopy) {
    AutoPlay.info("back to save master");
	Game.LoadSave(AutoPlay.masterSaveCopy);
	AutoPlay.masterSaveCopy = 0;
	return;
  }
  if (age<Game.lumpRipeAge && age>=Game.lumpMatureAge) {
    if (AutoPlay.copyWindows.length>=AutoPlay.copyCount) { // check rather !masterCopy
	  AutoPlay.info("creating master load copy");
	  AutoPlay.masterLoadCopy = Game.WriteSave(1);
	}
    if (AutoPlay.copyWindows.length) {
	  Game.LoadSave(AutoPlay.copyWindows.pop());
	  if (Game.lumpCurrentType)
		AutoPlay.info("found lump with type " + Game.lumpCurrentType);
	  if (Game.lumpCurrentType==2) {
	    AutoPlay.info("YESS, golden lump");
		AutoPlay.masterLoadCopy = 0; AutoPlay.copyWindows=[];
	  }
	} else if (AutoPlay.masterLoadCopy) {
	  AutoPlay.info("going back to master copy");
	  Game.LoadSave(AutoPlay.masterLoadCopy);
	  AutoPlay.masterLoadCopy = 0; }
  }
  if (age>=Game.lumpRipeAge && AutoPlay.copyWindows.length<AutoPlay.copyCount) {
    if(!AutoPlay.copyWindows.length) AutoPlay.info("farming golden sugar lumps.");
    AutoPlay.masterSaveCopy = Game.WriteSave(1);
    Game.clickLump();
    AutoPlay.copyWindows.push(Game.WriteSave(1));
  }
}
*/

AutoPlay.handleMinigames = function () {
    // wizard towers: grimoires ===========================0
    if (Game.isMinigameReady(Game.Objects["Wizard tower"])) {
        var g = Game.Objects["Wizard tower"].minigame;
        var sp = g.spells["hand of fate"]; // try to get a sugar lump in backfiring
        if (Game.shimmerTypes['golden'].n && g.magic >= g.getSpellCost(sp) &&
            g.magic / g.magicM >= 0.95)
            g.castSpell(sp);
        if (Game.shimmerTypes['golden'].n === 2 &&
            !Game.Achievements["Four-leaf cookie"].won && Game.lumps > 0 &&
            g.magic >= g.getSpellCost(sp))
            g.castSpell(sp);
        if (Game.shimmerTypes['golden'].n === 3 &&
            !Game.Achievements["Four-leaf cookie"].won) {
            g.lumpRefill.click();
            g.castSpell(sp);
        }
        sp = g.spells["conjure baked goods"];
        if (AutoPlay.cpsMult > 100) {
            if (g.magic >= g.getSpellCost(sp)) {
                g.castSpell(sp);
                return;
            }
            if (Game.lumps > 100) {
                g.lumpRefill.click();
            }
        }
    }
    // temples: pantheon =============================
    if (Game.isMinigameReady(Game.Objects["Temple"])) {
        var age = AutoPlay.now - Game.lumpT;
        if (Game.lumpRipeAge - age < 61 * 60 * 1000 && !AutoPlay.cheatLumps)
            AutoPlay.assignSpirit(0, "order", 0);
        else if (AutoPlay.preNightMode() && Game.lumpOverripeAge - age < 9 * 60 * 60000 &&
            (new Date).getMinutes() === 59 && !AutoPlay.cheatLumps)
            AutoPlay.assignSpirit(0, "order", 0);
        else AutoPlay.assignSpirit(0, "mother", 0);
        AutoPlay.assignSpirit(1, "decadence", 0);
        AutoPlay.assignSpirit(2, "labor", 0);
    }
    // farms: garden ================================
    if (Game.isMinigameReady(Game.Objects["Farm"])) {
        var g = Game.Objects["Farm"].minigame;
        AutoPlay.harvesting(g);
        AutoPlay.planting(g);
        if (Game.lumps < 100 && AutoPlay.gardenReady(g) && !AutoPlay.finished &&
            !AutoPlay.harvestPlant && !AutoPlay.lumpRelatedAchievements.every(
                function (a) {
                    return Game.AchievementsById[a].won;
                })) {
            AutoPlay.plantCookies = false;
            //convert garden in order to get more sugar lumps
            g.harvestAll();
            g.askConvert();
            Game.ConfirmPrompt();
            AutoPlay.plantList = [0, 0, 0, 0];
        }
    }
};

AutoPlay.gardenUpgrades = range(470, 476);

AutoPlay.gardenReady = function (g) { // have all plants and all cookies
    return (Game.Objects["Farm"].level > 8) &&
        (g.plantsUnlockedN === g.plantsN) &&
        AutoPlay.allUnlocked(AutoPlay.gardenUpgrades);
};

AutoPlay.nightAtTemple = function (on) {
    if (!Game.isMinigameReady(Game.Objects["Temple"])) return;
    if (on) {
        AutoPlay.removeSpirit(1, "decadence");
        AutoPlay.removeSpirit(2, "labor");
        AutoPlay.assignSpirit(1, "asceticism", 1);
        AutoPlay.assignSpirit(2, "industry", 1);
    } else {
        AutoPlay.removeSpirit(1, "asceticism");
    }
};

AutoPlay.nightAtGarden = function (on) {
    if (!Game.isMinigameReady(Game.Objects["Farm"])) return;
    if (on !== Game.Objects["Farm"].minigame.freeze)
        FireEvent(l('gardenTool-2'), 'click'); // (un)freeze garden
};

AutoPlay.plantDependencies = [
    ['dummy', 'dummy', 'dummy'], // just to fill index 0
    ['queenbeetLump', 'queenbeet', 'queenbeet'], // need to know its index
    ['everdaisy', 'elderwort', 'tidygrass'], // need to know its index
// critical path
    ['thumbcorn', 'bakerWheat', 'bakerWheat'], //level 1
    ['cronerice', 'bakerWheat', 'thumbcorn'], //level 2
    ['gildmillet', 'thumbcorn', 'cronerice'], //level 3
    ['clover', 'bakerWheat', 'gildmillet'], //level 4
    ['shimmerlily', 'gildmillet', 'clover'], //level 5
    ['elderwort', 'cronerice', 'shimmerlily'], //level 6
//rest is given according to ripening times
    ['drowsyfern', 'chocoroot', 'keenmoss'], //level 7
    ['duketater', 'queenbeet', 'queenbeet'], //level 3
    ['tidygrass', 'bakerWheat', 'whiteChocoroot'], //level 3
    ['queenbeet', 'chocoroot', 'bakeberry'], //level 2
    ['nursetulip', 'whiskerbloom', 'whiskerbloom'], //level 7
    ['doughshroom', 'crumbspore', 'crumbspore'], //level 1
    ['bakeberry', 'bakerWheat', 'bakerWheat'], //level 1
    ['wrinklegill', 'crumbspore', 'brownMold'], //level 1
    ['shriekbulb', 'wrinklegill', 'elderwort'], //level 7
    ['ichorpuff', 'crumbspore', 'elderwort'], //level 7
    ['whiskerbloom', 'whiteChocoroot', 'shimmerlily'], //level 6
    ['chimerose', 'whiskerbloom', 'shimmerlily'], //level 7
    ['keenmoss', 'brownMold', 'greenRot'], //level 6
    ['wardlichen', 'cronerice', 'whiteMildew'], //level 3
    ['glovemorel', 'thumbcorn', 'crumbspore'], //level 2
    ['chocoroot', 'bakerWheat', 'brownMold'], //level 1
    ['whiteChocoroot', 'chocoroot', 'whiteMildew'], //level 2
    ['whiteMildew', 'brownMold', 'brownMold'], //level 1
    ['goldenClover', 'bakerWheat', 'gildmillet'], //level 4
    ['greenRot', 'clover', 'whiteMildew'], //level 5
    ['cheapcap', 'crumbspore', 'shimmerlily'], //level 6
    ['foolBolete', 'greenRot', 'doughshroom'] //level 6
];

if (!AutoPlay.plantList) AutoPlay.plantList = [0, 0, 0, 0];
AutoPlay.plantPending = false; // Plant we want that is not mature yet
AutoPlay.harvestPlant = false; // Plant that drops things when harvesting
AutoPlay.plantsMissing = true; // Still unlocked plants?

AutoPlay.sectorText = function (sector) {
    if (Game.Objects["Farm"].level > 4)
        return (sector < 2 ? 'bottom' : 'top') + (sector % 2 ? ' left' : ' right');
    else if (Game.Objects["Farm"].level === 4) return (sector % 2 ? 'left' : 'right');
    else return 'middle';
};

AutoPlay.havePlant = function (game, plant) {
    if (game.plants[plant].unlocked) return true;
    var plantID = game.plants[plant].id + 1;
    for (var x = 0; x < 6; x++) for (var y = 0; y < 6; y++) {
        if ((game.getTile(x, y))[0] === plantID) return true;
    }
    return false;
};

AutoPlay.findPlants = function (game, idx) {
    if (AutoPlay.wantAscend) return false; // do not plant before ascend
    var couldPlant = 0;
    if (AutoPlay.plantList[idx] !== 0) {// already used
        var oldPlant = AutoPlay.plantDependencies[AutoPlay.plantList[idx]][0];
        AutoPlay.addActivity("Trying to get plant " + game.plants[oldPlant].name +
            " on sector " + AutoPlay.sectorText(idx) + '.');
        AutoPlay.plantCookies = false;
        if (AutoPlay.havePlant(game, oldPlant)) AutoPlay.plantList[idx] = 0;
        else return true;
    }
    // try to plant expensive plants first (if possible) as they take longest time.
    var chkx = (idx % 2) ? 0 : 5;
    var chky = (idx > 1) ? 0 : 5;
    if (game.isTileUnlocked(chkx, chky)) { // only plant if the spot is big enough
        if (!AutoPlay.havePlant(game, 'everdaisy') &&
            game.plants['elderwort'].unlocked && game.plants['tidygrass'].unlocked) {
            if (AutoPlay.plantList.includes(2)) couldPlant = 2;
            else {
                AutoPlay.plantList[idx] = 2;
                return true;
            }
        }
        if (!AutoPlay.havePlant(game, 'queenbeetLump') &&
            game.plants['queenbeet'].unlocked) {
            if (AutoPlay.plantList.includes(1)) couldPlant = 1;
            else {
                AutoPlay.plantList[idx] = 1;
                return true;
            }
        }
    }
    for (var i = 3; i < AutoPlay.plantDependencies.length; i++) { // plant normal plants
        var plant = AutoPlay.plantDependencies[i][0];
        if (!AutoPlay.havePlant(game, plant) &&
            game.plants[AutoPlay.plantDependencies[i][1]].unlocked &&
            game.plants[AutoPlay.plantDependencies[i][2]].unlocked) { // want it
            if (AutoPlay.plantList.includes(i)) {
                if (!couldPlant) couldPlant = i; // already planted - remember it
            } else {
                AutoPlay.plantList[idx] = i;
                return true;
            }
        }
    }
    if (!couldPlant) return false;
    AutoPlay.plantList[idx] = couldPlant;
    return true;
};

AutoPlay.planting = function (game) {
    if (!game.plants["meddleweed"].unlocked) {  // wait for meddleweed
        AutoPlay.plantList = [0, 0, 0, 0];
        AutoPlay.addActivity("Waiting for meddleweed.");
        AutoPlay.switchSoil(game, 0, 'fertilizer');
        return;
    }
    if (!game.plants["crumbspore"].unlocked || !game.plants["brownMold"].unlocked) {
        AutoPlay.addActivity("Trying to get crumbspore and brown mold."); // use meddleweed
        for (var x = 0; x < 6; x++) for (var y = 0; y < 6; y++)
            if (game.isTileUnlocked(x, y)) AutoPlay.plantSeed(game, "meddleweed", x, y);
        return;
    }
    AutoPlay.plantsMissing = true;
    if (!AutoPlay.findPlants(game, 0)) {
        AutoPlay.plantList = [0, 0, 0, 0];
        for (var i = 0; i < 4; i++) AutoPlay.plantSector(game, i, '', '', 'dummy');
        return;
    }
    AutoPlay.switchSoil(game, 0, AutoPlay.plantPending ? 'fertilizer' : 'woodchips'); // want mutations
    if (Game.Objects["Farm"].level < 4) {
        AutoPlay.plantSeed(game, AutoPlay.plantDependencies[AutoPlay.plantList[0]][1], 3, 2);
        AutoPlay.plantSeed(game, AutoPlay.plantDependencies[AutoPlay.plantList[0]][2], 3, 3);
        if (game.isTileUnlocked(3, 4))
            AutoPlay.plantSeed(game, AutoPlay.plantDependencies[AutoPlay.plantList[0]][1], 3, 4);
        return;
    }
    AutoPlay.findPlants(game, 1);
    if (Game.Objects["Farm"].level === 4) { // now we are at level 4
        if (AutoPlay.plantList[1] === 0) {
            AutoPlay.info("ERROR 42?");
            return;
        }
        AutoPlay.plantSeed(game, AutoPlay.plantDependencies[AutoPlay.plantList[0]][1], 4, 2);
        AutoPlay.plantSeed(game, AutoPlay.plantDependencies[AutoPlay.plantList[0]][2], 4, 3);
        AutoPlay.plantSeed(game, AutoPlay.plantDependencies[AutoPlay.plantList[0]][1], 4, 4);
        AutoPlay.plantSeed(game, AutoPlay.plantDependencies[AutoPlay.plantList[1]][1], 1, 2);
        AutoPlay.plantSeed(game, AutoPlay.plantDependencies[AutoPlay.plantList[1]][2], 1, 3);
        AutoPlay.plantSeed(game, AutoPlay.plantDependencies[AutoPlay.plantList[1]][1], 1, 4);
        return;
    }
    AutoPlay.findPlants(game, 2);
    AutoPlay.findPlants(game, 3); // plant on four areas
    for (var sector = 0; sector < 4; sector++) {
        var dep = AutoPlay.plantDependencies[AutoPlay.plantList[sector]];
        AutoPlay.plantSector(game, sector, dep[1], dep[2], dep[0]);
    }
};

AutoPlay.plantSector = function (game, sector, plant1, plant2, plant0) {
    var X = (sector % 2) ? 0 : 3, Y = (sector > 1) ? 0 : 3;
    if (plant0 === "dummy") {
        var thePlant = AutoPlay.seedCalendar(game, sector);
        for (var x = X; x < X + 3; x++) for (var y = Y; y < Y + 3; y++)
            AutoPlay.plantSeed(game, thePlant, x, y);
        return;
    }
    if (plant0 === "queenbeetLump") {
        for (var y = Y; y < Y + 3; y++) {
            AutoPlay.plantSeed(game, plant1, X, y);
            AutoPlay.plantSeed(game, plant2, X + 2, y);
        }
        AutoPlay.plantSeed(game, plant1, X + 1, Y);
        AutoPlay.plantSeed(game, plant2, X + 1, Y + 2);
        return;
    }
    if (plant0 === "everdaisy") {
        for (var y = Y; y < Y + 3; y++) {
            AutoPlay.plantSeed(game, plant1, X, y);
            AutoPlay.plantSeed(game, plant2, X + 2, y);
        }
        return;
    }
    AutoPlay.plantSeed(game, plant1, X + 1, Y);
    AutoPlay.plantSeed(game, plant2, X + 1, Y + 1);
    AutoPlay.plantSeed(game, plant1, X + 1, Y + 2);
};

AutoPlay.plantCookies = false;

AutoPlay.plantSeed = function (game, seed, whereX, whereY) {
    if (AutoPlay.cpsMult > 10) return; // do not plant when it is expensive
    if (!game.isTileUnlocked(whereX, whereY)) return; // do not plant on locked tiles
    var oldPlant = (game.getTile(whereX, whereY))[0];
    if (oldPlant !== 0) { // slot is already planted, try to get rid of it
        if (game.plantsById[oldPlant - 1].key !== seed)
            AutoPlay.cleanSeed(game, whereX, whereY);
        return;
    }
    if (!game.canPlant(game.plants[seed])) return;
    game.useTool(game.plants[seed].id, whereX, whereY)
};

AutoPlay.seedCalendar = function (game, sector) {
    if (AutoPlay.wantAscend) return 'bakerWheat'; // plant cheap before ascend
    AutoPlay.plantsMissing = false;
    if (sector === 0) AutoPlay.plantCookies = true;
    var doPrint =
        (sector === 0) || (sector !== 3 && Game.Objects["Farm"].level === sector + 6);
    if (!Game.Upgrades["Wheat slims"].unlocked &&
        game.plants["bakerWheat"].unlocked) {
        AutoPlay.switchSoil(game, sector, 'fertilizer');
        if (doPrint) AutoPlay.addActivity("Trying to get Wheat slims.");
        return "bakerWheat";
    }
    if (!Game.Upgrades["Elderwort biscuits"].unlocked &&
        game.plants["elderwort"].unlocked) {
        AutoPlay.switchSoil(game, sector, 'fertilizer');
        if (doPrint) AutoPlay.addActivity("Trying to get Elderwort cookies.");
        return "elderwort";
    }
    if (!Game.Upgrades["Bakeberry cookies"].unlocked &&
        game.plants["bakeberry"].unlocked) {
        AutoPlay.switchSoil(game, sector, 'fertilizer');
        if (doPrint) AutoPlay.addActivity("Trying to get Bakeberry cookies.");
        return "bakeberry";
    }
    if (!Game.Upgrades["Fern tea"].unlocked &&
        game.plants["drowsyfern"].unlocked) {
        AutoPlay.switchSoil(game, sector, 'fertilizer');
        if (doPrint) AutoPlay.addActivity("Trying to get Fern tea.");
        return "drowsyfern";
    }
    if (!Game.Upgrades["Duketater cookies"].unlocked &&
        game.plants["duketater"].unlocked) {
        AutoPlay.switchSoil(game, sector, 'fertilizer');
        if (doPrint) AutoPlay.addActivity("Trying to get Duketater cookies.");
        return "duketater";
    }
    if (!Game.Upgrades["Green yeast digestives"].unlocked &&
        game.plants["greenRot"].unlocked) {
        AutoPlay.switchSoil(game, sector, 'fertilizer');
        if (doPrint) AutoPlay.addActivity("Trying to get Green yeast digestives.");
        return "greenRot";
    }
    if (!Game.Upgrades["Ichor syrup"].unlocked &&
        game.plants["ichorpuff"].unlocked) {
        AutoPlay.switchSoil(game, sector, 'fertilizer');
        if (doPrint) AutoPlay.addActivity("Trying to get Ichor syrup.");
        return "ichorpuff";
    }
    AutoPlay.plantCookies = false;
    AutoPlay.switchSoil(game, sector, (AutoPlay.plantPending) ? 'fertilizer' : 'clay');
    //use garden to get cps and sugarlumps
    if (game.plants['bakeberry'].unlocked &&
        AutoPlay.lumpRelatedAchievements.every(function (a) {
            return Game.AchievementsById[a].won;
        }))
        return 'bakeberry'; // 1% cps add. + harvest 30 mins with high ratio
    if (game.plants['whiskerbloom'].unlocked) return 'whiskerbloom'; // ca. 1.5% cps
    return 'bakerWheat'; // nothing else works
};

AutoPlay.cleaningGarden = function (game) {
    if (Game.Objects["Farm"].level < 4) {
        if (AutoPlay.plantList[0] === 0) return;
        for (var y = 2; y < 5; y++) {
            AutoPlay.cleanSeed(game, 2, y);
            AutoPlay.cleanSeed(game, 4, y);
        }
    } else if (Game.Objects["Farm"].level === 4) {
        for (var y = 2; y < 5; y++) {
            AutoPlay.cleanSeed(game, 2, y);
            AutoPlay.cleanSeed(game, 3, y);
        }
    } else {
        for (var sector = 0; sector < 4; sector++)
            AutoPlay.cleanSector(game, sector,
                AutoPlay.plantDependencies[AutoPlay.plantList[sector]][0]);
    }
};

AutoPlay.cleanSector = function (game, sector, plant0) {
    if (plant0 === "dummy") return; // do not clean when we are at work
    var X = (sector % 2) ? 0 : 3, Y = (sector > 1) ? 0 : 3;
    if (plant0 === "queenbeetLump") {
        AutoPlay.cleanSeed(game, X + 1, Y + 1);
        return;
    }
    if (plant0 === "everdaisy") {
        for (var y = Y; y < Y + 3; y++) AutoPlay.cleanSeed(game, X + 1, y);
        return;
    }
    if (plant0 === "all") {
        for (var x = X; x < X + 3; x++) for (var y = Y; y < Y + 3; y++)
            if ((x !== X + 1) || (y !== Y + 1)) { // we do not really need that if, do we?
                var tile = game.getTile(x, y);
                if ((tile[0] >= 1) && game.plantsById[tile[0] - 1].unlocked) game.harvest(x, y);
            }
        return;
    }
    for (var y = Y; y < Y + 3; y++) {
        AutoPlay.cleanSeed(game, X, y);
        AutoPlay.cleanSeed(game, X + 2, y);
    }
};

AutoPlay.harvestable =
    ['bakeberry', 'chocoroot', 'whiteChocoroot', 'queenbeet', 'queenbeetLump', 'duketater'];

AutoPlay.cleanSeed = function (game, x, y) {
    if (!game.isTileUnlocked(x, y)) return;
    var tile = game.getTile(x, y);
    if (tile[0] === 0) return;
    var plant = game.plantsById[tile[0] - 1];
    if (!plant.unlocked && tile[1] <= plant.mature) return;
    if (AutoPlay.harvestable.indexOf(plant.key) >= 0 && tile[1] && tile[1] <= plant.mature)
        return; // do not clean harvestable plants
    game.harvest(x, y);
};

AutoPlay.harvesting = function (game) {
    AutoPlay.cleaningGarden(game);
    AutoPlay.plantPending = false;
    AutoPlay.harvestPlant = false;
    for (var x = 0; x < 6; x++) for (var y = 0; y < 6; y++)
        if (game.isTileUnlocked(x, y)) {
            var tile = game.getTile(x, y);
            if (tile[0]) {
                var plant = game.plantsById[tile[0] - 1];
                if (!plant.unlocked) {
                    AutoPlay.plantPending = true;
                    AutoPlay.addActivity(plant.name + " is still growing, do not disturb!");
                    if (tile[1] >= game.plantsById[tile[0] - 1].mature)
                        game.harvest(x, y); // is mature
                } else if (!AutoPlay.plantsMissing &&
                    AutoPlay.harvestable.indexOf(plant.key) >= 0) {
                    AutoPlay.harvestPlant = true;
                    AutoPlay.addActivity("Waiting to harvest " + plant.name + ".");
                    if (tile[1] >= game.plantsById[tile[0] - 1].mature) { // is mature
                        if (AutoPlay.cpsMult > 300) game.harvest(x, y); // harvest when it pays
                    }
                }
                if (AutoPlay.plantCookies && tile[1] >= game.plantsById[tile[0] - 1].mature)
                    game.harvest(x, y); // is mature and can give cookies
                if (plant.ageTick + plant.ageTickR + tile[1] >= 100)
                    AutoPlay.harvest(game, x, y); // would die in next round
            }
        }
};

AutoPlay.harvest = function (game, x, y) {
    game.harvest(x, y);
    var sector = ((x < 3) ? 1 : 0) + ((y < 3) ? 2 : 0);
    if (AutoPlay.plantList[sector] === 1) AutoPlay.cleanSector(game, sector, "all");
};

AutoPlay.switchSoil = function (game, sector, which) {
    if (sector) return;
    if (game.nextSoil > AutoPlay.now) return;
    var me = game.soils[which];
    if (game.soil === me.id || game.parent.bought < me.req) return;
    FireEvent(l('gardenSoil-' + Game.Objects["Farm"].minigame.soils[which].id), 'click');
};

AutoPlay.assignSpirit = function (slot, god, force) {
    var g = Game.Objects["Temple"].minigame;
    if (g.swaps + force < 3) return;
    if (g.slot[slot] === g.gods[god].id) return;
    g.slotHovered = slot;
    g.dragging = g.gods[god];
    g.dropGod();
};

AutoPlay.removeSpirit = function (slot, god) {
    var g = Game.Objects["Temple"].minigame;
    if (g.slot[slot] !== g.gods[god].id) return;
    g.slotHovered = -1;
    g.dragging = g.gods[god];
    g.dropGod();
};

//===================== Handle Wrinklers ==========================
AutoPlay.nextWrinkler = 0;
AutoPlay.wrinklerTime = 0;

AutoPlay.handleWrinklers = function () {
    if (!Game.Upgrades["One mind"].bought) return;
    var doPop = (Game.season === "easter" || Game.season === "halloween");
    doPop = doPop && !AutoPlay.seasonFinished(Game.season);
    doPop = doPop ||
        (Game.Upgrades["Unholy bait"].bought && !Game.Achievements["Moistburster"].won);
    doPop = doPop ||
        (AutoPlay.endPhase() && !Game.Achievements["Last Chance to See"].won);
    if (doPop) {
        AutoPlay.setDeadline(AutoPlay.now + 20000);
        AutoPlay.addActivity("Popping wrinklers for droppings and/or achievements.");
        Game.wrinklers.forEach(function (w) {
            if (w.close === 1) w.hp = 0;
        });
    } else if ((((AutoPlay.now - Game.startDate) > 10 * 24 * 60 * 60 * 1000) || AutoPlay.grinding()) &&
        !AutoPlay.endPhase() && !AutoPlay.wantAscend) {
        AutoPlay.addActivity("Popping one wrinkler per 2 hours, last " +
            (((AutoPlay.now - AutoPlay.wrinklerTime) / 1000 / 60) >> 0) + " minutes ago.");
        if (AutoPlay.now - AutoPlay.wrinklerTime >= 2 * 60 * 60 * 1000) {
            var w = Game.wrinklers[AutoPlay.nextWrinkler];
            if (w.close === 1) w.hp = 0;
            AutoPlay.wrinklerTime = AutoPlay.now;
            AutoPlay.nextWrinkler = (AutoPlay.nextWrinkler + 1) % Game.getWrinklersMax();
        }
    }
};

//===================== Handle Small Achievements ==========================
AutoPlay.backupHeight = 0;
AutoPlay.handleSmallAchievements = function () {
    if (!Game.Achievements["Tabloid addiction"].won)
        for (var i = 0; i < 50; i++) Game.tickerL.click();
    if (!Game.Achievements["Here you go"].won)
        Game.Achievements["Here you go"].click();
    if (!Game.Achievements["Tiny cookie"].won) Game.ClickTinyCookie();
    var bakeryName = Game.bakeryName;
    if (!Game.Achievements["God complex"].won) {
        Game.bakeryName = "Orteil";
        Game.bakeryNamePrompt();
        Game.ConfirmPrompt();
    }
    if (!Game.Achievements["What's in a name"].won ||
        Game.bakeryName.slice(0, AutoPlay.robotName.length) != AutoPlay.robotName) {
        Game.bakeryName = AutoPlay.robotName + bakeryName;
        Game.bakeryNamePrompt();
        Game.ConfirmPrompt();
    }
    if (AutoPlay.endPhase() && !Game.Achievements["Cheated cookies taste awful"].won)
        Game.Win("Cheated cookies taste awful"); // take this after all is done
    if (!Game.Achievements["Third-party"].won)
        Game.Win("Third-party"); // cookie bot is a third party itself
    if (!Game.Achievements["Cookie-dunker"].won && Game.milkProgress > 1 && Game.milkHd > 0.34) {
        if (AutoPlay.backupHeight) {
            Game.LeftBackground.canvas.height = AutoPlay.backupHeight;
            AutoPlay.backupHeight = 0;
        } else {
            AutoPlay.backupHeight = Game.LeftBackground.canvas.height;
            Game.LeftBackground.canvas.height = 400;
            setTimeout(AutoPlay.unDunk, 20 * 1000);
        }
    }
};

AutoPlay.unDunk = function () {
    if (!Game.Achievements["Cookie-dunker"].won) {
        setTimeout(AutoPlay.unDunk, 20 * 1000);
        return;
    }
    Game.LeftBackground.canvas.height = AutoPlay.backupHeight;
    AutoPlay.backupHeight = 0;
};

//===================== Handle Ascend ==========================
AutoPlay.ascendLimit = 0.9 * Math.floor(2 * (1 - Game.ascendMeterPercent));
AutoPlay.wantAscend = false;

AutoPlay.handleAscend = function () {
    if (Game.OnAscend) {
        AutoPlay.doReincarnate();
        AutoPlay.findNextAchievement();
        AutoPlay.setDeadline(0);
        return;
    }
    if (Game.ascensionMode === 1 && !AutoPlay.canContinue())
        AutoPlay.doAscend("reborn mode did not work, retry.", 0);
    if (AutoPlay.preNightMode() && AutoPlay.Config.NightMode === 5)
        return; //do not ascend right before the night
    var daysInRun = (AutoPlay.now - Game.startDate) / 1000 / 60 / 60 / 24;
    if (AutoPlay.endPhase() && !Game.Achievements["Endless cycle"].won &&
        !Game.ascensionMode && Game.Upgrades["Sucralosia Inutilis"].bought) {
        // this costs approx. 2 minutes per 2 ascend
        AutoPlay.activities = "Going for 1000 ascends.";
        AutoPlay.setDeadline(0);
        AutoPlay.wantAscend = true; //avoid byuing plants
        if ((Game.ascendMeterLevel > 0) &&
            (AutoPlay.ascendLimit < Game.ascendMeterLevel * Game.ascendMeterPercent ||
                (Game.prestige + Game.ascendMeterLevel) % 1000 === 777))
            AutoPlay.doAscend("go for 1000 ascends", 0);
    }
    if (Game.Upgrades["Permanent upgrade slot V"].bought &&
        !Game.Achievements["Reincarnation"].won && !Game.ascensionMode) {
        // this costs 3+2 minute per 2 ascend
        AutoPlay.activities = "Going for 100 ascends.";
        AutoPlay.setDeadline(0);
        AutoPlay.wantAscend = true; //avoid byuing plants
        if (Game.ascendMeterLevel > 0 &&
            AutoPlay.ascendLimit < Game.ascendMeterLevel * Game.ascendMeterPercent)
            AutoPlay.doAscend("go for 100 ascends", 0);
    }
    var extraDaysInRun =
        daysInRun + daysInRun * Game.ascendMeterLevel / (Game.prestige + 1000000000);
    if (AutoPlay.grinding() && !AutoPlay.wantAscend)
        AutoPlay.addActivity("Still " + (40 - (extraDaysInRun)) +
            " days until next hard ascend.");
    if (extraDaysInRun > 40) {
        for (var x = Game.cookies; x > 10; x /= 10) ;
        if (x < 9) AutoPlay.doAscend("ascend after " + daysInRun +
            " days just while waiting for next achievement.", 1);
    }
    var newPrestige = (Game.prestige + Game.ascendMeterLevel) % 1000000;
    if (AutoPlay.grinding() && !Game.Upgrades["Lucky digit"].bought &&
        Game.ascendMeterLevel > 0 && ((Game.prestige + Game.ascendMeterLevel) % 10 === 7))
        AutoPlay.doAscend("ascend for heavenly upgrade lucky digit.", 0);
    if (AutoPlay.grinding() && !Game.Upgrades["Lucky number"].bought &&
        Game.ascendMeterLevel > 0 && ((Game.prestige + Game.ascendMeterLevel) % 1000 === 777))
        AutoPlay.doAscend("ascend for heavenly upgrade lucky number.", 0);
    if (AutoPlay.grinding() && !Game.Upgrades["Lucky payout"].bought &&
        Game.heavenlyChips > 77777777) {
        AutoPlay.wantAscend = true; //avoid byuing plants
        AutoPlay.setDeadline(0);
        AutoPlay.addActivity("Trying to get heavenly upgrade Lucky Payout.");
        if (Game.ascendMeterLevel > 0 && (newPrestige <= 777777) &&
            (newPrestige + Game.ascendMeterLevel >= 777777))
            AutoPlay.doAscend("ascend for heavenly upgrade lucky payout.", 0);
    }
    if (!Game.Upgrades["Season switcher"].bought &&
        AutoPlay.nextAchievement === 108 && Game.ascendMeterLevel > 1111) {
        AutoPlay.doAscend("getting season switcher.", 1);
    }
    if (Game.AchievementsById[AutoPlay.nextAchievement].won) {
        var date = new Date();
        date.setTime(AutoPlay.now - Game.startDate);
        var legacyTime = Game.sayTime(date.getTime() / 1000 * Game.fps, -1);
        date.setTime(AutoPlay.now - Game.fullDate);
        var fullTime = Game.sayTime(date.getTime() / 1000 * Game.fps, -1);
        AutoPlay.doAscend("have achievement: " +
            Game.AchievementsById[AutoPlay.nextAchievement].desc +
            " after " + legacyTime + "(total: " + fullTime + ")", 1);
    }
};

AutoPlay.canContinue = function () {
    if (!Game.Achievements["Neverclick"].won && Game.cookieClicks <= 15) {
        AutoPlay.activities = "Trying to get achievement: Neverclick.";
        return true;
    } else if (!Game.Achievements["True Neverclick"].won && Game.cookieClicks === 0) {
        AutoPlay.activities = "Trying to get achievement: True Neverclick.";
        return true;
    } else if (!Game.Achievements["Hardcore"].won && Game.UpgradesOwned === 0) {
        AutoPlay.activities = "Trying to get achievement: Hardcore.";
        return true;
    } else if (!Game.Achievements["Speed baking I"].won &&
        (AutoPlay.now - Game.startDate <= 1000 * 60 * 35)) {
        AutoPlay.activities = "Trying to get achievement: Speed baking I.";
        AutoPlay.setDeadline(0);
        return true;
    } else if (!Game.Achievements["Speed baking II"].won &&
        (AutoPlay.now - Game.startDate <= 1000 * 60 * 25)) {
        AutoPlay.activities = "Trying to get achievement: Speed baking II.";
        AutoPlay.setDeadline(0);
        return true;
    } else if (!Game.Achievements["Speed baking III"].won &&
        (AutoPlay.now - Game.startDate <= 1000 * 60 * 15)) {
        AutoPlay.activities = "Trying to get achievement: Speed baking III.";
        AutoPlay.setDeadline(0);
        return true;
    } else return false;
};

AutoPlay.doReincarnate = function () {
    AutoPlay.delay = 10;
    AutoPlay.buyHeavenlyUpgrades();
    AutoPlay.setDeadline(0);
    if (!Game.Achievements["Neverclick"].won || !Game.Achievements["Hardcore"].won) {
        Game.PickAscensionMode();
        Game.nextAscensionMode = 1;
        Game.ConfirmPrompt();
    }
    if (AutoPlay.endPhase() && AutoPlay.mustRebornAscend()) {
        Game.PickAscensionMode();
        Game.nextAscensionMode = 1;
        Game.ConfirmPrompt();
    }
    Game.Reincarnate(true);
    AutoPlay.ascendLimit = 0.9 * Math.floor(2 * (1 - Game.ascendMeterPercent));
};

AutoPlay.mustRebornAscend = function () {
    return !([78, 93, 94, 95].every(function (a) {
        return Game.AchievementsById[a].won;
    }));
};

AutoPlay.doAscend = function (str, log) {
    AutoPlay.wantAscend = AutoPlay.plantPending || AutoPlay.harvestPlant;
    AutoPlay.addActivity("Preparing to ascend.");
    if (AutoPlay.wantAscend) return; // do not ascend when we wait for a plant
    if (Game.hasBuff("Sugar frenzy")) return; // do not ascend during sugar frenzy
    AutoPlay.setDeadline(0);
    if (Game.wrinklers.some(function (w) {
        return w.close;
    })) {
        AutoPlay.assignSpirit(0, "scorn", 1);
        AutoPlay.delay = 10;
    }
    Game.wrinklers.forEach(function (w) {
        if (w.close === 1) w.hp = 0;
    }); // pop wrinklers
    if (Game.isMinigameReady(Game.Objects["Farm"]))
        Game.Objects["Farm"].minigame.harvestAll(); // harvest garden
    if (Game.Upgrades["Chocolate egg"].unlocked &&
        !Game.Upgrades["Chocolate egg"].bought) {
        if (Game.dragonLevel >= 9) { // setting first aura to earth shatterer
            Game.specialTab = "dragon";
            Game.SetDragonAura(5, 0);
            Game.ConfirmPrompt();
            Game.ToggleSpecialMenu(0);
        }
        Game.ObjectsById.forEach(function (e) {
            e.sell(e.amount);
        });
        Game.Upgrades["Chocolate egg"].buy();
        AutoPlay.delay = 10;
    } else {
        AutoPlay.info(str);
        AutoPlay.loggingInfo = log ? str : 0;
        AutoPlay.logging();
        AutoPlay.delay = 10;
        Game.Ascend(true);
    }
};

//===================== Handle Achievements ==========================
AutoPlay.wantedAchievements = [82, 89, 108, // elder calm, 100 antimatter, halloween
    225, 227, 229, 279, 280, 372, 373, 374, 375, 390, 391, 429, // bake xx cookies
    428, 395, 397]; // max cps, max buildings, ascend right
AutoPlay.nextAchievement = AutoPlay.wantedAchievements[0];

AutoPlay.endPhase = function () {
    return AutoPlay.wantedAchievements.indexOf(AutoPlay.nextAchievement) < 0;
};

AutoPlay.grinding = function () {
    return Game.AchievementsById[373].won;
};

AutoPlay.mainActivity = "Doing nothing in particular.";
AutoPlay.activities = AutoPlay.mainActivity;

AutoPlay.setMainActivity = function (str) {
    AutoPlay.mainActivity = str;
    AutoPlay.info(str);
};

AutoPlay.findNextAchievement = function () {
    AutoPlay.wantAscend = false;
    AutoPlay.handleSmallAchievements();
    for (var i = 0; i < AutoPlay.wantedAchievements.length; i++) {
        if (!(Game.AchievementsById[AutoPlay.wantedAchievements[i]].won)) {
            AutoPlay.nextAchievement = AutoPlay.wantedAchievements[i];
            AutoPlay.setMainActivity("Trying to get achievement: " +
                Game.AchievementsById[AutoPlay.nextAchievement].desc);
            return;
        }
    }
    AutoPlay.checkAllAchievementsOK();
};

AutoPlay.checkAllAchievementsOK = function () { //We do not stop for one-year legacy
    for (var i in Game.Achievements) {
        var me = Game.Achievements[i];
        if (!me.won && me.pool !== "dungeon" && me.id !== 367) { // missing achievement
            AutoPlay.setMainActivity("Missing achievement #" + me.id +
                ": " + me.desc + ", try to get it now.");
            AutoPlay.nextAchievement = me.id;
            return false;
        }
    }
    for (var i in Game.Upgrades) {
        var me = Game.Upgrades[i];
        if (me.pool === 'prestige' && !me.bought) { // we have not all prestige upgrades yet
            AutoPlay.nextAchievement = 99; // follow the white rabbit (from dungeons)
            AutoPlay.setMainActivity("Prestige upgrade " + me.name +
                " is missing, waiting to buy it.");
//	  Game.RemoveAchiev(Game.AchievementsById[AutoPlay.nextAchievement].name);
            return false;
        }
    }
    if (!Game.Achievements["So much to do so much to see"].won) { //wait until one-year legacy (367)
        var me = Game.Achievements["So much to do so much to see"];
        AutoPlay.setMainActivity("Missing achievement #" + me.id +
            ": " + me.desc + ", try to get it now.");
        AutoPlay.nextAchievement = me.id;
        return false;
    }
    // finished with playing: idle further
    AutoPlay.finished = true;
    AutoPlay.setMainActivity("My job is done here, have a nice day. I am still idling along.");
    AutoPlay.nextAchievement = 99; // follow the white rabbit (from dungeons)
    return false;
};

AutoPlay.leaveGame = function () {
    clearInterval(AutoPlay.autoPlayer); //stop autoplay:
    AutoPlay.info("My job is done here, have a nice day.");
    if (Game.bakeryName.slice(0, AutoPlay.robotName.length) === AutoPlay.robotName) {
        Game.bakeryName = Game.bakeryName.slice(AutoPlay.robotName.length);
        Game.bakeryNamePrompt();
        Game.ConfirmPrompt();
    }
    return true;
};

AutoPlay.findMissingAchievements = function () { // just for testing purposes
    for (var i in Game.Achievements) {
        var me = Game.Achievements[i];
        if (!me.won && me.pool !== "dungeon") { // missing achievement
            AutoPlay.info("missing achievement #" + me.id + ": " + me.desc);
        }
    }
    for (var i in Game.Upgrades) {
        var me = Game.Upgrades[i];
        if (me.pool === 'prestige' && !me.bought) { // missing prestige upgrade
            AutoPlay.info("prestige upgrade " + me.name + " is missing.");
        }
    }
};

//===================== Handle Heavenly Upgrades ==========================
AutoPlay.prioUpgrades = [363, 323, // legacy, dragon
    411, 412, 413, // lucky upgrades,
    264, 265, 266, 267, 268, 181, // permanent slots, season switcher,
    282, 283, 284, 291, 393, 394]; // better golden cookies, kittens, synergies
AutoPlay.kittens = [31, 32, 54, 108, 187, 320, 321, 322, 425, 442, 462, 494];
AutoPlay.cursors = [0, 1, 2, 3, 4, 5, 6, 43, 82, 109, 188, 189];
AutoPlay.chancemakers = [416, 417, 418, 419, 420, 421, 422, 423, 441, 493];
AutoPlay.butterBiscuits = [334, 335, 336, 337, 400, 477, 478, 479, 497];

AutoPlay.buyHeavenlyUpgrades = function () {
    AutoPlay.prioUpgrades.forEach(function (id) {
        var e = Game.UpgradesById[id];
        if (e.canBePurchased && !e.bought && e.buy(true)) {
            AutoPlay.info("buying " + e.name);
        }
    });
    Game.UpgradesById.forEach(function (e) {
        if (e.canBePurchased && !e.bought && e.buy(true)) {
            AutoPlay.info("buying " + e.name);
        }
    });
    AutoPlay.assignPermanentSlot(1, AutoPlay.kittens);
    AutoPlay.assignPermanentSlot(2, AutoPlay.chancemakers);
    if (!Game.Achievements["Reincarnation"].won) { // for many ascends
        AutoPlay.assignPermanentSlot(0, AutoPlay.cursors);
        AutoPlay.assignPermanentSlot(3, [52]); // lucky day
        AutoPlay.assignPermanentSlot(4, [53]); // serendipity
    } else { //collect rare things
        AutoPlay.assignPermanentSlot(0, AutoPlay.butterBiscuits);
        AutoPlay.assignPermanentSlot(3, [226]); // omelette
        if (Game.Achievements["Elder nap"].won &&
            Game.Achievements["Elder slumber"].won &&
            Game.Achievements["Elder calm"].won)
            AutoPlay.assignPermanentSlot(4, [72]); // arcane sugar
        else AutoPlay.assignPermanentSlot(4, [53]); // serendipity
    }
};

AutoPlay.assignPermanentSlot = function (slot, options) {
    if (!Game.UpgradesById[264 + slot].bought) return;
    Game.AssignPermanentSlot(slot);
    for (var i = options.length - 1; i >= 0; i--) {
        if (Game.UpgradesById[options[i]].bought) {
            Game.PutUpgradeInPermanentSlot(options[i], slot);
            break;
        }
    }
    Game.ConfirmPrompt();
};

//===================== Handle Dragon ==========================
AutoPlay.handleDragon = function () {
    if (Game.Upgrades["A crumbly egg"].unlocked) {
        if (Game.dragonLevel < Game.dragonLevels.length - 1 &&
            Game.dragonLevels[Game.dragonLevel].cost()) {
            Game.specialTab = "dragon";
            Game.UpgradeDragon();
            Game.ToggleSpecialMenu(0);
        }
    }
    if ((Game.dragonAura === 0) && (Game.dragonLevel >= 5)) {
        // set first aura to kitten (breath of milk)
        Game.specialTab = "dragon";
        Game.SetDragonAura(1, 0);
        Game.ConfirmPrompt();
        Game.ToggleSpecialMenu(0);
    }
    if ((Game.dragonAura === 1) && (Game.dragonLevel >= 21)) {
        // set first aura to fractal (dragons curve)
        Game.specialTab = "dragon";
        Game.SetDragonAura(17, 0);
        Game.ConfirmPrompt();
        Game.ToggleSpecialMenu(0);
    }
    if ((Game.dragonAura2 === 0) &&
        (Game.dragonLevel >= Game.dragonLevels.length - 1)) {
        // set second aura to kitten (breath of milk)
        Game.specialTab = "dragon";
        Game.SetDragonAura(1, 1);
        Game.ConfirmPrompt();
        Game.ToggleSpecialMenu(0);
    }
};

//===================== Menu ==========================
if (!AutoPlay.Backup) AutoPlay.Backup = {};
AutoPlay.Config = {};
AutoPlay.ConfigData = {};
AutoPlay.Disp = {};

AutoPlay.ConfigPrefix = 'autoplayConfig';

AutoPlay.SaveConfig = function (config) {
    try {
        window.localStorage.setItem(AutoPlay.ConfigPrefix, JSON.stringify(config));
    } catch (e) {
    }
};

AutoPlay.LoadConfig = function () {
    try {
        if (window.localStorage.getItem(AutoPlay.ConfigPrefix) != null) {
            AutoPlay.Config = JSON.parse(window.localStorage.getItem(AutoPlay.ConfigPrefix));
            // Check values
            var mod = false;
            for (var i in AutoPlay.ConfigDefault) {
                if (typeof AutoPlay.Config[i] === 'undefined' || AutoPlay.Config[i] < 0 ||
                    AutoPlay.Config[i] >= AutoPlay.ConfigData[i].label.length) {
                    mod = true;
                    AutoPlay.Config[i] = AutoPlay.ConfigDefault[i];
                }
            }
            if (mod) AutoPlay.SaveConfig(AutoPlay.Config);
        } else { // Default values
            AutoPlay.RestoreDefault();
        }
    } catch (e) {
    }
};

AutoPlay.RestoreDefault = function () {
    AutoPlay.Config = {};
    AutoPlay.SaveConfig(AutoPlay.ConfigDefault);
    AutoPlay.LoadConfig();
    Game.UpdateMenu();
};

AutoPlay.ToggleConfig = function (config) {
    AutoPlay.ToggleConfigUp(config);
    l(AutoPlay.ConfigPrefix + config).className =
        AutoPlay.Config[config] ? 'option' : 'option off';
};

AutoPlay.ToggleConfigUp = function (config) {
    AutoPlay.Config[config]++;
    if (AutoPlay.Config[config] === AutoPlay.ConfigData[config].label.length)
        AutoPlay.Config[config] = 0;
    l(AutoPlay.ConfigPrefix + config).innerHTML = AutoPlay.Disp.GetConfigDisplay(config);
    AutoPlay.SaveConfig(AutoPlay.Config);
};

AutoPlay.ConfigData.NightMode =
    {label: ['OFF', 'AUTO', 'ON'], desc: 'Handling of night mode'};
AutoPlay.ConfigData.ClickMode =
    {
        label: ['OFF', 'AUTO', 'LIGHT SPEED', 'RIDICULOUS SPEED', 'LUDICROUS SPEED'],
        desc: 'Clicking speed'
    };
AutoPlay.ConfigData.GoldenClickMode =
    {label: ['OFF', 'AUTO', 'ALL'], desc: 'Golden Cookie clicking mode'};
AutoPlay.ConfigData.CheatLumps =
    {label: ['OFF', 'AUTO', 'LITTLE', 'MEDIUM', 'MUCH'], desc: 'Cheating of sugar lumps'};
AutoPlay.ConfigData.CheatGolden =
    {label: ['OFF', 'AUTO', 'LITTLE', 'MEDIUM', 'MUCH'], desc: 'Cheating of golden cookies'};
AutoPlay.ConfigData.CleanLog = {label: ['Clean Log'], desc: 'Cleaning the log'};
AutoPlay.ConfigData.ShowLog = {label: ['Show Log'], desc: 'Showing the log'};

AutoPlay.ConfigDefault = {
    NightMode: 1, ClickMode: 1, GoldenClickMode: 1,
    CheatLumps: 1, CheatGolden: 1, CleanLog: 0, ShowLog: 0
};

AutoPlay.LoadConfig();

AutoPlay.Disp.GetConfigDisplay = function (config) {
    return AutoPlay.ConfigData[config].label[AutoPlay.Config[config]];
};

AutoPlay.Disp.AddMenuPref = function () {
    var header = function (text) {
        var div = document.createElement('div');
        div.className = 'listing';
        div.style.padding = '5px 16px';
        div.style.opacity = '0.7';
        div.style.fontSize = '17px';
        div.style.fontFamily = '\"Kavoon\", Georgia, serif';
        div.textContent = text;
        return div;
    };
    var frag = document.createDocumentFragment();
    var div = document.createElement('div');
    div.className = 'title ' + AutoPlay.Disp.colorTextPre + AutoPlay.Disp.colorBlue;
    div.textContent = 'Cookiebot Options';
    frag.appendChild(div);
    var listing = function (config, clickFunc) {
        var div = document.createElement('div');
        div.className = 'listing';
        var a = document.createElement('a');
        a.className = 'option';
        if (AutoPlay.Config[config] === 0) a.className = 'option off';
        a.id = AutoPlay.ConfigPrefix + config;
        a.onclick = function () {
            AutoPlay.ToggleConfig(config);
        };
        if (clickFunc) a.onclick = clickFunc;
        a.textContent = AutoPlay.Disp.GetConfigDisplay(config);
        div.appendChild(a);
        var label = document.createElement('label');
        label.textContent = AutoPlay.ConfigData[config].desc;
        div.appendChild(label);
        return div;
    };
    frag.appendChild(listing('NightMode', null));
    frag.appendChild(listing('ClickMode', null));
    frag.appendChild(listing('GoldenClickMode', null));
    frag.appendChild(header('Cheating'));
    frag.appendChild(listing('CheatLumps', null));
    frag.appendChild(listing('CheatGolden', null));
    frag.appendChild(header('Logging'));
    frag.appendChild(listing('CleanLog', AutoPlay.cleanLog));
    frag.appendChild(listing('ShowLog', AutoPlay.showLog));
    l('menu').childNodes[2].insertBefore(frag, l('menu').childNodes[2].childNodes[l('menu').childNodes[2].childNodes.length - 1]);
};

if (!AutoPlay.Backup.UpdateMenu) AutoPlay.Backup.UpdateMenu = Game.UpdateMenu;

Game.UpdateMenu = function () {
    AutoPlay.Backup.UpdateMenu();
    if (Game.onMenu === 'prefs') AutoPlay.Disp.AddMenuPref();
};

//===================== Auxiliary ==========================

AutoPlay.info = function (s) {
    console.log("### " + s);
    Game.Notify("CookieBot", s, 1, 100);
};

AutoPlay.setDeadline = function (d) {
    if (AutoPlay.deadline > d) AutoPlay.deadline = d;
};

AutoPlay.logging = function () {
    if (!AutoPlay.loggingInfo) return;
    try {
        var before = window.localStorage.getItem("autoplayLog");
        var toAdd = "#logging autoplay V" + AutoPlay.version + " with " +
            AutoPlay.loggingInfo + "\n" + Game.WriteSave(1) + "\n";
        AutoPlay.loggingInfo = 0;
        window.localStorage.setItem("autoplayLog", before + toAdd);
    } catch (e) {
    }
};

AutoPlay.cleanLog = function () {
    try {
        window.localStorage.setItem("autoplayLog", "");
    } catch (e) {
    }
};

AutoPlay.showLog = function () {
    var theLog = "";
    try {
        theLog = window.localStorage.getItem("autoplayLog");
    } catch (e) {
        theLog = "";
    }
    Game.Prompt('<h3>Cookie Bot Log</h3><div class="block">' +
        'This is the log of the bot with saves at important stages.<br>' +
        'Copy it and use it as you like.</div>' +
        '<div class="block"><textarea id="textareaPrompt" ' +
        'style="width:100%;height:128px;" readonly>' +
        theLog + '</textarea></div>',
        ['All done!']);
};

AutoPlay.handleNotes = function () {
    for (var i in Game.Notes)
        if (Game.Notes[i].quick === 0) {
            Game.Notes[i].life = 2000 * Game.fps;
            Game.Notes[i].quick = 1;
        }
};

function range(start, end) {
    var foo = [];
    for (var i = start; i <= end; i++) {
        foo.push(i);
    }
    return foo;
}

AutoPlay.whatTheBotIsDoing = function () {
    return '<div style="padding:8px;width:400px;font-size:11px;text-align:center;">' +
        '<span style="color:#6f6;font-size:18px"> What is the bot doing?</span>' +
        '<div class="line"></div>' +
        AutoPlay.activities +
        '</div>';
};

AutoPlay.addActivity = function (str) {
    if (!AutoPlay.activities.includes(str))
        AutoPlay.activities += '<div class="line"></div>' + str;
};

//===================== Init & Start ==========================

if (AutoPlay.autoPlayer) {
    AutoPlay.info("replacing old version of autoplay");
    clearInterval(AutoPlay.autoPlayer);
}
AutoPlay.autoPlayer = setInterval(AutoPlay.run, 300); // 100 is too quick
AutoPlay.findNextAchievement();
l('versionNumber').innerHTML =
    'v. ' + Game.version + " (with autoplay v." + AutoPlay.version + ")";
l('versionNumber').innerHTML = 'v. ' + Game.version + ' <span ' +
    Game.getDynamicTooltip('AutoPlay.whatTheBotIsDoing', 'this') +
    ">(with autoplay v." + AutoPlay.version + ")" + '</span>';
if (Game.version !== AutoPlay.gameVersion)
    AutoPlay.info("Warning: cookieBot is last tested with " +
        "cookie clicker version " + AutoPlay.gameVersion);