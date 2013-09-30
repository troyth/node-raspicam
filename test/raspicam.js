var RaspiCam = require("../lib/raspicam"),
		opts_hash = require("../options");

var photo = new RaspiCam({
	mode: "photo",
	w: 180
});

var timelapse = new RaspiCam({
	mode: "timelapse",
	output: "./image_%6d.jpg", // image_000001.jpg, image_000002.jpg,...
	timelapse: 3000, // take a picture every 3 seconds
	timeout: 12000 // take a total of 4 pictures over 12 seconds
});


exports["static"] = {
	"RaspiCam opts hash": function( test ){
		test.expect(1);
		test.equal( photo.get("width"), 180, "photo.width === photo.w");
		test.done();
	},
	"RaspiCam photo start": function( test ){
		test.expect(1);
		test.ok( photo.start(), "photo.start()");
		test.done();
	},
	"RaspiCam timelapse start": function( test ){
		test.expect(1);
		test.ok( timelapse.start(), "timelapse.start()");
		test.done();
	}

};


