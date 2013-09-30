var RaspiCam = require("../lib/raspicam"),
		opts_hash = require("../options");

var photo = new RaspiCam({
	mode: "photo",
	w: 180
});



exports["static"] = {
	"RaspiCam opts hash": function( test ){
		test.expect(1);
		test.equal( photo.get("width"), 180, "photo.width === photo.w");
		test.done();
	}

};


