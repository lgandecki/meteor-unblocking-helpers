"use strict";

RegisterUnblockingHelpersFor = function(template) {
    template.reactAsyncHelpersFunctions = {};

    var _registerHelper = function(options) {
        options.template = template;
        RegisterUnblockingHelper(options, function(args, cb) {

            Kernel.deferedTimeLimit = 1;
            Kernel.frameRateLimit = 1000 / 60;

            var _self = this;
            Kernel.defer(function() {
                //it's possible to just use timeOut here:
                // window.setTimeout(function() {
                template._unblockingHelpersTrackers.push(Tracker.autorun(function() {
                    var _value;
                    if (options.throttled) {
                        _value = template.unblockingHelpersThrottled[options.helperName].apply(_self, args);
                    } else if (options.infinite) {
                        _value = template.unblockingHelpersInfinite[options.helperName].apply(_self, args);
                    } else {
                        _value = template.unblockingHelpers[options.helperName].apply(_self, args);

                    }
                    cb(_value);
                }));
            });
        });
    };

    template.onCreated(function() {
        template._unblockingHelpersVariables = {};
        template._unblockingHelpersTrackers = [];
        template._unblockingHelpersTimeouts = {};
        template._unblockingHelpersCustomCollection = {};
        template._unblockingHelpersInfiniteCollectionsData;
        template.unblockingHelpersInfinityLimit =  new ReactiveVar(1);
    });

    template.onDestroyed(function() {
        delete template._unblockingHelpersVariables;

        template._unblockingHelpersTrackers.forEach(function(trackerHandle) {
            trackerHandle && trackerHandle.stop();
        });
        delete template._unblockingHelpersTrackers;


        _.each(template._unblockingHelpersTimeouts, function(helper) {
            helper.forEach(function(timeoutHandle) {
                timeoutHandle && clearTimeout(timeoutHandle);
            });
        });
        delete template._unblockingHelpersTimeouts;
        delete template._unblockingHelpersCustomCollection;
        delete template._unblockingHelpersInfiniteCollectionsData;

        delete template.unblockingHelpersInfinityLimit;
    });

    var _helpers = [];

    _.each(template.unblockingHelpersInfinite, function(functionLink, helperName) {
        _helpers.push(_returnHelperObject(functionLink, helperName, {infinite: true}));
    });

    _.each(template.unblockingHelpers, function(functionLink, helperName) {
        _helpers.push(_returnHelperObject(functionLink, helperName, {}));

    });

    _.each(template.unblockingHelpersThrottled, function(functionLink, helperName) {
        _helpers.push(_returnHelperObject(functionLink, helperName, {throttled: true}));

    });

    _helpers.forEach(function(helper) {
        _registerHelper(helper);
    });

};

var _returnHelperObject = function(functionLink, helperName, options) {
    var _helper = {
        helperName: helperName,
        functionLink: functionLink
    };

    if (options.throttled) {
        _helper.throttled = true;
    }

    if (options.infinite) {
        _helper.infinite = true;
    }
    return _helper;
};

function RegisterUnblockingHelper(options, fn) {
    var template = options.template;
    var helperName = options.helperName;

    var initialize = function(helperIdentifier, args, self) {
        if ((!template._unblockingHelpersVariables[helperIdentifier] &&
            !template._unblockingHelpersCustomCollection[helperIdentifier]) ||
            (options.infinite && !template._unblockingHelpersInfiniteCollectionsData)) {
            if (options.throttled) {
                template._unblockingHelpersTimeouts[helperIdentifier] = [];
                template._unblockingHelpersCustomCollection[helperIdentifier] = new Mongo.Collection(null);
            } else if (options.infinite) {
                template._unblockingHelpersInfiniteCollectionsData = new Mongo.Collection(null);
                template._unblockingHelpersCustomCollection[helperIdentifier] = new Mongo.Collection(null);
            } else {
                template._unblockingHelpersVariables[helperIdentifier] = new ReactiveVar([]);
            }

            setTimeout(function() {
                fn.call(self, args, function(result) {

                    if (options.throttled) {
                        // this is reactive but rerenders everything.. I could possibly do some checking here to
                        // update only the field we are interested in..

                        template._unblockingHelpersTimeouts[helperIdentifier].forEach(function(timeoutHandle) {
                            timeoutHandle && clearTimeout(timeoutHandle);
                        });
                        template._unblockingHelpersTimeouts[helperIdentifier] = [];
                        template._unblockingHelpersCustomCollection[helperIdentifier].remove({});
                        var _timeout = 500;
                        result.forEach(function(chunk, index) {
                            setTimeout(function() {
                                template._unblockingHelpersCustomCollection[helperIdentifier]
                                    .insert(result.slice(index, index + 1)[0]);
                            }, _timeout);
                            //TODO i don't clear the timeouts when result change? this should probably have a check
                            // anyway
                            _timeout += 500;
                        });
                    } else if (options.infinite) {

                        template._unblockingHelpersInfiniteCollectionsData.remove({});

                        result.forEach(function(chunk, index) {

                            template._unblockingHelpersInfiniteCollectionsData
                                .insert(result.slice(index, index + 1)[0]);
                        });

                    } else {
                        template._unblockingHelpersVariables[helperIdentifier]
                            .set(result && result.fetch ? result.fetch() : result);
                    }
                });
            }, 0);
        }
    };

    var helper = {};
    helper[helperName] = function() {
        var _self = this;
        var _args = arguments;
        var _helperIdentifier = _returnHelperIdentifier(helperName, _self, _args);

        initialize(_helperIdentifier, _args, _self);

        if (options.throttled) {
            return template._unblockingHelpersCustomCollection[_helperIdentifier].find().fetch();
        } if (options.infinite) {
            return template._unblockingHelpersInfiniteCollectionsData
                .find({}, {sort: {sortorder: 1}, limit: template.unblockingHelpersInfinityLimit.get()}).fetch();
        } else {
            return template._unblockingHelpersVariables[_helperIdentifier].get();
        }
    };
    template.helpers(helper);
    template.reactAsyncHelpersFunctions[helperName] = helper[helperName];
}

var _returnHelperIdentifier = function(helperName, self, _args) {
    var _context = JSON.stringify(self) + JSON.stringify(_args);
    var _contextMD5 = CryptoJS.MD5(_context).toString();
    return helperName + "_" + _contextMD5;
};
