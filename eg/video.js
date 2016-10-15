var RaspiCam = require("../lib/raspicam");


var camera = new RaspiCam({
	mode: "video",
	output: "./video/video.h264",
	framerate: 15,
	timeout: 5000 // take a 5 second video
});

camera.on("start", function( err, timestamp ){
	console.log("video started at " + timestamp );
});

camera.on("read", function( err, timestamp, filename ){
	console.log("video captured with filename: " + filename + " at " + timestamp );
});

camera.on("exit", function( timestamp ){
	console.log("video child process has exited at " + timestamp );
});

camera.start();
