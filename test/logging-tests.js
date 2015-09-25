'use strict'
var Lab = require('lab')                         //https://www.npmjs.com/package/lab
var lab = exports.lab = Lab.script()
var should = require('should')                   //https://www.npmjs.com/package/should

var suite = lab.suite
var test = lab.test
var before = lab.before
var after = lab.after

var bunyan = require('bunyan')
var bunyanSlog = require('../bunyan-slog.js')(bunyan)

function Catcher() {
	this.records = []
}

Catcher.prototype.write = function (record) { this.records.push(record) }
var logLevels = {
	trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60
}
var levels = Object.keys(logLevels)
suite('Logging', () => {
	var catcher = new Catcher()
	var log = bunyanSlog.createLogger({
		name: 'test',
		streams: [
			{
				type: 'raw',
				stream: catcher,
				level: 'trace'
			}

		]		
	},{messageTemplate: 'messageTemplate'})

	function callLog(level) {
		return log[level].apply(log, Array.prototype.slice.call(arguments, 1))
	}

	function lastRecord() {
		return catcher.records[catcher.records.length - 1]
	}

	function testLevels() {
		var args = Array.prototype.slice.call(arguments, 0, arguments.length - 1)
		var assertBlock = arguments[arguments.length - 1]
		levels.forEach(level=> {
			log[level].apply(log, args)
			var rec = lastRecord()
			rec.should.have.property('level', logLevels[level])
			assertBlock(rec, level)
		})
	}
	suite('debug replacement support', () => {
		test('the debug api works', done => {
			log('Test %d',42)
			var rec = lastRecord()
			rec.should.have.property('msg', 'Test 42')
			rec.should.have.property('level', logLevels.debug)
			done()		
		})
	})

	suite('Bunyan standard API', () => {

		test('info() (and similar) should return true', done => {
			levels.forEach(level=> callLog(level).should.be.true())
			done()
		})

		test('info("message") (and similar) should log', done => {
			testLevels('hi', rec=> {
				rec.should.have.property('msg', 'hi')
			})
			done()
		})

		test('info("hi %s", "Bob", "!") (and similar) should log', done => {
			testLevels('hi %s', 'Bob', '!', rec=>
				rec.should.have.property('msg', 'hi Bob !')
				)
			done()
		})

		test('info({foo: "bar"}, "hi") (and similar) should log', done => {

			testLevels({ foo: "bar" }, "hi", rec=> {
				rec.should.have.property('msg', 'hi')
				rec.should.have.property('foo', 'bar')
			})
			done()
		})

		test('info(err) (and similar) should log', done => {
			testLevels(new Error('hi'), rec=> {
				rec.should.have.property('msg', 'hi')
				rec.should.have.property('err')
			})
			done()
		})


		test('info(err) (and similar) should log', done => {
			// bunyan.createLogger({name:"xxx",streams: [
			// {
			// 	type: 'raw',
			// 	stream: catcher,
			// 	level: 'trace'
			// }]
			// }).info(new Error('hi'),'more on this: %s', 'yes')
			// var rec=lastRecord()
			// rec.should.have.property('msg','more on this: yes')
			// rec.should.have.property('err')
			// 
			testLevels(new Error('hi'), 'more on this: %s', 'yes', rec=> {
				rec.should.have.property('msg', 'more on this: yes')
				rec.should.have.property('err')
			})
			done()
		})


	})



	suite('Destructor', () => {
		test('Destructs ints correctly', done => {
			testLevels('{@Int}', 123, rec =>
				rec.msg.should.eql('123')
				)
			done()
		})

		test('Destructs string as a json string', done => {
			testLevels('{@String}', 'abc', rec =>
				rec.msg.should.eql('"abc"')
				)
			done()
		})

		test('Destructs bool as true and false', done => {
			testLevels('{@True} {@False}', true, false, rec =>
				rec.msg.should.eql('true false')
				)
			done()
		})

		test('Destructs object with properties as json object', done => {
			testLevels('{@obj}', { s: '1', o: { i: 4 } }, rec =>
				rec.msg.should.eql('{"s":"1","o":{"i":4}}')
				)
			done()
		})

		test('Ignores functions in values', done => {
			testLevels('{@obj}', { i: 42, func: function () { } }, rec =>
				rec.msg.should.eql('{"i":42}')
				)
			done()
		})
	})
	
	
	
	suite('Non-destructor', () => {
		test('Formats int correctly', done => {
			testLevels('{Int}', 123, rec =>
				rec.msg.should.eql('123')
				)
			done()
		})

		test('Formats string as a string', done => {
			testLevels('{String}', 'abc', rec =>
				rec.msg.should.eql('abc')
				)
			done()
		})

		test('Formats bool as true and false', done => {
			testLevels('{True} {False}', true, false, rec =>
				rec.msg.should.eql('true false')
				)
			done()
		})

		test('object without toString is formatted using standard toString', done => {
			testLevels('{obj}', { s: '1', o: { i: 4 } }, rec =>
				rec.msg.should.eql('[object Object]')
				)
			done()
		})


		test('object with toString is formatted using standard toString', done => {
			testLevels('{obj}', { s: '1', o: { i: 4 }, toString: ()=>"from toString" }, rec =>
				rec.msg.should.eql('from toString')
				)
			done()
		})
	})
	
	suite('Normal formatting', () => {
		test('Handles strings', done => {
			testLevels('%s', 42, rec =>
				rec.msg.should.eql('42')
				)
			done()
		})

		test('Handles numbers', done => {
			testLevels('%d', "42", rec =>
				rec.msg.should.eql('42')
				)
			done()
		})

		test('Handles json', done => {
			testLevels('%j', { i: 17 }, rec =>
				rec.msg.should.eql('{"i":17}')
				)
			done()
		})

		test('Handles escaped %', done => {
			//In order for util.format to format string (as opposed to just using the string), 
			//we need to supply values as well
			testLevels('%d%%', 42, rec =>
				rec.msg.should.eql('42%')
				)
			done()
		})
	})


	suite("Appends fields", () => {
		test('Fields are appended with correct names and values', done => {
			testLevels('{Number} {String} {Object}', 42, "4711", { i: 17 }, rec => {
				rec.should.have.property('Number').eql(42)
				rec.should.have.property('String').eql("4711")
				rec.should.have.property('Object').eql({ i: 17 })
			})
			done()
		})

		test('Destructed Fields are appended with correct names and values', done => {
			testLevels('{@Number} {@String} {@Object}', 42, "4711", { i: 17 }, rec => {
				rec.should.have.property('Number').eql(42)
				rec.should.have.property('String').eql("4711")
				rec.should.have.property('Object').eql({ i: 17 })
			})
			done()
		})
	})

	suite("Combinations", () => {
		test('When combining slog with normal formatting its handled correctly', done => {
			testLevels('{Number} %s {@Object} %d', 42, "4711", { i: 17 }, 11, rec =>{
				rec.msg.should.eql('42 4711 {"i":17} 11')
				rec.messageTemplate.should.eql('{Number} 4711 {@Object} 11')
				})
			done()
		})
	})

	suite("With manual fields", () => {
		test('Manual fields should be respected', done => {
			testLevels({ Value: 42 }, '{Number}', 4711, rec => {
				rec.should.have.property('Number').eql(4711)
				rec.should.have.property('Value').eql(42)
			})
			done()
		})
	})

	suite("Error logging", () => {
		test('When logging only error object, it is correctly handled', done => {
			testLevels(new Error('fail'), rec => {
				rec.should.have.property('msg').eql('fail')
				rec.should.have.property('err')
				rec.err.should.have.property('message').eql('fail')
			})
			done()
		})

		test('When logging error object and message, it is correctly handled', done => {
			testLevels(new Error('fail'), '{Number} %s {@Object} %d', 42, "4711", { i: 17 }, 11, rec => {
				rec.msg.should.eql('42 4711 {"i":17} 11')
				rec.should.have.property('err')
				rec.err.should.have.property('message').eql('fail')
				rec.should.have.property('Number').eql(42)
				rec.should.have.property('Object').eql({ i: 17 })
			})
			done()
		})
	})

	suite("Formatted templated strings", () => {
		test('When logging templated string with values it is correctly handled', done=> {
			testLevels(log.fmt`Order id=${40 + 2} was handled:${true} and ${'sent'} to {@User}%s`, { id: 4711 }, '!!!', rec => {
				rec.msg.should.eql('Order 42 was handled:true and sent to {"id":4711}!!!')
				rec.should.have.property('id', 42)
				rec.should.have.property('handled', true)
				rec.should.have.property('User', { id: 4711 })
			})
			done()
		})

		test('When logging templated string with values and extra value object it is correctly handled', done=> {
			testLevels({ extra: 'yes' }, log.fmt`Order id=${40 + 2} was handled:${true} and ${'sent'} to {@User}%s`, { id: 4711 }, '!!!', rec => {
				rec.msg.should.eql('Order 42 was handled:true and sent to {"id":4711}!!!')
				rec.should.have.property('id', 42)
				rec.should.have.property('handled', true)
				rec.should.have.property('User', { id: 4711 })
				rec.should.have.property('extra', 'yes')
			})
			done()
		})
	})
})
