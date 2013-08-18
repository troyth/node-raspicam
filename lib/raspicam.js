var EventEmitter = require('events').EventEmitter
    , spawn = require("child_process").spawn
    , util = require("util")
    , fs = require("fs")
    , sprintf = require('sprintf').sprintf;



var INFINITY_MS = 999999999;//maximum timeout allowed by raspicam command
var PROCESS_RUNNING_FLAG = false;
var DEFAULT_TIMELAPSE_FREQ = 5000;

var PHOTO_CMD = '/opt/vc/bin/raspistill';
var TIMELAPSE_CMD = '/opt/vc/bin/raspistill';
var VIDEO_CMD = '/opt/vc/bin/raspivid';

//child process global for killing on exit
var child_process = null;


//set up exit strategy to kill all child processes (eg. for timelapse) on process exit
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

  //set up attributes
  this.mode = opts.mode || 'photo';//photo, timelapse or video
  this.freq = opts.freq || 0;//if 0, just a single still
  this.delay = opts.delay || 0;//time to wait til taking the picture
  this.width = opts.width || 640;
  this.height = opts.height || 480;
  this.quality = opts.quality || 80;//from 0-100
  this.encoding = opts.encoding || 'jpg';//jpg, gif, bmp, png
  this.filepath = opts.filepath || __dirname + '/images/';

  this.filename = opts.filename || this.mode + '_' + new Date().getTime() + '_' + this.freq + '_1' + '.' + this.encoding;

  if(this.mode == 'timelapse'){
    this.filename = opts.filename || this.mode + '_' + new Date().getTime() + '_' + this.freq + '_%d' + '.' + this.encoding;
  }else if(this.mode == 'video'){
    //todo: fix this, just copy-pasted from above
    this.filename = opts.filename || this.mode + '_' + new Date().getTime() + '_' + this.freq + '_1' + '.' + this.encoding;
  }
    
  this.timeout = opts.timeout || INFINITY_MS;
  //raspistill can only handle a max timeout, check for this here
  if(this.timeout > INFINITY_MS) this.timeout = INFINITY_MS;

  //child process
  this.child_process = null;

  EventEmitter.call(this);
}



RaspiCam.prototype.__proto__ = EventEmitter.prototype;

/**
 * start Take a snapshot or start a timelapse or video recording
 * @param  {Number} mode Sensor pin mode value
 * @return {Object} instance
 */
RaspiCam.prototype.start = function( ) {
  console.log('\n\nCALLED START() IN RASPICAM\n\n');

  switch(this.mode){
    case 'timelapse':

      //alias to pass to callbacks
      var self = this;

      //start watching the directory where the images will be stored to emit signals on each new photo saved
      fs.watch(this.filepath, function(event, filename){
        //rename is called once, change is called 3 times, so check for rename to elimate duplicates
        if(event == 'rename'){
          self.emit( "read", null, filename );
        }
      });


      //set arguments for child process spawn
      var args = [];
      //set width
      if(typeof this.width !== "undefined"){
        args.push('-w');
        args.push(this.width.toString());
      }

      //set height
      if(typeof this.height !== "undefined"){
        args.push('-h');
        args.push(this.height.toString());
      }

      //set quality
      if(typeof this.quality !== "undefined"){
        args.push('-q');
        args.push(this.quality.toString());
      }

      //set timeout *required
      args.push('-t');
      if(typeof this.timeout !== "undefined"){
        args.push(this.timeout.toString());
      }else{
        args.push(INFINITY_MS.toString());
      }

      //set no preview
      args.push('-n');

      //set timelapse frequency *required
      args.push('-tl');
      if(typeof this.freq !== "undefined"){
        args.push(this.freq.toString());
      }else{
        args.push(DEFAULT_TIMELAPSE_FREQ.toString());
      }

      //set output filepath *required
      args.push('-o');
      args.push(this.filepath + this.filename);    
      
      console.log('RASPICAM.JS: STARTING TIMELAPSE CMD WITH CMD: '+ TIMELAPSE_CMD + ' ' + args);

      //start child process
      this.child_process = spawn(TIMELAPSE_CMD, args);
      child_process = this.child_process;
      PROCESS_RUNNING_FLAG = true;

      //set up listeners for stdout, stderr and process exit
      this.addChildProcessListeners();

      break;

    case "photo":
      console.log('raspicam taking a still');
      

      break;

    case 'video':

      break;
  }     

  return true;
  
};

//stop the child process
//return true if process was running, false if no process to kill
RaspiCam.prototype.stop = function( ) {
  if(PROCESS_RUNNING_FLAG){
    this.child_process.kill();
    child_process = null;
    PROCESS_RUNNING_FLAG = false;
    return true;
  }else{
    return false;
  }
}


RaspiCam.prototype.addChildProcessListeners = function(){
  this.child_process.stdout.on('data', function (data) {
    console.log('stdout: ' + data);
    dout = data;
  });

  this.child_process.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
    derr = data;
  });

  this.child_process.on('close', function (code) {
    console.log('\nRaspberry Pi camera child process exited\n');
    
    //emit exit signal for process chaining over time
    this.emit( "raspicam.exit" );

    PROCESS_RUNNING_FLAG = false;
    this.child_process = null;
    child_process = null;
  });

}

module.exports = RaspiCam;
