// ==UserScript==
// @name         Cookie Clicker Auto Player
// @namespace    http://tampermonkey.net/
// @version      2.016
// @description  Auto-plays the game with close to human performance. Controllable via bakery name.
// @author       yauhenl
// @match        http://orteil.dashnet.org/cookieclicker/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    var Bot = {};
    Bot._versionCode = "2.016"; // remember to update this to the script version above


// ---- Check and modify the following numbers, if they don't suit your stage / playstyle

    Bot._buyBuildingsInPacksOf = 50;            // bot will buy only buy buildings up to a limit, this number at a time.
    Bot._clickBigCookieWhenCpsBuffIs = 40;      // 40 means 4000% CpS, for example a building special from 390 buildings.
    Bot._popPlantsWhenCpsBuffIs = 40;           // will harvest mature Queenbeets and Bakeberries during such buffs.
    Bot._popDyingPlantsWhenCpsBuffIs = 7;       // will harvest Queenbeets and Bakeberries that can die next tick during such smaller buffs.
    Bot._seasonToBuy = 'fools';                 // the name of the season to try to buy constantly.
    Bot._seasonCookieToBuy = 'Fool\'s biscuit'; // the name of the cookie to continuously buy, if season buying is selected.

    Bot._clicksPerSecond = 7;                 // this bot is designed to work at low clicks/s, like 7.
                                              // Setting it to 200 can have unfun consequences, I've never tried, warranty void.

// Below are different limits towards which the bot can auto-buy buildings.
// Feel free to add your own lines for your particular stage of the game, or delete these ones.
// Just remember to always have 15 values (even if zeroes) and check line [36] to choose your active one.
//                    cur gma far min fac bnk tpl wiz shp lab por tim ac  pri chm fra
    var _330chancemakers = [542, 496, 487, 499, 471, 445, 437, 411, 385, 378, 372, 366, 364, 338, 330, 0];
    var _400chancemakers = [612, 600, 563, 575, 546, 520, 512, 484, 458, 451, 444, 439, 437, 409, 400, 0]; // 600 Grandmas for Lump bonus
    var _450chancemakers = [652, 616, 615, 628, 599, 571, 563, 535, 508, 501, 495, 489, 488, 460, 450, 0];
    var _450fractals = [679, 625, 619, 632, 603, 575, 567, 539, 512, 505, 499, 493, 492, 486, 454, 450];

    Bot.objectLimits = _450fractals; // after the bot reaches this target once, it will forget it and stop buying


