'use strict';

var events = require('events');
var spawn = require('child_process').spawn;
var util = require('util');
var fs = require('fs');
var mkdirp = require('mkdirp');
var chalk = require('chalk');
var _ = require('lodash');
var parameters = require('../options').parameters;
var flags = require('../options').flags;


// maximum timeout allowed by raspicam command
var INFINITY_MS = 999999999;

// flat to tell if a process is running
var PROCESS_RUNNING_FLAG = false;

// commands
var PHOTO_CMD = '/opt/vc/bin/raspistill';
var TIMELAPSE_CMD = '/opt/vc/bin/raspistill';
var VIDEO_CMD = '/opt/vc/bin/raspivid';

// the process id of the process spawned to take photos/video
var childProcess = null;


// Exit strategy to kill child process
// (eg. for timelapse) on parent process exit
process.on('exit', function() {
  if (PROCESS_RUNNING_FLAG) {
    childProcess.kill();
  }
});


/**
 * RaspiCam
 * @constructor
 *
 * @description Raspberry Pi camera controller object
 *
 * @param {Object} opts Options: mode, freq, delay, width, height, quality, encoding, filepath, filename, timeout
 */
function RaspiCam(opts, libOpts) {

  if (!(this instanceof RaspiCam)) {
    return new RaspiCam(opts);
  }

  // Ensure opts is an object
  opts = opts || {};

  if (typeof opts.mode === 'undefined' || typeof opts.output === 'undefined') {
    this.internalLog('Error: RaspiCam: must define mode and output');
    return false;
  }

  // Initialize this Board instance with
  // param specified properties.
  this.opts = {};
  _.assign(this.opts, opts);

  this.libOpts = {};
  _.assign(this.libOpts, libOpts);

  // If any opts use the abbreviation, convert to
  // the full word (eg. from opts.w to opts.width)
  this.hashOpts(opts);

  // Set up opts defaults
  this.defaultOpts();

  // Create derivative opts
  this.derivativeOpts();

  // If this.filepath doesn't exist, make it
  this.createFilepath();

  //child process
  this.childProcess = null;

  //directory watcher
  this.watcher = null;

  //events.EventEmitter.call(this);
}

// Inherit event api
util.inherits(RaspiCam, events.EventEmitter);

/**
*
* hashOpts()
*
* Converts any abbreviated opts to their full word equivalent
* and assigns to this.
*
**/
RaspiCam.prototype.hashOpts = function(opts) {
  for (var opt in opts) {
    if (opt.length <= 3) {

      // if this opt is in the parameters hash
      if (typeof parameters[opt] !== 'undefined') {

        // reassign it to the full word
        this.opts[parameters[opt]] = opts[opt];
        delete this.opts[opt];
      }

      // if this opt is in the flags hash
      if (typeof flags[opt] !== 'undefined') {

        // reassign it to the full word
        this.opts[flags[opt]] = opts[opt];
        delete this.opts[opt];
      }
    }
  }
};


/**
*
* defaultOpts()
*
* Parses the opts to set defaults.
*
**/
RaspiCam.prototype.defaultOpts = function() {

  this.opts.mode = this.opts.mode || 'photo';//photo, timelapse or video

  this.opts.width = this.opts.width || 640;
  this.opts.height = this.opts.height || 480;

  // Limit timeout to the maximum value
  // supported by the Raspberry Pi camera,
  // determined by testing.
  if (typeof this.opts.timeout !== 'undefined') {
    this.opts.timeout = Math.min(this.opts.timeout, INFINITY_MS);
  }

  this.libOpts.silent = this.libOpts.silent || false;
};


/**
*
* derivativeOpts()
*
* Create any derivative opts, such as filepath and filename
*
**/
RaspiCam.prototype.derivativeOpts = function() {
  this.filename = this.opts.output.
    substr(this.opts.output.lastIndexOf('/') + 1);

  this.filepath = this.opts.output.
    substr(0, this.opts.output.lastIndexOf('/') + 1) || './';
};


/**
*
* createFilepath()
*
* Create the filepath if it doesn't already exist.
*
**/
RaspiCam.prototype.createFilepath = function() {
  fs.existsSync = fs.existsSync || require('path').existsSync;
  if (!fs.existsSync(this.filepath)) {
    mkdirp.sync(this.filepath, '0755');
  }
};



