// ==UserScript==
// @name        Cookie Bot
// @namespace   https://github.com/yauhenl/CookieBot
// @include     http://orteil.dashnet.org/cookieclicker/
// @version     0.01
// @author      yauhenl
// @grant       none
// ==/UserScript==

var code = "(" + (function() {
    var checkReady = setInterval(function() {
        if (typeof Game.ready !== 'undefined' && Game.ready) {
            Game.LoadMod('https://prinzstani.github.io/CookieBot/cookieAutoPlay.js');
            clearInterval(checkReady);
        }
    }, 1000);
}).toString() + ")()";

window.eval(code);