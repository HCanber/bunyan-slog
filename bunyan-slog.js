'use strict'
var util = require('util')

function objCopy(obj) {
	if (obj == null) {  // null or undefined
		return obj;
	} else if (Array.isArray(obj)) {
		return obj.slice();
	} else if (typeof (obj) === 'object') {
		var copy = {};
		Object.keys(obj).forEach(function (k) {
			copy[k] = obj[k];
		});
		return copy;
	} else {
		return obj;
	}
}
var formatRegExp = /(\{@?\w+})|(%[sdj%])/g;

function init(bunyan) {
	bunyan = bunyan || _getDefaultBunyan()
	function format(fields, messageTemplate, args, startIndex, options) {
		var i = startIndex;
		var len = args.length;
		var messageTemplateField = options.messageTemplate;
		var messageTemplateArgs;
		if (messageTemplateField)
			messageTemplateArgs = [];
		var formattedMessage = String(messageTemplate).replace(formatRegExp, function (v) {
			if (i >= len)
				return v == '%%' ? '%' : v;

			var value = args[i++];

			if (v[0] === '%') {
				formattedValue = util.format(v, value);
				if (messageTemplateArgs)
					messageTemplateArgs.push(formattedValue);
				return formattedValue;
			} else {

				var formattedValue, name;
				if (v[1] === '@') {
					formattedValue = JSON.stringify(value, bunyan.safeCycles())
					name = v.substr(2, v.length - 3);
				}
				else {
					formattedValue = value.toString();
					name = v.substr(1, v.length - 2);
				}
				fields[name] = objCopy(value);
				return formattedValue;
			}
		});
		if (i < len) {
			//We have some more arguments that should be appended
			formattedMessage = [formattedMessage].concat(_copyArguments(args, i)).join(' ')
		}
		if (messageTemplateField) {
			fields[messageTemplateField] = messageTemplateArgs.length > 0 ? util.format(messageTemplate, messageTemplateArgs) : messageTemplate
		}
		return formattedMessage;
	}

	function wrap(logger, options) {
		options = options ? objCopy(options) : { messageTemplate: undefined };
		function wrapLogMethod(logMethod) {
			function log() {
				if (arguments.length === 0) return logMethod.apply(logger)
				var args = arguments;
				var fields, message, error;
				var currentIndex = 0;
				var arg = args[0];

				if (arg instanceof Error) {
					if (args.length == 1)
						return logMethod.apply(logger, [arg]);
					error = logger.serializers && logger.serializers.err
						? logger.serializers.err(arg)
						: bunyan.stdSerializers.err(arg);

					currentIndex++;
					arg = args[currentIndex];
				}
				var nextIndex = currentIndex + 1

				if (typeof (arg) !== 'object' && arg !== null || Array.isArray(arg)) {
					// `log.<level>(msg, ...)`
					fields = {};
					message = format(fields, arg, args, nextIndex, options);
				}
				else {
					var fmtObj
					if (_isFormatObject(arg)) {
						// `log.<level>({msg:'...',values:[...]}, ...)`									
						fmtObj = arg
						fields = {}
					} else {
						if (args.length > nextIndex && _isFormatObject(args[nextIndex])) {
							// `log.<level>(fields, {msg:'...',values:[...]}, ...)`					
							fields = arg
							fmtObj = args[nextIndex]
							nextIndex++
						}
					}
					if (fmtObj) {
						var args2 = fmtObj.values.concat(_copyArguments(args, nextIndex))
						message = format(fields, fmtObj.msg, args2, 0, options);
					} else {
						// `log.<level>(fields, msg, ...)`
						fields = arg
						message = format(fields, args[currentIndex + 1], args, currentIndex + 2, options);
					}
				}
				if (error && !fields.err) {
					fields.err = error;
				}
				return logMethod.apply(logger, [fields, message]);
			}
			return log
		}

		logger.trace = wrapLogMethod(logger.trace);
		logger.debug = wrapLogMethod(logger.debug);
		logger.info = wrapLogMethod(logger.info);
		logger.warn = wrapLogMethod(logger.warn);
		logger.error = wrapLogMethod(logger.error);
		logger.fatal = wrapLogMethod(logger.fatal);

		logger.fmt = fmt
		return logger;
	}
	function createLogger(optionalBunyanLoggerOptions, optionalBunyanSlogOptions) {
		var log = bunyan.createLogger(optionalBunyanLoggerOptions);
		return wrap(log, optionalBunyanSlogOptions);
	}
	return {
		wrapExisting: wrap,
		createLogger: createLogger,
		stdSerializers: bunyan.stdSerializers,
		TRACE: bunyan.TRACE,
		DEBUG: bunyan.DEBUG,
		INFO: bunyan.INFO,
		ERROR: bunyan.ERROR,
		FATAL: bunyan.FATAL,
		resolveLevel: bunyan.resolveLevel,
		safeCycles: bunyan.safeCycles,
		fmt: fmt,
		bunyan: bunyan
		};
}

function _copyArguments(args, start, end) {
	return Array.prototype.slice.call(args, start, end)
}

function _isFormatObject(o) {
	return o && Object.keys(o).length == 2 && (typeof (o.msg) === 'string') && Array.isArray(o.values)
}

function fmt(strings) {
	var values = _copyArguments(arguments, 1);
	var message = []
	var messageValues = []
	var result = { msg: '', values: messageValues }
	if (strings.length === 1 && values.length === 0 && strings[0] === '') return result
	for (var i = 0; i < values.length; i++) {
		var s = strings[i];
		var v = values[i];
		var sLength = s.length
		var lastChar = s[sLength - 1]
		var wasHandled = false

		if (lastChar === ':' || lastChar === '=') {
			var index = sLength - 1
			do {
				index--
				var code = s.charCodeAt(index);
			} while (index >= 0 &&
				((code > 47 && code < 58) || // numeric (0-9)
					(code > 64 && code < 91) || // upper alpha (A-Z)
					(code > 96 && code < 123)))  // lower alpha (a-z))
			var valueName = s.substring(index + 1, sLength - 1)
			if (valueName.length > 0) {
				if (index >= 0) {
					message.push(s.substr(0, index + 1))
				}
				if (lastChar === ':') {
					message.push(valueName, ':')
				}
				message.push('{', valueName, '}')
				messageValues.push(v)
				wasHandled = true
			}
		}
		if (!wasHandled) message.push(s, v)
	}
	for (; i <= strings.length; i++) {
		message.push(strings[i])
	}
	result.msg = message.join('')
	return result
}

var _defaultInit;
function _callDefault(fnName, args) {
	_defaultInit = _defaultInit || init()
	return _defaultInit[fnName].apply(_defaultInit, args)
}

var _defaultBunyan;
function _getDefaultBunyan() {
	return _defaultBunyan = _defaultBunyan || require('bunyan')
}
init.wrapExisting = function () { return _callDefault('wrapExisting', arguments) }
init.createLogger = function () { return _callDefault('createLogger', arguments) }
init.stdSerializers = _getDefaultBunyan().stdSerializers
init.TRACE = _getDefaultBunyan().TRACE
init.DEBUG = _getDefaultBunyan().DEBUG
init.INFO = _getDefaultBunyan().INFO
init.ERROR = _getDefaultBunyan().ERROR
init.FATAL = _getDefaultBunyan().FATAL
init.resolveLevel = _getDefaultBunyan().resolveLevel
init.safeCycles = _getDefaultBunyan().safeCycles
init.fmt = fmt
init.bunyan = _getDefaultBunyan()

module.exports = init;
