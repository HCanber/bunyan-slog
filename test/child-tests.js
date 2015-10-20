'use strict'
var Lab = require('lab')                         //https://www.npmjs.com/package/lab
var lab = exports.lab = Lab.script()
var should = require('should')                   //https://www.npmjs.com/package/should

var suite = lab.suite
var test = lab.test
var before = lab.before
var after = lab.after

var bunyanSlog = require('../bunyan-slog.js')

function Catcher() { this.records = [] }
Catcher.prototype.write = function (record) { this.records.push(record) }
var catcher = new Catcher()

function lastRecord() {
	return catcher.records[catcher.records.length - 1]
}

var log = bunyanSlog.createLogger({
		name: 'test',
		streams: [
		{
			type: 'raw',
			stream: catcher,
			level: 'trace'
		}

		]
}, { messageTemplate: 'messageTemplate' })

suite('child logger', () => {

	test('is wrapped and can log with destructor and non destructor syntax', done => {
		var child = log.child()
		child.info('{NonDestructor} {@Destructor}', 4711, { i: 42 })
		var rec = lastRecord()
		rec.should.have.property('msg', '4711 {"i":42}')
		rec.should.have.property('NonDestructor', 4711)
		rec.should.have.property('Destructor', { i: 42 })

		done()
	})
	
	test('captures messageTemplate', done => {
		var child = log.child()
		child.info('{NonDestructor} {@Destructor}', 4711, { i: 42 })
		var rec = lastRecord()
		rec.should.have.property('messageTemplate', '{NonDestructor} {@Destructor}')
		done()
	})
	
	
	test('adds extra fields to message', done => {
		var child = log.child({extraValue:4711})
		child.info('Hello')
		var rec = lastRecord()
		rec.should.have.property('extraValue', 4711)

		done()
	})
	
		
	test('can create child logger that logs correctly', done => {
		var child1 = log.child({extraValue1:4711})
		var child2 = child1.child({extraValue2:42})
		child2.info('Hello {name}','Max')
		var rec = lastRecord()
		rec.should.have.property('msg', 'Hello Max')
		rec.should.have.property('extraValue1', 4711)
		rec.should.have.property('extraValue2', 42)
		rec.should.have.property('name', 'Max')
		rec.should.have.property('messageTemplate', 'Hello {name}')

		done()
	})
})