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
    self.profilepic = 'img/profile_icon.png';
    self.loadFromJS = function (usr) {
        self.userId = usr.userId;
        self.name(usr.name);
        self.email(usr.email);
        self.phone(usr.phone);
        self.description(usr.description);
        self.pin(usr.pin);
        self.mobileSessionId = usr.mobileSessionId;
        self.profilepic = usr.profilepic;
    };
}

function Game() {
    var self = this;
    self.gameLimit = 200;
    self.completedOn = '';
    self.timelapse = ko.observable('');
    self.player1 = ko.observable('');
    self.player2 = ko.observable('');
    self.player3 = ko.observable('');
    self.player4 = ko.observable('');
    self.hands = ko.observableArray();
    //ko computed
    self.totalEllos = function () {
        var count = self.hands().length;
        if (count > 0)
            return self.hands()[self.hands().length - 1].ellos.total;
        else
            return 0;
    };

    self.totalNosotros = function () {
        var count = self.hands().length;
        if (count > 0)
            return self.hands()[self.hands().length - 1].nosotros.total;
        else
            return 0;
    };

    self.isGameOver = ko.computed(function () {
        if (self.totalNosotros() >= self.gameLimit
				|| self.totalEllos() >= self.gameLimit)
            return true;
        else {
            return false;
        }
    });

    self.won = ko.computed(function () {
        return self.isGameOver() && self.totalNosotros() >= self.gameLimit;
    });

    self.resultText = ko.computed(function () {
        return self.won() ? "win" : "lose";
    });

    self.displayText = ko.computed(function () {
        var e = '';
        var str = '';
        var hasEllos = false;
        var hasNosotros = false;
        if (self.player1() != '') {
            e += self.player1();
            hasEllos = true;
        }
        if (self.player2() != '') {
            if (hasEllos) {
                e += ', ';
            }
            e += self.player2();
        }
        var n = '';
        if (self.player3() != '') {
            n += self.player3();
            hasNosotros = true;
        }
        if (self.player4() != '') {
            if (hasNosotros) {
                n += ', ';
            }
            n += self.player4();
        }
        if (hasEllos && hasNosotros) {
            str += e + ' vs. ' + n;
        } else {
            str += e + n;
        }

        if (str == '') {
            str += 'Players not identified.';
        }
        return str;
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

    self.flattened = function () {
        var x = self;
        x.totalEllos = self.totalEllos();
        x.totalNosotros = self.totalNosotros();
        return x;
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
        } else if (winner == "Nosotros") {
            self.ellos = new TeamScore(0, 0);
            self.nosotros = new TeamScore(0, self.hand_score);
        }
    };
    self.reload = function () {
        self.ellos.reload();
        self.nosotros.reload();
    };
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
    self.finishedGame = ko.observable(new Game().flattened());
    self.isGameActive = ko.observable(false);
    self.teams = [{
        name: "Ellos",
        score: 0
    }, {
        name: "Nosotros",
        score: 0
    }];
    self.games = ko.observableArray();

    //Operations
    self.playerName = function () {
        var name = app.storage.get('name');
        return name == null ? 'Guest' : name;
    };

    self.startGame = function () {
        self.currentGame().gameLimit = $('input[name=gamepoints]:checked')
				.val() == null ? 200 : parseInt($(
				'input[name=gamepoints]:checked').val());
        self.isGameActive(true);
        app.tab_navigate('activegame');
        $('#img_menu_active').fadeIn('fast');
    };

    self.newGame = function () {
        app.tab_navigate('players');
    };

    self.viewGameSummary = function (game) {
        self.finishedGame(game);
        app.tab_navigate('gamesummary');
    };

    self.choseProfilePicture = function () {
        navigator.camera.getPicture(self.onProfilePictureSuccess,
				self.onProfilePictureFail, {
				    quality: 50,
				    destinationType: Camera.DestinationType.DATA_URL
				});
    };

    self.getScorePhoto = function () {
        navigator.camera.getPicture(self.onScorePictureSuccess,
				self.onProfilePictureFail, {
				    quality: 50,
				    destinationType: Camera.DestinationType.FILE_URI
				});
    };

    self.onProfilePictureSuccess = function (imageData) {
        self.user.profilepic = "data:image/jpeg;base64," + imageData;
        $('#profilepicture').attr('src', self.user.profilepic);
    };

    self.onScorePictureSuccess = function (imageURI) {
        var options = new FileUploadOptions();
        options.fileKey = "file";
        options.fileName = imageURI.substr(imageURI.lastIndexOf('/') + 1);
        options.mimeType = "image/jpeg";

        var params = {};
        params.value1 = "test";
        params.value2 = "param";

        options.params = params;

        var ft = new FileTransfer();
        ft.upload(imageURI, encodeURI("http://some.server.com/upload.php"),
				win, fail, options);
    }

    self.onProfilePictureFail = function (message) {
        alert('Failed because: ' + message);
    };

    self.addHand = function () {
        var score = parseInt($('#puntos').val());
        var winner = $('input[name=team]:checked').val();
        if (!isNaN(score) && winner != null && winner.length > 0) {
            var hand = new Hand();
            hand.setHand(winner, score);
            if (self.currentGame().hands().length > 0) {
                var last = self.currentGame().hands()[self.currentGame()
						.hands().length - 1];
                hand.ellos.old_score = last.ellos.total;
                hand.nosotros.old_score = last.nosotros.total;
                hand.reload();
            }
            hand.id = self.currentGame().hands().length + 1;
            self.currentGame().hands.push(hand);

            if (self.currentGame().isGameOver()) {
                self.isGameActive(false);
                $('#img_menu_active').fadeOut('fast')
                self.currentGame().completedOn = new Date();
                var game = ko.toJS(self.currentGame().flattened());
                game.timelapse = ko.observable('');
                self.games.unshift(game);
                self.finishedGame(game);
                self.currentGame(new Game());
                app.tab_navigate('gamesummary');
                if (!app.isWebBased) {
                    navigator.notification.vibrate(200);
                }
            }
            $('input[name=team]:checked').removeAttr('checked').parent()
					.removeClass('active');
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
            self.currentGame().hands
					.remove(self.currentGame().hands()[count - 1]);
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

    self.loadFromJS = function (_vm) {
        self.isInitialized = ko.observable(_vm.isInitialized);
        self.user = _vm.user;
        var cg = new Game();
        cg.loadFromJS(_vm.currentGame);
        self.currentGame = ko.observable(cg);
        self.finishedGame = ko.observable(_vm.finishedGame);
        self.isGameActive = ko.observable(_vm.isGameActive);
        self.teams = [{
            name: "Ellos",
            score: 0
        }, {
            name: "Nosotros",
            score: 0
        }];
        $.each(_vm.games, function (index, game) {
            game.timelapse = ko.observable('');
            self.games.push(game);
        });
    };
}

var app = {
    isWebBased: false,
    isOnline: false,
    viewModel: null,
    tabs: [
			{
			    tabId: 'home',
			    title: 'Inicio',
			    isVisible: true,
			    action: function () {
			        return app.viewModel.isInitialized();
			    }
			},
			{
			    tabId: 'players',
			    title: 'Juego Nuevo',
			    isVisible: true,
			    action: function () {
			        if (app.viewModel.isGameActive()
							&& !confirm('An active game has been detected. Continue with a new game?')) {
			            return false;
			        }
			        app.viewModel.currentGame(new Game());
			        return true;
			    }
			},
			{
			    tabId: 'settings',
			    title: 'Perfil',
			    isVisible: true,
			    action: function () {
			        $('#profilepicture').attr('src',
							app.viewModel.user.profilepic);
			        return true;
			    }
			},
			{
			    tabId: 'activegame',
			    title: 'Juego Activo',
			    isVisible: false,
			    action: function () {
			        if (app.viewModel.isGameActive())
			            return true;
			        else
			            return false;
			    }
			},
			{
			    tabId: 'gamesummary',
			    title: 'Resumen del Juego',
			    isVisible: false,
			    action: function () {
			        return true;
			    }
			},
			{
			    tabId: 'history',
			    title: 'Historial',
			    isVisible: false,
			    action: function () {
			        $.each(app.viewModel.games(), function (index, value) {
			            if (value.timelapse == '') {
			                value.timelapse = ko.observable(app
									.getDays(value.completedOn));
			            } else {
			                value.timelapse(app.getDays(value.completedOn));
			            }
			        });
			        return true;
			    }
			}, {
			    tabId: 'about',
			    title: 'About',
			    isVisible: true,
			    action: function () {
			        return true;
			    }
			}

    ],
    navStack: ko.observableArray(),
    isBackReady: ko.observable(false),
    currentTab: ko.observable({
        tabId: 'home',
        title: 'Home',
        isVisible: true,
        action: function () {
            return app.viewModel.isInitialized();
        }
    }),
    tab_navigate: function (item, sender) {
        app.log('navigating');
        if ((item == null || item.type == 'GameViewModel') && sender != null) {
            var tab = sender.target.nodeName == 'SPAN' ? sender.target.parentNode.dataset.tab
					: sender.target.dataset.tab;
            item = tab;
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
            if (sender != 'back') {
                app.navStack.push(app.currentTab());
                if (app.navStack().length > 1) {
                    $('#backbtn').show();
                }
            }
            else if (app.navStack().length <= 1) {
                $('#backbtn').hide();
            }
            app.currentTab(item);
        }
        $('.navbar-collapse').removeClass('in').addClass('collapse');
    },
    tab_back_navigate: function () {
        if (app.navStack().length > 0) {
            var last = app.navStack.pop();
            app.tab_navigate(last, 'back');
        }
    },
    storage: {
        set: function (key, value) {
            window.localStorage.setItem(key, value);
        },
        get: function (key) {
            return window.localStorage.getItem(key);
        },
        remove: function (key) {
            window.localStorage.removeItem(key);
        }
    },
    initialize: function () {
        app.log('initialize');
        app.bindEvents();
        var _host = window.location.host;
        app.isWebBased = _host.indexOf('localhost') >= 0
				|| _host.indexOf('azurewebsites.net') >= 0
				|| _host.indexOf('homecards.mm.com') >= 0
				|| window.cordova == null;

        if (app.isWebBased) {
            app.log('app is web based');
            app.onDeviceReady();
        }
    },
    bindEvents: function () {
        app.log('bindEvents');
        document.addEventListener('deviceready', app.onDeviceReady, false);
    },
    addEventListeners: function () {
        app.log('adding event listeners');
        document.addEventListener('offline', app.offline, false);
        document.addEventListener('online', app.online, false);
        document.addEventListener('pause', app.pause, false);
        document.addEventListener('resume', app.resume, false);
        document.addEventListener("backbutton", app.onBackKeyDown, false);
        document.addEventListener("menubutton", app.onMenuKeyDown, false);
    },
    onDeviceReady: function () {
        app.log('deviceready');
        app.log(app.viewModel);
        app.addEventListeners();
        if (app.viewModel == null) {
            app.log('viewModel is null');
            app.viewModel = new GameViewModel();
            var serializedVM = app.storage.get('viewModel');
            if (serializedVM != null) {
                app.viewModel.loadFromJS(JSON.parse(serializedVM));
            }
            ko.applyBindings(app.viewModel);
        }

        if (!app.viewModel.isInitialized()) {
            app.tab_navigate('settings');
        } else {
            var lastTab = app.storage.get('current_tab');
            app.tab_navigate(lastTab != null ? lastTab : 'home');
        }
    },
    pause: function () {
        app.log('pause');
        app.storage.set('current_tab', app.currentTab().tabId);
        app.storage.set('viewModel', ko.toJSON(app.viewModel));
    },
    resume: function () {
        app.log('resume');
        app.onDeviceReady();
    },
    online: function () {
        app.log('online');
    },
    offline: function () {
        app.log('offline');
    },
    onBackKeyDown: function () {
        app.log('back button pressed');
        app.tab_back_navigate();
    },
    onMenuKeyDown: function () {
        app.log('menu button pressed');
        alert('Doble Seis v1.0. Developed by Luis Cintron');
    },
    log: function (message, url, linenumber) {
        setTimeout(function () {
            var msg = message;
            if (url != null) {
                msg += "; " + url;
            }
            if (linenumber != null) {
                msg += "; " + linenumber;
            }
            console.log(msg);
        }, 3000);
    },
    getDays: function (datetext) {
        var dt = new Date(datetext);
        var currentDate = new Date();
        if (currentDate.getFullYear() > dt.getFullYear()) {
            return (currentDate.getFullYear() - dt.getFullYear())
					+ ' year ago.';
        } else if (currentDate.getMonth() > dt.getMonth()) {
            return (currentDate.getMonth() - dt.getMonth()) + ' month ago.';
        } else if (currentDate.getDate() > dt.getDate()) {
            return (currentDate.getDate() - dt.getDate()) + ' days ago.';
        } else if (currentDate.getHours() > dt.getHours()) {
            return (currentDate.getHours() - dt.getHours()) + ' hours ago.';
        } else if (currentDate.getMinutes() >= dt.getMinutes()) {
            return (currentDate.getMinutes() - dt.getMinutes())
					+ ' minutes ago.';
        }
    }
};

$(function () {
    app.initialize();
    window.onerror = app.log;
});
