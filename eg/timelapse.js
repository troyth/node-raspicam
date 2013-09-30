var RaspiCam = require("../lib/raspicam");


var camera = new RaspiCam({
	mode: "timelapse",
	output: "./timelapse/image_%06d.jpg", // image_000001.jpg, image_000002.jpg,...
	encoding: "jpg",
	timelapse: 3000, // take a picture every 3 seconds
	timeout: 12000 // take a total of 4 pictures over 12 seconds
});

camera.start();

camera.on("started", function(){
	console.log("timelapse started");
});

camera.on("read", function( err, filename ){
	console.log("timelapse image captured with filename: " + filename);
});

camera.on("exited", function(){
	console.log("timelapse child process has exited");
});

camera.on("stopped", function(){
	console.log("timelapse child process has been stopped");
});

// test stop() method before the full 12 seconds is up
setTimeout(function(){
	camera.stop();
}, 10000);