var RaspiCam = require('../lib/raspicam');

var photo = new RaspiCam({
    mode: 'photo',
    output: '',
    w: 180
});

exports['RaspiCam class'] = {
	'can set its witdh': function(test) {
		test.expect(1);
		test.equal(photo.get('width'), 180, 'invalid width');
		test.done();
	}
};