// ---- End of numbers. Here goes bot's code, don't go there unless you do want to break/fix things.

    Bot.lastName = "";
    Bot.origVersion = "";

    Bot.initHandle = null;
    Bot.initLoop = function () {
        Bot.origVersion = l("versionNumber").textContent;
        if (Bot.origVersion) {
            Bot.origVersion += " <span style=\"font-size:14px\"> Bot v." + Bot._versionCode + "</span>"
            window.clearInterval(Bot.initHandle);
            Bot.initHandle = null;
            Bot.recalcHandle = window.setInterval(Bot.recalcLoop, 500);
        }
    }

    Bot.gardenRecalcTime = 0;
    Bot.recalcHandle = null;
    Bot.recalcLoop = function () {
        if (Bot.lastName != Game.bakeryName) {
            // Turn the bot on/off and change actions
            var name = Game.bakeryName;
            if (!name.endsWith("Bot")) {
                if (Bot.clickHandle) {
                    window.clearInterval(Bot.clickHandle);
                    Bot.clickHandle = null;
                }
                l("versionNumber").innerHTML = Bot.origVersion;
                Bot.shouldBuySeason = false;
                Bot.shouldPickLumps = false;
                Bot.shouldKeepGarden = false;
                Bot.shouldClickCookie = false;
            } else {
                var startMode = (name.indexOf("Launch") >= 0);
                var runMode = (name.indexOf("Cruise") >= 0);
                Bot.doesClickShimmers = startMode || runMode || (name.indexOf("GC") >= 0);
                Bot.doesClickUpgrades = startMode || (name.indexOf("Buy") >= 0);
                Bot.doesClickBuildings = Bot.doesClickUpgrades && !!Bot.objectLimits; // disabled if bought everything
                Bot.doesClickSpells = runMode || (name.indexOf("Magic") >= 0);
                Bot.shouldClickCookie = startMode || runMode || (name.indexOf("Click") >= 0);
                Bot.shouldBuySeason = runMode || (name.indexOf("Fool") >= 0);
                Bot.shouldPickLumps = startMode || runMode || (name.indexOf("Lump") >= 0);
                Bot.shouldKeepGarden = name.indexOf("Crop") >= 0;

                var botModeString = (
                    (Bot.shouldClickCookie ? "Clicks/" : "") +
                    (Bot.doesClickShimmers ? "GCs/" : "") +
                    (Bot.doesClickUpgrades ? "Buys/" : "") +
                    (Bot.shouldBuySeason ? "Fools/" : "") +
                    (Bot.doesClickSpells ? "Casts/" : "") +
                    (Bot.shouldPickLumps ? "Lumps/" : "") +
                    (Bot.shouldKeepGarden ? "Toils/" : "")).slice(0, -1);
                l("versionNumber").innerHTML = Bot.origVersion + "<br/><span style=\"font-size:14px\">Auto-" + botModeString + "</span>";

                if (!Bot.clickHandle)
                    Bot.clickHandle = window.setInterval(Bot.clickLoop, 1000 / Bot._clicksPerSecond);
            }
            Bot.lastName = name;
        }

        // recalculate stuff not needed each click
        var t = Date.now();
        Bot.doesClickSeason = Bot.shouldBuySeason && Bot.canBuySeason(Bot._seasonToBuy);
        Bot.doesClickLumps = Bot.shouldPickLumps && Game.canLumps() && t >= Game.lumpT + Game.lumpRipeAge;
        Bot.doesClickGarden &= Bot.shouldKeepGarden; // deactivate garden tasks, or they will still get executed
        if (Bot.shouldClickCookie || Bot.shouldKeepGarden) {
            Bot.isClickBuffed = false;
            Bot.cpsMultiplier = 1;
            for (var i in Game.buffs) {
                var me = Game.buffs[i];
                if (me.name == 'Cursed finger') Bot.isClickBuffed = true;
                if (typeof me.multClick != 'undefined' && me.multClick > 1) Bot.isClickBuffed = true;
                if (typeof me.multCpS != 'undefined') Bot.cpsMultiplier *= me.multCpS;
            }
        }
        if (Bot.shouldKeepGarden && t > Bot.gardenRecalcTime) {
            var M = Game.Objects['Farm'].minigame;
            if (M) {
                Bot.gardenRecalcTime = M.nextStep + 1000; // 1 sec after tick
                Bot.gardenHarvestAtTopCps = [];
                Bot.gardenHarvestAtHiCps = [];
                Bot.gardenHarvestNow = [];
                Bot.gardenPlant = [];

                // == Juicy Queenbeet strategy ==
                var queenbeet = M.plants['queenbeet'];
                var juicybeet = M.plants['queenbeetLump'];
                var bakeberry = M.plants['bakeberry'];
                var zones = [{}, {}, {}, {}];
                var zoneCoords = [[1, 1], [1, 3], [3, 1], [3, 3]];

                // -- Detection
                // each target plot
                for (var z = 0; z < 4; z++) {
                    if (M.getTile(zoneCoords[z][0], zoneCoords[z][1])[0] - 1 == juicybeet.id) {
                        zones[z].gotcha = true;
                    }
                    Bot.processGardenTile(M, zoneCoords[z][0], zoneCoords[z][1], [juicybeet.id], [2]);
                }
                // surrounding plots
                for (var y = 0; y < 5; y++) {
                    for (var x = 0; x < 5; x++) {
                        if ((x == 1 || x == 3) && (y == 1 || y == 3)) { // skip target plots
                            continue;
                        }

                        var tile = M.getTile(x, y);
                        if (tile[0] != 0) {
                            if (x < 3 && y < 3) {
                                setNotEmpty(zones[0]);
                            }
                            if (x < 3 && y > 1) {
                                setNotEmpty(zones[1]);
                            }
                            if (x > 1 && y < 3) {
                                setNotEmpty(zones[2]);
                            }
                            if (x > 1 && y > 1) {
                                setNotEmpty(zones[3]);
                            }
                        }
                        if (tile[0] - 1 != queenbeet.id) {
                            if (x < 3 && y < 3) {
                                setExpired(zone[0]);
                            }
                            if (x < 3 && y > 1) {
                                setExpired(zone[1]);
                            }
                            if (x > 1 && y < 3) {
                                setExpired(zone[2]);
                            }
                            if (x > 1 && y > 1) {
                                setExpired(zone[3]);
                            }
                        }
                    }
                }
                var gotchaCount = 0;
                var expiredCount = 0;
                var emptyCount = 0;
                for (var z = 0; z < 4; z++) {
                    if (zones[z].gotcha) {
                        gotchaCount++;
                    } else {
                        if (zones[z].expired) {
                            expiredCount++;
                        }
                        if (!zones[z].nonEmpty) {
                            emptyCount++;
                        }
                    }
                }
                var allExpired = gotchaCount + expiredCount == 4;
                var allEmpty = gotchaCount + emptyCount == 4;

                // -- Spare plots for Bakeberries first
                for (var y = 0; y < 6; y++) {
                    Bot.processGardenTile(M, 5, y, [bakeberry.id], [0], bakeberry.id);
                }
                for (var x = 0; x < 5; x++) {
                    Bot.processGardenTile(M, x, 5, [bakeberry.id], [0], bakeberry.id);
                }

                // if got lump - gotcha, harvest @ top, plant berries
                // if not lump - kill
                // if full circle - waiting/active, noop
                // if not full circle - expired, harvest @ top, wait
                // if all non-gotcha plots are expired - harvest @ high
                // if all non-gotcha plots are ready - plant beets

                // -- Action
                Bot.processJuicyStrategy(M, zones, // dead center
                    allEmpty, allExpired, [[2, 2]]);
                Bot.processJuicyStrategy(M, [zones[0], zones[1]], // middle left
                    allEmpty, allExpired, [[0, 2], [1, 2]]);
                Bot.processJuicyStrategy(M, [zones[0]], // top left
                    allEmpty, allExpired, [[0, 0], [0, 1], [1, 0]]);
                Bot.processJuicyStrategy(M, [zones[0], zones[2]], // top middle
                    allEmpty, allExpired, [[2, 0], [2, 1]]);
                Bot.processJuicyStrategy(M, [zones[2]], // top right
                    allEmpty, allExpired, [[3, 0], [4, 0], [4, 1]]);
                Bot.processJuicyStrategy(M, [zones[2], zones[3]], // middle right
                    allEmpty, allExpired, [[3, 2], [4, 2]]);
                Bot.processJuicyStrategy(M, [zones[3]], // bottom right
                    allEmpty, allExpired, [[3, 4], [4, 3], [4, 4]]);
                Bot.processJuicyStrategy(M, [zones[1], zones[3]], // bottom middle
                    allEmpty, allExpired, [[2, 3], [2, 4]]);
                Bot.processJuicyStrategy(M, [zones[1]], // bottom left
                    allEmpty, allExpired, [[0, 3], [0, 4], [1, 4]]);

                // == end of Juicy Queenbeet strategy ===== //

                /*/ == Full Bakeberry strategy ==
                var bakeberry = M.plants['bakeberry'];
                for(var y=0;y<6;y++)
                    for(var x=0;x<6;x++)
                    {
                        Bot.processGardenTile(M,x,y,[bakeberry.id],[0],bakeberry.id);
                    }
                // ======= /*/

                Bot.doesClickGarden = (Bot.gardenHarvestAtHiCps.length +
                    Bot.gardenHarvestAtTopCps.length +
                    Bot.gardenHarvestNow.length +
                    Bot.gardenPlant.length) > 0;
            }
        }
    };

    function setNotEmpty(zone) {
        zone.nonEmpty = true;
    }

    function setExpired(zone) {
        zone.expired = true;
    }

    Bot.clickCooldown = 0;
    Bot.clickHandle = null;
    Bot.clickedGarden = false;
    Bot.clickLoop = function () {
        if (Bot.clickCooldown > 0) {
            Bot.clickCooldown--;
            return;
        }

        if (Bot.doesClickGarden) {
            var done = Bot.doClickGarden();
            if (done)
                Bot.clickCooldown = 2;
            else if (Bot.clickedGarden) // if click streak ended, rethink next moves
                Bot.gardenRecalcTime = 0;
            Bot.clickedGarden = done;
            if (done)
                return;
        }
        if (Bot.doesClickShimmers && Bot.doClickShimmer())
            return;
        if (Bot.doesClickBuildings && Bot.objectLimits && Bot.doBuyBuildings(Bot._buyBuildingsInPacksOf))
            return;
        if (Bot.doesClickUpgrades && Bot.doBuyUpgrade())
            return;
        if (Bot.doesClickSeason && Bot.doBuySeason(Bot._seasonCookieToBuy)) {
            Bot.doesClickSeason = false;
            return;
        }
        if (Bot.doesClickSpells && Bot.doForceHandOfFate())
            return;
        if (Bot.doesClickLumps) {
            Game.clickLump();
            Bot.doesClickLumps = false;
            return;
        }
        if (Bot.shouldClickCookie && (Bot.isClickBuffed || Bot.cpsMultiplier >= Bot._clickBigCookieWhenCpsBuffIs))
            Bot.doClickCookie();
    }

    Bot.doClickGarden = function () {
        var M = Game.Objects['Farm'].minigame;
        if (M) {
            if (Bot.doGardenTask(M, Bot.gardenHarvestNow))
                return true;
            if (Bot.cpsMultiplier >= Bot._popPlantsWhenCpsBuffIs && Bot.doGardenTask(M, Bot.gardenHarvestAtTopCps))
                return true;
            if (Bot.cpsMultiplier >= Bot._popDyingPlantsWhenCpsBuffIs && Bot.doGardenTask(M, Bot.gardenHarvestAtHiCps))
                return true;
            if (Bot.cpsMultiplier <= 1)
                return Bot.doGardenTask(M, Bot.gardenPlant);
            return false;
        }
        return false;
    }
    Bot.doGardenTask = function (M, taskList) {
        if (taskList.length == 0)
            return false;
        var t = taskList[0];
        var done = M.useTool(t[0], t[1], t[2]) || (t[0] == -1);
        if (done) {
            M.toCompute = true;
            taskList.shift();
        }
        return done;
    }
    Bot.doClickShimmer = function () {
        if (Game.shimmers.length > 0) {
            //Game.Popup('Shimmers!', Game.cookieOriginX, Game.cookieOriginY);
            var shimmer = Game.shimmers[Game.shimmers.length - 1];
            if (shimmer.l.style.opacity > 0.5 || Game.shimmers.length > 20) {
                shimmer.pop();
                return true;
            }
        }
        return false;
    }
    Bot.doBuyBuildings = function (wantedAmount) {
        var totalAmount = 0;
        for (var i = Game.ObjectsN - 1; i >= 0; i--) {
            var me = Game.ObjectsById[i];
            var amount = Math.max(0, Math.min(Bot.objectLimits[i] - me.amount, wantedAmount));
            totalAmount += amount;
            if (amount == 0)
                continue;
            if (me.getSumPrice(amount) < Game.cookies) {
                me.buy(amount);
                return true;
            }
        }
        if (totalAmount == 0) // can buy nothing else
            Bot.objectLimits = false;
        return false;
    }
    Bot.doBuyUpgrade = function () {
        for (var i in Game.UpgradesInStore) {
            var me = Game.UpgradesInStore[i];
            if (me.name == 'Chocolate egg') {
                continue;
            }
            if (me.pool != 'toggle' && me.pool != 'tech') {
                if (me.canBuy()) {
                    me.buy();
                    return true;
                }
                break;
            }
        }
        return false;
    }
    Bot.canBuySeason = function (seasonId) {
        if (Game.Has('Eternal seasons') && !Game.Has('Season switcher'))
            return false;
        return Game.season != seasonId;
    }
    Bot.doBuySeason = function (biscuitName) {
        for (var i in Game.UpgradesInStore) {
            var me = Game.UpgradesInStore[i];
            if (me.name == biscuitName && me.canBuy()) {
                me.buy();
                return true;
            }
        }
        return false;
    }
    Bot.doForceHandOfFate = function () {
        var M = Game.Objects['Wizard tower'].minigame;
        if (M && M.magic == M.magicM && Game.shimmerTypes['golden'].n < 1) {
            M.castSpell(M.spells['hand of fate']);
            return true;
        }
        return false;
    }
    Bot.doClickCookie = function () {
        var mx = Game.mouseX;
        var my = Game.mouseY;
        Game.mouseX = Game.cookieOriginX;
        Game.mouseY = Game.cookieOriginY;
        Game.ClickCookie();
        Game.mouseX = mx;
        Game.mouseY = my;
    }
    Bot.getPlantStage = function (M, tile) // 0 nothing, 1 growing, 2 mature, 3 dying
    {
        if (tile[0] == 0)
            return 0;
        var me = M.plantsById[tile[0] - 1];
        if (tile[1] + Math.ceil(me.ageTick + me.ageTickR) >= 100)
            return 3;
        else if (tile[1] >= me.mature)
            return 2;
        return 1;
    }
    Bot.processJuicyStrategy = function (M, zones, allEmpty, allExpired, coords) {
        var queenbeet = M.plants['queenbeet'];
        var bakeberry = M.plants['bakeberry'];
        var gotcha = true;
        var expired = true;
        var i;
        for (i = 0; i < zones.length; i++) {
            if (!zones[i].gotcha) gotcha = false;
            if (!zones[i].expired) expired = false;
        }
        if (gotcha)
            for (i = 0; i < coords.length; i++)
                Bot.processGardenTile(M, coords[i][0], coords[i][1], [queenbeet.id, bakeberry.id], [0, 0], bakeberry.id);
        else if (allEmpty)
            for (i = 0; i < coords.length; i++)
                Bot.processGardenTile(M, coords[i][0], coords[i][1], [], [], queenbeet.id);
        else if (expired) {
            var urgency = allExpired ? 3 : 0; // haste if all plots expired
            for (i = 0; i < coords.length; i++)
                Bot.processGardenTile(M, coords[i][0], coords[i][1], [queenbeet.id, bakeberry.id], [urgency, urgency]);
        }
    }
    Bot.processGardenTile = function (M, x, y, harvestIds, urgencies, plantId)
        // urgency: 0 - wait for x40, 1 - wait for x7, 2 - as soon as ripe, 3 - wait for x7 or now if unripe
    {
        var tile = M.getTile(x, y)
        if (tile[0] == 0) {
            if (typeof plantId !== 'undefined')
                Bot.gardenPlant.push([plantId, x, y]);
        } else {
            var found = false;
            var stage = Bot.getPlantStage(M, tile);
            for (var i = 0; i < harvestIds.length; i++)
                if (tile[0] - 1 == harvestIds[i]) {
                    if (urgencies[i] == 2) {
                        // when ripe, harvest instantly
                        if (stage >= 2) Bot.gardenHarvestNow.push([-1, x, y]);
                    } else if (urgencies[i] == 1 || urgencies[i] == 3) {
                        // when ripe, harvest at 700% CpS (or whatever is configured). Usually happens within a tick.
                        if (stage >= 2) Bot.gardenHarvestAtHiCps.push([-1, x, y]);
                        else if (stage == 1 && urgencies[i] == 3)
                            Bot.gardenHarvestNow.push([-1, x, y]);
                    } else if (urgencies[i] == 0) {
                        // when ripe, harvest at 4000% CpS (or whatever is configured).
                        // if within a tick from death, harvest at 700% CpS (or whatever is configured).
                        if (stage == 2) Bot.gardenHarvestAtTopCps.push([-1, x, y]);
                        if (stage == 3) Bot.gardenHarvestAtHiCps.push([-1, x, y]);
                    }
                    found = true;
                    break;
                }
            if (!found) // kill everything else
                Bot.gardenHarvestNow.push([-1, x, y]);
        }
    }

    Bot.initHandle = window.setInterval(Bot.initLoop, 1000);
})();