module.exports = function(grunt) {
	// Do grunt-related things in here

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),
		nodeunit: {
			tests: [
				"test/raspicam.js"
			]
		},
		jshint: {
			options: {
				curly: true,
				eqeqeq: true,
				immed: true,
				latedef: true,
				newcap: true,
				noarg: true,
				sub: true,
				undef: true,
				boss: true,
				eqnull: true,
				node: true,
				strict: false,
				globals: {
					exports: true,
					document: true,
					$: true,
					Radar: true,
					WeakMap: true,
					window: true
				}
			},
			files: {
				src: ["Gruntfile.js", "lib/**/*.js", "test/**/*.js"]
			}
		},
		jsbeautifier: {
			files: ["lib/**/*.js"],
			options: {
				js: {
					braceStyle: "collapse",
					breakChainedMethods: false,
					e4x: false,
					evalCode: false,
					indentChar: " ",
					indentLevel: 0,
					indentSize: 2,
					indentWithTabs: false,
					jslintHappy: false,
					keepArrayIndentation: false,
					keepFunctionIndentation: false,
					maxPreserveNewlines: 10,
					preserveNewlines: true,
					spaceBeforeConditional: true,
					spaceInParen: false,
					unescapeStrings: false,
					wrapLineLength: 0
				}
			}
		}
	});//end initConfig

	// Default tasks are contrib plugins
	grunt.loadNpmTasks("grunt-contrib-nodeunit");
	grunt.loadNpmTasks("grunt-contrib-jshint");
	grunt.loadNpmTasks("grunt-jsbeautifier");

	// Default task.
	grunt.registerTask("default", ["jshint", "nodeunit"]);
};