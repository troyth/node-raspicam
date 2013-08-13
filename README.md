#node-raspicam

A Node.js-based controller module for the Raspberry Pi camera based on a command structure similar to Johnny-Five. Currently implemented as a wrapper for structuring a command line process call using child_process.exec from within Node.

##The Basics

###To Install

	npm install raspicam

###To Use

Require raspicam in your node app, then used the exposed constructor to create a RaspiCam object that you can you to take photos, start a timelapse, or record video.

	var RaspiCam = require("raspicam");

	var camera = new RaspiCam({ opts });

	//to take a snapshot, start a timelapse or video recording
	var process_id = camera.start({ opts });

	//to stop a timelapse or video recording
	camera.stop( process_id );


###RaspiCam Constructor

The RaspiCam() constructor creates an object that can then be triggered to take a snapshot or start a timelapse or video recording. The constructor options mirror those offered by the raspistill and raspivideo commands provided by the Raspberry Pi Camera API.

######RaspiCam Options

*	`mode` (String) can be "photo", "timelapse" or "video"
*	`freq` (Integer) sets the frequency of a timelapse in milliseconds (ie. photos will be taken every N ms)
*	`delay` (Integer) is the amount of time between when the start method is called and the snapshot is taken or the timelapse or video is started
*	`width` (Integer) sets the width of the image or 
video in pixels
*	`height` (Integer) sets the height of the image or video in pixels
*	`quality` (Integer) sets the image quality from 0-100
*	`encoding` (String) wncoding to use for output file (jpg, bmp, gif, png)
*	`filepath` (String) the directory where the file should be saved
*	`filename` (String) the name to give the file - use %d in the file name for a timelapse to allow for incremental numbering
*	`timeout` (Integer) time (in ms) before takes picture and shuts down (if not specified, set to 5s)

Additional options will be added over time to allow for the full set of raspistill and raspivideo command options to be available. I've also included another option, `lifetime`, that will delete the output after N milliseconds. This can be used for a Raspberry Pi that is used as a collector sending files to a server so that the memory doesn't fill up over time, for instance.


###RaspiCam Object Methods

####RaspiCam.start({ opts })

Depending on the `mode`, this will take a snapshot ("photo"), start a timelapse ("timelapse") or start a video recording ("video"). The function returns a process id so the stop method can be later called if necessary. The calling process then needs to set up a listener for a `"read"` event that the RaspiCam process will emit when the snapshot or video is complete, and each time a timelapse photo is taken, with any error message followed by the filename of the output as the payload, illustrated here:
	
	emit( "read", error, filename )


