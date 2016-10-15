var events = require('events'),
    spawn = require("child_process").spawn,
    util = require("util"),
    fs = require("fs"),
    _ = require("lodash"),
    __ = require("../lib/fn.js"),
    parameters = require("../options").parameters,
    flags = require("../options").flags;


// maximum timeout allowed by raspicam command
var INFINITY_MS = 999999999;

// flat to tell if a process is running
var PROCESS_RUNNING_FLAG = false;

// commands
var PHOTO_CMD = '/opt/vc/bin/raspistill';
var TIMELAPSE_CMD = '/opt/vc/bin/raspistill';
var VIDEO_CMD = '/opt/vc/bin/raspivid';

// the process id of the process spawned to take photos/video
var child_process = null;


// Exit strategy to kill child process
// (eg. for timelapse) on parent process exit
process.on('exit', function() {
  if(PROCESS_RUNNING_FLAG){
    child_process.kill();
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
function RaspiCam( opts ) {
  
  if ( !(this instanceof RaspiCam) ) {
    return new RaspiCam( opts );
  }

  // Ensure opts is an object
  opts = opts || {};

  if(typeof opts.mode === "undefined" || typeof opts.output === "undefined"){
    console.log("Error: RaspiCam: must define mode and output");
    return false;
  }

  // Initialize this Board instance with
  // param specified properties.
  this.opts = {};
  _.assign( this.opts, opts );

  // If any opts use the abbreviation, convert to
  // the full word (eg. from opts.w to opts.width)
  this.hashOpts( opts );

  // Set up opts defaults
  this.defaultOpts( );

  // Create derivative opts
  this.derivativeOpts( );

  // If this.filepath doesn't exist, make it
  this.createFilepath( );
  
  //child process
  this.child_process = null;

  //directory watcher
  this.watcher = null;

  //events.EventEmitter.call(this);
}

// Inherit event api
util.inherits( RaspiCam, events.EventEmitter );

/**
*
* hashOpts()
*
* Converts any abbreviated opts to their full word equivalent 
* and assigns to this.
* 
**/
RaspiCam.prototype.hashOpts = function(opts){
  for(var opt in opts){
    if(opt.length <= 3){

      // if this opt is in the parameters hash
      if(typeof parameters[opt] !== "undefined"){

        // reassign it to the full word
        this.opts[parameters[opt]] = opts[opt];
        delete this.opts[opt];
      }

      // if this opt is in the flags hash
      if(typeof flags[opt] !== "undefined"){

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
RaspiCam.prototype.defaultOpts = function(){

  this.opts.mode = this.opts.mode || 'photo';//photo, timelapse or video

  this.opts.width = this.opts.width || 640;
  this.opts.height = this.opts.height || 480;

  this.opts.log = typeof this.opts.log === 'function' ? this.opts.log : console.log;

  // Limit timeout to the maximum value
  // supported by the Raspberry Pi camera,
  // determined by testing.
  if(typeof this.opts.timeout !== "undefined"){
    this.opts.timeout = Math.min( this.opts.timeout, INFINITY_MS );
  }

};


/**
*
* derivativeOpts()
*
* Create any derivative opts, such as filepath and filename
* 
**/
RaspiCam.prototype.derivativeOpts = function(){

  this.filename = this.opts.output.substr( this.opts.output.lastIndexOf("/") + 1 );

  this.filepath = this.opts.output.substr(0, this.opts.output.lastIndexOf("/") + 1 ) || "./";
};


/**
*
* createFilepath()
*
* Create the filepath if it doesn't already exist.
* 
**/
RaspiCam.prototype.createFilepath = function(){
  fs.existsSync = fs.existsSync || require('path').existsSync;
  if( !fs.existsSync( this.filepath )){
    fs.mkdirSync( this.filepath );

    // set write permissions
    fs.chmodSync( this.filepath, 0755 );
  }
};



RaspiCam.prototype.watchDirectory = function( ) {
  //alias to pass to callbacks
  var self = this;

  //close previous directory watcher if any
  if(this.watcher !== null){
    this.watcher.close();
  }

  //start watching the directory where the images will be stored to emit signals on each new photo saved
  this.watcher = fs.watch(this.filepath, function(event, filename){
    //rename is called once, change is called 3 times, so check for rename to elimate duplicates
    if(event === "rename"){
      self.opts.log('raspicam::watcher::event ' + event);

      // only emit read event if it is not a temporary file
      if (filename.indexOf('~') === -1) {
        self.emit( "read", null, new Date().getTime(), filename );
      }
    }else{
      self.opts.log('raspicam::watcher::event ' + event);
      self.emit( event, null, new Date().getTime(), filename );
    }
  });
};

/**
 * start Take a snapshot or start a timelapse or video recording
 * @param  {Number} mode Sensor pin mode value
 * @return {Object} instance
 */
RaspiCam.prototype.start = function( ) {

  if(PROCESS_RUNNING_FLAG){
    return false;
  }

  this.watchDirectory();

  // build the arguments
  var args = [];

  for(var opt in this.opts){
    if(opt !== "mode" && opt !== "log"){
      args.push("--" + opt);
      //don't add value for true flags
      if( this.opts[opt].toString() != "true" && this.opts[opt].toString() != "false"){
        args.push(this.opts[opt].toString());
      }
    }
  }

  var cmd;

  switch(this.opts.mode){
    case 'photo':
      cmd = PHOTO_CMD;
      break;
    case 'timelapse':
      cmd = TIMELAPSE_CMD;

      // if no timelapse frequency provided, return false
      if(typeof this.opts.timelapse === "undefined"){
        this.emit("start", "Error: must specify timelapse frequency option", new Date().getTime() );
        return false;
      }
      // if not timeout provided, set to longest possible
      if(typeof this.opts.timeout === "undefined"){
        this.opts.timeout = INFINITY_MS;
      }
      break;
    case 'video':
      cmd = VIDEO_CMD;
      break;
    default:
      this.emit("start", "Error: mode must be photo, timelapse or video", new Date().getTime() );
      return false;
  }

  //start child process
  this.opts.log('calling....');
  this.opts.log(cmd + ' ' + args.join(" "));
  this.child_process = spawn(cmd, args);
  child_process = this.child_process;
  PROCESS_RUNNING_FLAG = true;

  //set up listeners for stdout, stderr and process exit
  this.addChildProcessListeners();

  this.emit("start", null, new Date().getTime() );
   

  return true;
  
};

// stop the child process
// return true if process was running, false if no process to kill
RaspiCam.prototype.stop = function( ) {

  //close previous directory watcher if any
  if(this.watcher !== null){
    this.watcher.close();
  }

  if(PROCESS_RUNNING_FLAG){
    this.child_process.kill();
    child_process = null;
    PROCESS_RUNNING_FLAG = false;

    this.emit("stop", null, new Date().getTime() );
    return true;
  }else{
    this.emit("stop", "Error: no process was running", new Date().getTime());
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
RaspiCam.prototype.addChildProcessListeners = function(){
  var self = this;
  var dout, derr;

  this.child_process.stdout.on('data', function (data) {
    self.opts.log('stdout: ' + data);
    dout = data;
  });

  this.child_process.stderr.on('data', function (data) {
    self.opts.log('stderr: ' + data);
    derr = data;
  });

  this.child_process.on('close', function (code) {    
    //emit exit signal for process chaining over time
    self.emit( "exit", new Date().getTime() );

    PROCESS_RUNNING_FLAG = false;
    self.child_process = null;
    child_process = null;
    self.watcher.close();//remove the file watcher
    self.watcher = null;
  });

};


/**
*
* getter
*
**/
RaspiCam.prototype.get = function(opt){
  return this.opts[opt];
};


/**
*
* setter
*
**/
RaspiCam.prototype.set = function(opt, value){
  this.opts[opt] = value;
  if(opt == "output"){
    //regenerate filepath, etc, with new output value
    this.derivativeOpts();
  }
};

module.exports = RaspiCam;

