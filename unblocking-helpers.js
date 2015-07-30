RegisterUnblockingHelpersFor = function(template) {


	var _registerHelper = function(value, key, throttled) {
		RegisterUnblockingHelper({
			template: template,
			helperName: key,
			throttled: throttled
		}, function(args, cb) {

			Kernel.deferedTimeLimit = 1;
			Kernel.frameRateLimit = 1000 / 60;

			var _self = this;
			Kernel.defer(function() {
				//it's possible to just use timeOut here:
				// window.setTimeout(function() {
				template._unblockingHelpersTrackers.push(Tracker.autorun(function() {
					var _value;
					if (throttled) {
						_value = template.unblockingHelpersThrottled[key].apply(_self, args);
					} else {
						_value = template.unblockingHelpers[key].apply(_self, args);
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
		template._unblockingHelpersThrottledCollections = {};
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
			})
		});
		delete template._unblockingHelpersTimeouts;
		delete template._unblockingHelpersThrottledCollections;
	});

	var _helpers = [];

	_.each(template.unblockingHelpers, function(value, key) {
		_helpers.push({
			helperName: key,
			functionLink: value,
			throttled: false
		})
	});

	_.each(template.unblockingHelpersThrottled, function(value, key) {
		_helpers.push({
			helperName: key,
			functionLink: value,
			throttled: true
		})
	});

	_helpers.forEach(function(helper) {
		_registerHelper(helper.functionLink, helper.helperName, helper.throttled)
	});

};


RegisterUnblockingHelper = function(options, fn) {
	var template = options.template, helperName = options.helperName;

	var initialize = function(helperIdentifier, args, self) {
		if (!template._unblockingHelpersVariables[helperIdentifier] &&
			!template._unblockingHelpersThrottledCollections[helperIdentifier]) {
			if (options.throttled) {
				template._unblockingHelpersTimeouts[helperIdentifier] = [];
				template._unblockingHelpersThrottledCollections[helperIdentifier] = new Mongo.Collection(null);
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
						template._unblockingHelpersThrottledCollections[helperIdentifier].remove({});
						var _timeout = 0;
						result.forEach(function(chunk, index) {
							setTimeout(function() {
								template._unblockingHelpersThrottledCollections[helperIdentifier].insert(result.slice(index, index + 1)[0]);
							}, _timeout);
							_timeout += 100;
						});
					} else {
						template._unblockingHelpersVariables[helperIdentifier].set(result);
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
			return template._unblockingHelpersThrottledCollections[_helperIdentifier].find();
		} else {
			return template._unblockingHelpersVariables[_helperIdentifier].get();
		}
	};
	template.helpers(helper);

};

var _returnHelperIdentifier = function(helperName, self, _args) {

	var _context = JSON.stringify(self) + JSON.stringify(_args);
	var _contextMD5 = CryptoJS.MD5(_context).toString();
	return helperName + "_" + _contextMD5;
};
