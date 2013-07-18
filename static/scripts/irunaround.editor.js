window.IRUNAROUND = window.IRUNAROUND || {};
window.IRUNAROUND.Editor = (function(CodeMirror) {
	'use strict'
	return function() {
		var codeMirror;
		var textMarker;
		var lastHighlightedLine = -1;

		this.init = function(textAreaId) {
			codeMirror = CodeMirror.fromTextArea(
				document.getElementById(textAreaId), 
				{ 'mode': 'text/x-csrc',
				'matchBrackets': true,
				'gutters': ["note-gutter", "CodeMirror-linenumbers"],
				'lineNumbers': true
			});
			codeMirror.setOption('theme', 'solarized light');
			textMarker = codeMirror.markText(
				codeMirror.posFromIndex(0), 
				codeMirror.posFromIndex(0)
			);
		};

		this.getValue = function() {
			return codeMirror.getValue();
		};

		this.setValue = function(value) {
			codeMirror.setValue(value);
		};

		this.save = function() {
			codeMirror.save();
		};

		this.markLine = function(startIndex, style) {
			var lineNumber = codeMirror.posFromIndex(startIndex).line;
			codeMirror.removeLineClass(lastHighlightedLine, 'background', style);
			codeMirror.setGutterMarker(lastHighlightedLine, 'note-gutter');

			codeMirror.addLineClass(lineNumber, 'background', style);
			var linePointer = document.createElement('span');
			linePointer.innerHTML = '&#9654;';
			linePointer.style.color = '#aaa';
			codeMirror.setGutterMarker(lineNumber, 'note-gutter', linePointer);
			lastHighlightedLine = lineNumber;
		};

		this.clearMarkLine = function() {
			codeMirror.removeLineClass(lastHighlightedLine, 'background');
			codeMirror.clearGutter('note-gutter');
			lastHighlightedLine = -1;
		};

		this.markText = function(startIndex, endIndex, style) {
			textMarker.clear();
			textMarker = codeMirror.markText(
				codeMirror.posFromIndex(startIndex),
				codeMirror.posFromIndex(endIndex),
				{className: style}
			);
		};

		this.clearMarkText = function() {
			textMarker.clear();
		};

		this.clearMarks = function() {
			this.clearMarkText();
			this.clearMarkLine();
		};

		this.disableEditing = function() {
			$('.cm-s-solarized.cm-s-light').css('background-color', '#fdf6e3')
			codeMirror.setOption('readOnly', true);
		};

		this.enableEditing = function() {
			$('.cm-s-solarized.cm-s-light').css('background-color', '#ffffff')
			codeMirror.setOption('readOnly', false);
		};
	};
})(CodeMirror);