//Clases and logic 
function User() {
    var self = this;
    self.userId = -1;
    self.name = ko.observable('');
    self.email = ko.observable('');
    self.phone = ko.observable('');
    self.description = ko.observable('');
    self.pin = ko.observable('');
    self.mobileSessionId = '';
    self.loadFromJS = function (usr) {
        self.userId = usr.userId;
        self.name(usr.name);
        self.email(usr.email);
        self.phone(usr.phone);
        self.description(usr.description);
        self.pin(usr.pin);
        self.mobileSessionId = usr.mobileSessionId;
    };
}

function Game() {
    var self = this;
    self.gameLimit = 200;
    self.completedOn = null;
    self.player1 = ko.observable('');
    self.player2 = ko.observable('');
    self.player3 = ko.observable('');
    self.player4 = ko.observable('');
    self.hands = ko.observableArray();
    //ko computed
    self.totalEllos = ko.computed({
        read: function () {
            var count = self.hands().length;
            if (count > 0)
                return self.hands()[self.hands().length - 1].ellos.total;
            else
                return 0;
        },
        write: function (value) { return; },
        owner: this
    });

    self.totalNosotros = ko.computed({
        read: function () {
            var count = self.hands().length;
            if (count > 0)
                return self.hands()[self.hands().length - 1].nosotros.total;
            else
                return 0;
        },
        write: function (value) { return; },
        owner: this
    });

    self.isGameOver = ko.computed(function () {
        if (self.totalNosotros() >= self.gameLimit || self.totalEllos() >= self.gameLimit)
            return true;
        else { return false; }
    });

    self.won = ko.computed(function () {
        return self.isGameOver() && self.totalNosotros() >= self.gameLimit;
    });

    self.resultText = ko.computed(function () {
        return self.won() ? "win" : "lose";
    });

    self.displayText = ko.computed(function () {
        return self.player1() + ', ' + self.player2() + ' vs ' + self.player3() + ', ' + self.player4();
    });

    //functions
    self.loadFromJS = function (_game) {
        self.gameLimit = _game.gameLimit;
        self.completedOn = _game.completedOn;
        self.player1 = ko.observable(_game.player1);
        self.player2 = ko.observable(_game.player2);
        self.player3 = ko.observable(_game.player3);
        self.player4 = ko.observable(_game.player4);
        ko.utils.arrayPushAll(self.hands(), _game.hands);
    };
}

function Hand() {
    var self = this;
    self.id = 0;
    self.hand_score = 0;
    self.winner = null;
    self.ellos = null;
    self.nosotros = null;
    self.setHand = function (winner, hand_score) {
        self.hand_score = hand_score;
        self.winner = winner;
        if (winner == "Ellos") {
            self.ellos = new TeamScore(0, self.hand_score);
            self.nosotros = new TeamScore(0, 0);
        }
        else if (winner == "Nosotros") {
            self.ellos = new TeamScore(0, 0);
            self.nosotros = new TeamScore(0, self.hand_score);
        }
    }
    self.reload = function () {
        self.ellos.reload();
        self.nosotros.reload();
    }
}

function TeamScore(old_score, hand_score) {
    var self = this;
    self.old_score = old_score;
    self.hand_score = hand_score;
    self.total = self.old_score + self.hand_score;
    self.reload = function () {
        self.total = self.old_score + self.hand_score;
    };
}

function GameViewModel() {
    var self = this;
    self.type = 'GameViewModel';
    self.user = new User();
    self.isInitialized = ko.observable(app.storage.get('isInitialized') == null ? false : true);
    self.currentGame = ko.observable(new Game());
    self.finishedGame = ko.observable(new Game());
    self.isGameActive = ko.observable(false);
    self.teams = [{ name: "Ellos", score: 0 }, { name: "Nosotros", score: 0 }];
    self.games = ko.observableArray();

    //Operations
    self.playerName = function () {
        var name = app.storage.get('name');
        return name == null ? 'Guest' : name;
    };

    self.startGame = function () {
        self.currentGame().gameLimit = $('input[name=gamepoints]:checked').val() == null ? 200 : parseInt($('input[name=gamepoints]:checked').val());
        self.isGameActive(true);
        app.tab_navigate('activegame');
    };

    self.newGame = function () {
        app.tab_navigate('players');
    };

    self.viewGameSummary = function (game) {
        self.finishedGame(game);
        app.tab_navigate('gamesummary');
    };

    self.addHand = function () {
        var score = parseInt($('#puntos').val());
        var winner = $('input[name=team]:checked').val();
        if (!isNaN(score) && winner != null && winner.length > 0) {
            var hand = new Hand();
            hand.setHand(winner, score);
            if (self.currentGame().hands().length > 0) {
                var last = self.currentGame().hands()[self.currentGame().hands().length - 1];
                hand.ellos.old_score = last.ellos.total;
                hand.nosotros.old_score = last.nosotros.total;
                hand.reload();
            }
            hand.id = self.currentGame().hands().length + 1;
            self.currentGame().hands.push(hand);

            if (self.currentGame().isGameOver()) {
                self.isGameActive(false);
                self.currentGame().completedOn = new Date();
                var game = ko.toJS(self.currentGame());
                self.games.push(game);
                app.storage.set('games', ko.toJSON(self.games));
                self.finishedGame(game);
                self.currentGame(new Game());
                app.tab_navigate('gamesummary');
                if (!app.isWebBased) { navigator.notification.vibrate(200); }
            }
            $('input[name=team]:checked').removeAttr('checked').parent().removeClass('active');
            $('#puntos').val('');
            $('#handfinished').modal('hide');
        }
    };
    self.deleteGame = function (game) {
        self.games.remove(game);
        app.storage.set('games', ko.toJSON(self.games));
        app.tab_navigate('home');
    };

    self.removeHand = function (hand) {
        var count = self.currentGame().hands().length;
        if (count > 0)
            self.currentGame().hands.remove(self.currentGame().hands()[count - 1]);
    };

    self.saveProfile = function (user) {
        if ($('#profileform').valid()) {
            app.storage.set('isInitialized', 1);
            self.isInitialized(true);
            app.storage.set('user', ko.toJSON(self.user));
            app.tab_navigate('home');
        }
    };

    //Computed Data
    self.isHandWinnerSelected = ko.computed(function () {
        return $('input[name=team]:checked').length == 1;
    });
    self.isHandScoreValid = ko.computed(function () {
        var num = parseInt($('#puntos').val());
        return !isNaN(num) && num >= 0 && num <= 200;
    });

    //run
    if (!self.isInitialized()) { app.tab_navigate('settings'); }
    else {
        self.user.loadFromJS(JSON.parse(app.storage.get('user')));
        var gamesString = app.storage.get('games');
        if (gamesString != null && gamesString.length > 1) {
            var games = JSON.parse(app.storage.get('games'));
            ko.utils.arrayPushAll(self.games(), games);
        }
        app.tab_navigate('home');
    }

    self.loadFromJS = function (_vm) {
        self.isInitialized = ko.observable(_vm.isInitialized);
        var cg = new Game();
        cg.loadFromJS(_vm.currentGame);
        self.currentGame = ko.observable(cg);
        if (cg != null){self.currentGame().}
        self.finishedGame = ko.observable(_vm.finishedGame);
        self.isGameActive = ko.observable(_vm.isGameActive);
        self.teams = [{ name: "Ellos", score: 0 }, { name: "Nosotros", score: 0 }];
        ko.utils.arrayPushAll(self.games(), _vm.games);
    };
}

