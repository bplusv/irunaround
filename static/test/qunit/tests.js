window.irunaround = (function($, backend, editor, graphics) {
	'use strict'

	var lastRule;
	var onFinished;
	var stepWait;
	var timer;

	var main = function() {
		var rule = backend.step();
		if (rule !== undefined) {
			if (true/*rule[0].node.value !== null*/) {
				var ast = rule[0];
				var env = rule[1];
				if (lastRule) {
					graphics.editNode(lastRule[0].id, lastRule[0].node.type, '#088da5');
				}
				var caption = ast.node.value !== null ? ast.node.value : ast.node.type
				graphics.editNode(ast.id, caption, '#9999ff');
				lastRule = rule;
				if (ast.node.span !== null) {
					editor.markLine(ast.node.span[0], 'highlightLine')
					editor.markText(ast.node.span[0], ast.node.span[1], 'highlightText');
				}
				timer = setTimeout(main, stepWait);
			} else {
				timer = setTimeout(main, 0);
			}
		} else {
			onFinished();
		}
	};

	var api = {};
	api.backend = backend;
	api.editor = editor;
	api.graphics = graphics;

	api.init = function(editorId, screenId, screenWidth, screenHeight, stepSpeed) {
		editor.init(editorId);
		graphics.init(screenId, screenWidth, screenHeight, stepSpeed * 1.5);
		stepWait = 5000 / stepSpeed;
	};

	api.parse = function(ast) {
		clearTimeout(timer);
		graphics.redrawTree(ast);
		editor.clearMarks();
		backend.init(ast);
		lastRule = null;
	};

	api.play = function() {
		main();
	};

	api.pause = function() {
		clearTimeout(timer);
	};

	api.setStepSpeed = function(stepSpeed) {
		stepWait = 5000 / stepSpeed;
		graphics.setStepSpeed(stepSpeed * 1.5);
	};

	api.on = function(event, callback) {
		switch (event) {
			case 'finished':
				onFinished = callback;
			break;
		}
	};

	return api;
})(jQuery, irunaround.backend, irunaround.editor, irunaround.graphics);