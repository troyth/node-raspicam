var RaspiCam = require("../lib/raspicam");


var camera = new RaspiCam({
	mode: "timelapse",
	output: "./image_%06d.jpg", // image_000001.jpg, image_000002.jpg,...
	timelapse: 3000, // take a picture every 3 seconds
	timeout: 12000 // take a total of 4 pictures over 12 seconds
});

camera.start();

camera.on("start", function(){
	console.log("timelapse started");
});

camera.on("read", function( err, filename ){
	console.log("timelapse image captured with filename: " + filename);
});