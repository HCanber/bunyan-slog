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


suite('Reformatting', () => {

	test('Empty string to empty string', done => {
		(fmt``).should.eql({ msg: '', values: [] })
		done()
	})

	test('No value, only constant string', done => {
		(fmt`abc`).should.eql({ msg: 'abc', values: [] })
		done()
	})

	test('Only value without name prefix', done => {
		(fmt`${42}`).should.eql({ msg: '42', values: [] })
		done()
	})

	test('Embedded value without name prefix', done => {
		(fmt`abc ${42} def`).should.eql({ msg: 'abc 42 def', values: [] })
		done()
	})


	test('Only value with name prefix, name included', done => {
		(fmt`id:${42}`).should.eql({ msg: 'id:{id}', values: [42] })
		done()
	})

	test('Only value with name prefix, name excluded', done => {
		(fmt`id=${42}`).should.eql({ msg: '{id}', values: [42] })
		done()
	})

	test('Embedded value with name prefix, name included', done => {
		(fmt`abc id:${42} def`).should.eql({ msg: 'abc id:{id} def', values: [42] })
		done()
	})

	test('Embedded value with name prefix, name excluded', done => {
		(fmt`abc id=${42} def`).should.eql({ msg: 'abc {id} def', values: [42] })
		done()
	})

})

