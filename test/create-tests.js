'use strict'
var Lab = require('lab')                         //https://www.npmjs.com/package/lab
var lab = exports.lab = Lab.script()
var should = require('should')                   //https://www.npmjs.com/package/should

var suite = lab.suite
var test = lab.test
var before = lab.before
var after = lab.after

var bunyanSlog = require('../bunyan-slog.js')
var fmt = bunyanSlog.fmt

function Catcher() { this.records = [] }
Catcher.prototype.write = function (record) { this.records.push(record) }
var catcher = new Catcher()

function lastRecord() {
	return catcher.records[catcher.records.length - 1]
}

suite('Creating', () => {

	test('Can create directly', done => {
		var log = bunyanSlog.createLogger({ name: 'test' })
		log.info().should.be.true()
		done()
	})

	test('Can create debug style', done => {
		var log = bunyanSlog('test')
		log.addStream({
			type: 'raw',
			stream: catcher,
			level: 'trace'
		})
		log.info('hi')
		var rec=lastRecord()
		rec.should.have.property('msg', 'hi')
		rec.should.have.property('name', 'test')
		log.info().should.be.true()
		done()
	})


	test('Can create using function call', done => {
		var log = bunyanSlog().createLogger({ name: 'test' })
		log.info('hi')
		done()
	})

	test('Can create with just name', done => {
		var log = bunyanSlog.createLogger('test')
		log.addStream({
			type: 'raw',
			stream: catcher,
			level: 'trace'
		})
		log.info('hi')
		var rec=lastRecord()
		rec.should.have.property('msg', 'hi')
		rec.should.have.property('name', 'test')
		log.info().should.be.true()
		done()
	})


})