RaspiCam.prototype.watchDirectory = function() {
  //alias to pass to callbacks
  var self = this;

  //close previous directory watcher if any
  if (this.watcher !== null) {
    this.watcher.close();
  }

  //start watching the directory where the images will be stored to emit signals on each new photo saved
  this.watcher = fs.watch(this.filepath, function(event, filename) {
    //rename is called once, change is called 3 times, so check for rename to elimate duplicates
    self.internalLog('raspicam::watcher::event ' + event);
    if (filename === self.filename && event === 'rename') {
      self.emit('read', null, new Date().getTime(), filename);
    } else {
      self.emit(event, null, new Date().getTime(), filename);
    }
  });

  return true;
};

/**
 * start Take a snapshot or start a timelapse or video recording
 * @param  {Number} mode Sensor pin mode value
 * @return {Object} instance
 */
RaspiCam.prototype.start = function() {

  if (PROCESS_RUNNING_FLAG) {
    return false;
  }

  var success = this.watchDirectory();
  if (success === false) {
    this.internalLog('Unable to start the camera as no output was defined');
    return false;
  }

  // build the arguments
  var args = [];

  for (var opt in this.opts) {
    if (opt !== 'mode') {
      args.push('--' + opt);
      //don't add value for true flags
      if (this.opts[opt].toString() !== 'true' &&
          this.opts[opt].toString() !== 'false') {
        args.push(this.opts[opt].toString());
      }
    }
  }

  var cmd;

  switch (this.opts.mode) {
    case 'photo':
      cmd = PHOTO_CMD;
      break;
    case 'timelapse':
      cmd = TIMELAPSE_CMD;

      // if no timelapse frequency provided, return false
      if (typeof this.opts.timelapse === 'undefined') {
        this.emit('start', 'Error: must specify timelapse frequency option',
          new Date().getTime());
        return false;
      }
      // if not timeout provided, set to longest possible
      if (typeof this.opts.timeout === 'undefined') {
        this.opts.timeout = INFINITY_MS;
      }
      break;
    case 'video':
      cmd = VIDEO_CMD;
      break;
    default:
      this.emit('start', 'Error: mode must be photo, timelapse or video',
        new Date().getTime());
      return false;
  }

  //start child process
  this.internalLog('calling....');
  this.internalLog(cmd + ' ' + args.join(' '));
  this.childProcess = spawn(cmd, args);
  childProcess = this.childProcess;
  PROCESS_RUNNING_FLAG = true;

  //set up listeners for stdout, stderr and process exit
  this.addChildProcessListeners();

  this.emit('start', null, new Date().getTime());


  return true;

};

// stop the child process
// return true if process was running, false if no process to kill
RaspiCam.prototype.stop = function() {

  //close previous directory watcher if any
  if (this.watcher !== null) {
    this.watcher.close();
  }

  if (PROCESS_RUNNING_FLAG) {
    this.childProcess.kill();
    childProcess = null;
    PROCESS_RUNNING_FLAG = false;

    this.emit('stop', null, new Date().getTime());
    return true;
  } else {
    this.emit('stop', 'Error: no process was running', new Date().getTime());
    return false;
  }
};


/**
*
* addChildProcessListeners()
*
* Adds listeners to the child process spawned to take pictures
* or record video (raspistill or raspivideo).
*
**/
RaspiCam.prototype.addChildProcessListeners = function() {
  var self = this;
  var dout;
  var derr;

  this.childProcess.on('error', function(err) {
    self.internalLog('error: ' + err);
    derr = err;
  });

  this.childProcess.stdout.on('data', function(data) {
    self.internalLog('stdout: ' + data);
    dout = data;
  });

  this.childProcess.stderr.on('data', function(data) {
    self.internalLog('stderr: ' + data);
    derr = data;
    this.emit('error', derr);
  });

  this.childProcess.on('close', function(code) {
    //emit exit signal for process chaining over time
    self.emit('exit', new Date().getTime());

    PROCESS_RUNNING_FLAG = false;
    self.childProcess = null;
    childProcess = null;

    //remove the file watcher
    self.watcher.close();
    self.watcher = null;
  });

};


/**
*
* getter
*
**/
RaspiCam.prototype.get = function(opt) {
  return this.opts[opt];
};


/**
*
* setter
*
**/
RaspiCam.prototype.set = function(opt, value) {
  this.opts[opt] = value;
  if (opt === 'output') {
    //regenerate filepath, etc, with new output value
    this.derivativeOpts();

    // Ensure file exists
    this.createFilepath();
  }
};

RaspiCam.prototype.internalLog = function(msg) {
  if (this.libOpts.silent === true) {
    return;
  }

  console.log(chalk.dim('[RaspiCam - lib/raspicam.js]: ') + msg);
};

module.exports = RaspiCam;
