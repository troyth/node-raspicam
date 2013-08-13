var EventEmitter = require('events').EventEmitter
    , exec = require("child_process").exec
    , util = require("util")
    , fs = require("fs")
    , sprintf = require('sprintf').sprintf;



var INFINITY_MS = 999999999;//maximum timeout allowed by raspicam command

//array of child processes
var _children  = [];

//set up exit strategy to kill all child processes (eg. for timelapse) on process exit
process.on('exit', function() {
  console.log('raspicam.js::killing', _children.length, 'child processes');
  _children.forEach(function(child) {
    child.kill();
  });
});

/**
 * RaspiCam
 * @constructor
 *
 * @description Generic analog or digital sensor constructor
 *
 * @param {Object} opts Options: pin, freq, range
 */
function RaspiCam( opts ) {

  if ( !(this instanceof RaspiCam) ) {
    return new RaspiCam( opts );
  }

  var INTERVAL_ID;

  // Sensor instance properties
  this.mode = opts.mode || 'photo';//still or video
  this.freq = opts.freq || 0;//if 0, just a single still
  this.delay = opts.delay || 0;//time to wait til taking the picture
  this.width = opts.width || 640;
  this.height = opts.height || 480;
  this.quality = opts.quality || 80;//from 0-100
  this.encoding = opts.encoding || 'jpg';//jpg, gif, bmp, png
  this.filepath = opts.filepath || __dirname + '/images/';

  this.filename = opts.filename || this.mode + '_' + new Date().getTime() + '_' + this.freq + '_1' + '.' + this.encoding;

  console.log("RASPICAM LIFETIME: "+ this.lifetime + ' config said: '+ opts.lifetime);

  if(this.mode == 'timelapse'){
    this.filename = opts.filename || this.mode + '_' + new Date().getTime() + '_' + this.freq + '_%d' + '.' + this.encoding;
  }else if(this.mode == 'video'){
    //todo: fix this, just copy-pasted from above
    this.filename = opts.filename || this.mode + '_' + new Date().getTime() + '_' + this.freq + '_1' + '.' + this.encoding;
  }
    
  this.timeout = opts.timeout || INFINITY_MS;

  this.lifetime = opts.lifetime || 0;//if >0, delete after this many milliseconds, else never delete

  if(this.timeout > INFINITY_MS) this.timeout = INFINITY_MS;

  this.length = opts.length || 5000;//length in ms of video or timelapse, 0 is infinite

  EventEmitter.call(this);

  switch(this.mode){
    case 'still':

      //TIMELAPSE
      if(this.freq > 0){

        var proc_cmd = '/opt/vc/bin/raspistill'+
          ' -w ' + this.width +
          ' -h ' + this.height +
          ' -t '+ this.timeout +
          ' -q ' + this.quality +
          ' -n' + //no preview: does not display a preview window
          ' -tl ' + this.freq + //sets timelapse
          ' -o ' + this.filepath + this.filename;

        var self = this;

        console.log('RASPICAM.JS: STARTING TIMELAPSE CMD WITH CMD: '+ proc_cmd);

        console.log('WATCHING FILEPATH: '+ this.filepath);

        fs.watch(this.filepath, function(event, filename){
          if(event == 'rename'){
            self.emit( "read", null, filename );
          }//rename is called once, change is called 3 times, so check for rename to elimate duplicates
        });
        
        var child = exec(proc_cmd, function (err, stdout, stderr) {
          console.log('raspicam.js::timelapse photos started');

          if(this.lifetime > 0){
            var i = 1;
            var file_path = this.filepath + sprintf(this.filename, i);
            setInterval(function(){
              imageDelete( file_path, this.lifetime );
            }, this.freq);
            
          }
          //self.emit( "read", err, self.filename + '-tl-' + count + '.' + self.encoding );
        });

        _children.push( child );

      //STILL
      }else{
        console.log('johnny-five raspicam taking a still');
        var proc_cmd = '/opt/vc/bin/raspistill'+
          ' -w ' + this.width +
          ' -h ' + this.height +
          ' -t '+ this.delay +
          ' -q ' + this.quality +
          ' -n' + //no preview: does not display a preview window
          ' -o ' + this.filepath + this.filename + '.' + this.encoding;

        var self = this;

        exec(proc_cmd, function (err, stdout, stderr) {

          if(this.lifetime > 0){
            imageDelete( this.filepath + this.filename + '.' + this.encoding, this.lifetime );
          }

          //callback
          self.emit( "read", err, self.filename + '.' + self.encoding );
        });
      }

      break;
    case 'video':

      break;
  }     
}

function imageDelete( filepath, lifetime ){
  console.log('======= PREPPING IMAGEDELETE WITH liftime: '+ liftime);
  if(lifetime > 0){
    setTimeout(function(){
      fs.unlink(filepath, function(err){
        if (err) console.log('error deleting file from: '+ filepath + ' with message: '+ err);
        console.log('file deleted from: '+ filepath);
      });

    }, lifetime);
  }
}

RaspiCam.prototype.__proto__ = EventEmitter.prototype;

/**
 * pinMode Change the sensor's pinMode on the fly
 * @param  {Number} mode Sensor pin mode value
 * @return {Object} instance
 */
RaspiCam.prototype.start = function( ) {
  
  
};



module.exports = RaspiCam;
