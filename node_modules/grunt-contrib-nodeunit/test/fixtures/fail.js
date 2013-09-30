'use strict';

exports.fail = {
  fail: function(test) {
    test.ok(undefined, 'this value should be truthy');
    test.done();
  },
};