var app = {
    isWebBased: false,
    isOnline: false,
    viewModel: null,
    tabs: [
        {
            tabId: 'home'
            , title: 'Home'
	    , isVisible: true
            , action: function () {
                return true;
            }
        }
        , {
            tabId: 'players'
            , title: 'Juego Nuevo'
	    , isVisible: true
            , action: function () {
                if (app.viewModel.isGameActive() && !confirm('An active game has been detected. Continue with a new game?')) {
                    return false;
                }
                return true;
            }
        }
        , {
            tabId: 'settings'
            , title: 'Settings'
	    , isVisible: true
            , action: function () {
                return true;
            }
        }
	, {
	    tabId: 'activegame'
            , title: 'Juego Activo'
	    , isVisible: false
            , action: function () {
                return true;
            }
	}
    , {
        tabId: 'gamesummary'
        , title: 'Resumen del Juego'
        , isVisible: false
        , action: function () {
            return true;
        }
    }
    , {
        tabId: 'history'
        , title: 'Historial'
        , isVisible: false
        , action: function () {
            return true;
        }
    }
    ],
    currentTab: ko.observable({ tabId: 'home', title: 'Home' }),
    tab_navigate: function (item, sender) {
        if ((item == null || item.type == 'GameViewModel') && sender != null) {
            item = sender.target.dataset.tab;
        }
        if (typeof (item) == 'string') {
            for (var i = 0; i < app.tabs.length; i++) {
                if (app.tabs[i].tabId == item) {
                    item = app.tabs[i];
                    break;
                }
            }
        }
        if (item != null && item.action()) {
            app.currentTab(item);
        }
        $('.navbar-collapse').removeClass('in').addClass('collapse');
    },
    storage: {
        set: function (key, value) {
            window.localStorage.setItem(key, value);
        }
		, get: function (key) {
		    return window.localStorage.getItem(key);
		}
		, remove: function (key) {
		    window.localStorage.removeItem(key);
		}
    },
    initialize: function () {
        app.receivedEvent('initialize');
        app.bindEvents();
        var _host = window.location.host;
        app.isWebBased = _host.indexOf('localhost') >= 0
        	     || _host.indexOf('azurewebsites.net') >= 0
        	     || _host.indexOf('homecards.mm.com') >= 0
        	     || window.cordova == null;

        if (app.isWebBased) {
            app.onDeviceReady();
        }
    },
    bindEvents: function () {
        app.receivedEvent('bindEvents');
        document.addEventListener('deviceready', app.onDeviceReady, false);
        document.addEventListener('offline', app.offline, false);
        document.addEventListener('online', app.online, false);
        document.addEventListener('pause', app.pause, false);
        document.addEventListener('resume', app.resume, false);
    },
    onDeviceReady: function () {
        app.receivedEvent('deviceready');
        if (app.viewModel == null) {
            app.viewModel = new GameViewModel();
            var serializedVM = app.storage.get('viewModel');
            if (serializedVM != null) {
                app.viewModel.loadFromJS(JSON.parse(serializedVM));
            }
            ko.applyBindings(app.viewModel);
            $('.template').removeClass('hidden');
            $("#profileform").validate();
        }
    },
    pause: function () {
        app.receivedEvent('pause');
        app.storage.set('current_tab', app.currentTab().tabId);
        app.storage.set('viewModel', ko.toJSON(app.viewModel));
    },
    resume: function () {
        app.receivedEvent('resume');
        app.tab_navigate(app.storage.get('current_tab'));
        app.onDeviceReady();
    },
    online: function () {
        app.receivedEvent('online');
        //app.appIsOnline();
    },
    offline: function () {
        app.receivedEvent('offline');
        //app.appIsOffline();
    },
    receivedEvent: function (id) {
        console.log('Received Event: ' + id);
    },
};

$(function () {
    app.initialize();
});

