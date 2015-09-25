#NOTE: PRE PRE PRE ALPHA VERSION
#USE AT OWN RISK!

Extends [bunyan](https://www.npmjs.com/package/bunyan) with [Serilog](http://serilog.net/) format which makes it possible to format messages _and_ capture the values at the same time

``` javascript
var bunyanSlog = require('bunyan-slog')
var log = bunyanSlog.createLogger({name: "myapp"})
log.info('Started job {job} for user {@user}', 4711, {id:42, name:'x'})

//Logs:
{
  "msg": 'Started job 4711 for user {"id":42,"name":"x"}',
  "job": 4711,
  "user": { 
  	"id": 42,
  	"name": "x"
  },
  ... // Regular bunyan properties not shown
}
```

## Install
```
npm install --save bunyan
npm install --save bunyan-serilog
```

## Examples

#### Create logger
``` javascript
var bunyanSlog = require('bunyan-slog')
var log = bunyanSlog.createLogger({name: "myapp"})
```

#### Create logger wrapping a specific bunyan
``` javascript
var bunyan = require('bunyan')
var bunyanSlog = require('bunyan-slog')(bunyan)
var log = bunyanSlog.createLogger({name: "myapp"})
```

#### Log using serilog format
``` javascript
var pos = { lat:25, lon:134 }
var elapsedMs = 34
log.info('Processed {@position} in {elapsed} ms.', pos, elapsedMs' 
```

This will log a bunyan message with the following fields:

```json
{
  "msg": "Processed {lat:25,lon:134} in 34 ms.",
  "position": { 
  	"lat": 25,
  	"lon": 134
  },
  "elapsed": 34,
  ... // Regular bunyan properties not shown
}
```

The @ operator in front of position tells __bunyan-slog__ to serialize the object passed in, rather than convert it using toString().

## API – Logging
__bunyan-slog__ extends the following functions in bunyan: `trace()`, `debug()`, `info()`, `warn()`, `error()` and `fatal()`

In this documentation `info()` is used as example, but all examples applies to the others as well.

|syntax | description |
|:----- |:------- |
| `log.info('{name}', value)` | Inlines `name` and captures `value` as the property `name` |
| `log.info('{@name}', value)`  | Inlines the json stringified version of `value` and captures the value as the property `name` |

#### {theValue}
By surrounding names in `{  }` the value will be inlined in the message _and_ captured as as a property

```javascript
var uid = 4711
log.info('User {userId}', uid) // Logs 'User 4711' and sets property userId:4711

//Expressed using normal bunyan syntax:
log.info({userId:uid}, 'User %d', uid)
```

__Note!__
Objects are serialized using `toString` which normally results in `[object Object]`.
To remedy this, add a `toString()` function on the object or use the [destructor syntax](#@destructor) and add `@` before the name, i.e. `{@myItem}` 

#### {@destructor}
Adding `@` before the the name will destruct an object and inline it as a serialized json object in the message. The value is also captured as a property.

```javascript
var user = { id: 4711, name: 'x' }
log.info('Logged on: {user}', user) 
// Logs 'Logged on: {"id":4711,"name":"x"}' 
// and sets property user: { id: 4711, name: 'x' }

//Expressed using normal bunyan syntax:
log.info({user:user}, 'User %j', user)
```

#### Template strings syntax
__bunyan-slog__ supports logging using [template strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/template_strings), i.e. strings surrounded by back ticks like this `a template string`

The syntax is:

|syntax | description |
|:----- |:------- |
| `name=${value}` | inlines `value` and captures the value as the property `name` |
| `name:${value}` | inlines `name:value` and captures the value as the property `name` |
| `@name=${object}` | inlines the stringified version of object: `{json}` and captures the value as the property `name` |
| `@name:${object}` | inlines the stringified version of object: `name:{json}` and captures the object as the property `name` |
| `@${object}` | inlines the stringified version of object: `{json}` without capturing it as a property |

Example

``` javascript
var fmt = bunyanSlog.fmt
var uid = 4711
var user = { id: 4711, name: 'x' }

// Logs 'User 4711' and sets property userId:4711
log.info(fmt `User userId=${uid}`) 

// Logs 'User userId:4711' and sets property userId:4711
log.info(fmt `User userId:${uid}`)

// Logs 'Logged {"id":4711,"name":"x"}' and sets property user:{id: 4711, name: 'x'}
log.info(fmt `Logged on: @userId=${user}`)

// Logs 'Logged {"id":4711,"name":"x"}' but does not capture the value as a property
log.info(fmt `Logged on: @${user}`)
```

#####fmt function
The `fmt` function can be obtained from the `bunyanSlog` object 

```javascript
var bunyanSlog = require('bunyan-slog')
var fmt = bunyanSlog.fmt
```

or the `log` object

```javascript
var bunyanSlog = require('bunyan-slog')
var log = bunyanSlog.createLogger({name: "myapp"})
var fmt = log.fmt
```

#### Bunyan syntax
Regular bunyan syntax can be used as well.

```javascript
log.info('hi')                 // Logs 'hi'
log.info('hi %s', 'Bob', '!')  // Logs 'hi Bob !'
```

With values

```javascript
log.info({foo: 'bar'}, 'hi')   // Logs 'hi' and sets property foo:'bar'
log.info(new Error('hi'))      // Logs 'hi' and sets property err
```

For more examples see [bunyan documentation](https://www.npmjs.com/package/bunyan).

#### Mixing new and regular bunyan syntax
The syntax can be mixed

```javascript
var userId = 4711
var userName = 'Dude'
log.info({foo: 'bar'}, 'Hi {uid} %s', userId, userName)
//Logs: 'Hi 4711 Dude' and sets the property foo:'bar'
```

## API - Creating loggers
### createLogger
`bunyanSlog.createLogger('logName')`
`bunyanSlog.createLogger({name:'logName'})`
`bunyanSlog.createLogger(bunyanOptions)`
`bunyanSlog.createLogger(bunyanOptions, options)`

|argument | description |
|:----- |:------- |
| `bunyanOptions` | `name` must be set. See [bunyan documentation](https://www.npmjs.com/package/bunyan) for more info. |
| `options` | `messageTemplate:'mt'` will include the property `mt` with the message template. Se below for more info


#### Create logger
``` javascript
var bunyanSlog = require('bunyan-slog')
var log = bunyanSlog.createLogger({name: "myapp"})
```

#### Wrapping an existing bunyan logger
``` javascript
var bunyan = require('bunyan')
var log = bunyan.createLogger({name: 'myapp'})
var bunyanSlog = require('bunyan-slog')
log = bunyanSlog.wrapExisting(log)
```

#### Configure bunyan-slog to use an existing bunyan instance
``` javascript
var bunyan = require('bunyan')
var bunyanSlog = require('bunyan-slog')(bunyan)
```


#### Including message template
When creating a logger you may specify to include an extra property containing the message template

``` javascript
var bunyanSlog = require('bunyan-slog')
var log = bunyanSlog.createLogger({name: "myapp"},{messageTemplate:'mt'})

var user = { id: 4711, name: 'x' }
log.info('Logged on: {user}', user) 
// Logs 'Logged on: {"id":4711,"name":"x"}' 
// and sets the properties:
//  user: { id: 4711, name: 'x' }
//  mt: 'Logged on: {user}'
```

This is useful to log as it makes it very easy to find all entries of when this message is logged, no matter which user logged on.