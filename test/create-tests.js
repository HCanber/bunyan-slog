'use strict'
var Lab = require('lab')                         //https://www.npmjs.com/package/lab
var lab = exports.lab = Lab.script()
var should = require('should')                   //https://www.npmjs.com/package/should

var suite = lab.suite
var test = lab.test
var before = lab.before
var after = lab.after

var bunyanSlog = require('../bunyan-slog.js')
var fmt=bunyanSlog.fmt


suite('Creating', () => {

	test('Can create directly', done => {
		var log = bunyanSlog.createLogger({name:'test'})
		log.info().should.be.true()
		done()
	})


	test('Can create using function call', done => {
		var log= bunyanSlog().createLogger({name:'test'})
		log.info().should.be.true()
		done()
	})

	test('Can create with just name', done => {
		var log = bunyanSlog.createLogger('test')
		log.info().should.be.true()
		done()
	})


})

