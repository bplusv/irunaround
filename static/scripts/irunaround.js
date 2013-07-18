window.IRUNAROUND = window.IRUNAROUND || {};
window.IRUNAROUND.Main = (function($) {
	'use strict'
	return function() {
		var loadingScreen;
		var editor;
		this.editor = editor;
		var worldgraphics;
		var treegraphics;
		var backend;
		var onFinished;
		var input, output;
		var stepWait;
		var AppStates = { Loading: 0, Editing: 1, Playing: 2, Paused: 3 };
		this.AppStates = AppStates;
		this.state = AppStates.Loading;
		var module = this;

		var ast;
		var robot;
		var appendLeft = false;
		var askForInput = false;
		var lastAst;
		var timer = -1;

		var getBoxColor = function(type) {
			var color;
			switch (type) {
				case 'int':
					color = '#088da5';
				break;
				case 'float':
					color = '#19C544';
				break;
				case 'char':
					color = '#FF4848';
				break;
				default:
					color = '#ccc';
				break;
			}
			return color;
		};

		var setDataInput = function() {
			if (askForInput === true && module.state !== AppStates.Playing) return;
			
			var args = backend.breadthWalk(ast.children[1]);
			var argFormat = args[0].node.value();
			var reference = args[1].children[0].children[0];

			var varvalue = $(input).find('#dataInput').val();
			switch (argFormat) {
				case '%d':
					varvalue = parseInt(varvalue);
				break;
				case '%f':
					varvalue = parseFloat(varvalue);
				break;
				case '%c':
				case '%s':
					varvalue = String(varvalue);
				break;
			}
			backend.setDataInput(reference, varvalue);

			askForInput = false;
			$(input).find('#dataInput').val('');
			$(input).find('#dataInput').attr('disabled', true);
			$(input).find('#dataInputButton').button("disable");

			robot.lookUpPlatforms = robot.scopePlatformsStack.slice(0);
			robot.scopePlatform.expClear();
			robot.grabLiteral(varvalue);
			robot.gotoCenter(function() {
				lookUpSearch(reference, function(box) {
					robot.gotoBox(box, function() {
						robot.openBox(function() {
							robot.dropLiteral();
							robot.closeBox(function() {
								robot.gotoCenter(function() {
									lookUpBacktrack(function() {
										delayedStep();
									});
								});
							});
						});
				 	});
				});
			});
		};
		this.setDataInput = setDataInput;

		var lookUpSearch = function(identifier, foundCallback) {
			var platform = robot.lookUpPlatforms.pop();
			if (platform !== undefined) {
				robot.gotoPlatform(platform, function() {
					var box = robot.scopePlatform.findIdentifierBox(identifier);
					if (box !== undefined) {
						if (foundCallback !== undefined) {
							foundCallback(box);
						}
					} else {
						robot.backtrackPlatforms.push(platform);
					 	setTimeout(function() {
					 		lookUpSearch(identifier, foundCallback);
					 	}, stepWait);
					}
				});
			}
		};

		var lookUpBacktrack = function(callback) {
			var platform = robot.backtrackPlatforms.pop();
			if (platform !== undefined) {
				robot.gotoPlatform(platform, function() {
					setTimeout(function() {
				 		lookUpBacktrack(callback);
				 	}, stepWait);
				});
			} else {
				if (callback !== undefined) {
					callback();
				}
			}
		}

		var main = function() {
			timer = -1;
			ast = backend.step();
			if (ast === undefined) {
				editor.clearMarks();
				onFinished();
				return;
			}

			if (lastAst) {
				treegraphics.editNode(lastAst.id, lastAst.node.type, '#088da5');
				if (ast.node.type === '=') {
					appendLeft = true;
				}
			}
			lastAst = ast;
			var caption = ast.node.value !== null ? ast.node.value() : ast.node.type
			treegraphics.editNode(ast.id, caption, '#9999ff');
			if (ast.node.span !== null && ast.node.span[0] > -1) {
				editor.markLine(ast.node.span[0], 'highlightLine')
				editor.markText(ast.node.span[0], ast.node.span[1], 'highlightText');
			}

			switch (ast.node.type) {
				case '*':
				case '/':
				case '+':
				case '-':
				case '%':
				case '>=':
				case '<=':
				case '<':
				case '>':
				case '==':
				case '||':
				case '&&':
					robot.scopePlatform.expPush(ast);
					delayedStep();
				break;
				case '=':
					robot.scopePlatform.expUnshift(ast);
					delayedStep();
				break;
				case 'identifier':
					var expLastAst = robot.scopePlatform.expLastAst;
					if (appendLeft === true && expLastAst !== undefined) {
						appendLeft = ast.x - expLastAst.x < 0;
					}

					if (appendLeft === true) {
						robot.scopePlatform.expUnshift(ast.children[0]);
					} else {
						robot.scopePlatform.expPush(ast.children[0]);
						if (ast.node.value() instanceof backend.FuncDec) {
							robot.scopePlatform.expPushLiteral('(');
						}
					}
					delayedStep();
				break;
				case 'reference':
					var refName = ast.children[0].node.type;
					robot.scopePlatform.expPushLiteral('&' + refName);
					delayedStep();
				break;
				case 'type':
					var expLastAst = robot.scopePlatform.expLastAst;
					if (appendLeft === true && expLastAst !== undefined) {
						appendLeft = ast.x - expLastAst.x < 0;
					}

					if (appendLeft === true) {
						robot.scopePlatform.expUnshift(ast.children[0]);
					} else {
						robot.scopePlatform.expPush(ast.children[0]);
					}
					delayedStep();
				break;
				case 'assign':
					var identifier = ast.children[0];
					robot.lookUpPlatforms = robot.scopePlatformsStack.slice(0);
					robot.scopePlatform.expClear();
					var assignVal = identifier.node.value();
					robot.grabLiteral(assignVal);
					lookUpSearch(identifier, function(box) {
						robot.gotoBox(box, function() {
							robot.openBox(function() {
								robot.dropLiteral();
								robot.closeBox(function() {
									robot.gotoCenter(function() {
										lookUpBacktrack(function() {
											delayedStep();
										});
									});
								});
							});
					 	});
					});
				break;
				case 'declaration':
					var identifier = ast.children[1];
					var type = ast.children[0].children[0].node.type;
					var boxColor = getBoxColor(type);
					var box = robot.scopePlatform.addBox(identifier, boxColor);
					var declarationVal = identifier.node.value();
					if (box !== undefined) {
						robot.scopePlatform.expClear();
						robot.grabLiteral(declarationVal);
						robot.gotoBox(box, function() {
							robot.openBox(function() {
								robot.dropLiteral();
								robot.closeBox(function() {
									robot.gotoCenter(function() {
										delayedStep();
									});
								});
							});
						});
					}
				break;
				case 'while':
				case 'if-then':
				case 'if-then-else':
					robot.scopePlatform.expClear();
					delayedStep();
				break;
				case 'arg':
					var nextAst = backend.peek();
					if (nextAst !== undefined && nextAst.node.type !== 'call') {
						robot.scopePlatform.expPushLiteral(',');
					}
					delayedStep();
				break;
				case 'call':
					robot.scopePlatform.expPushLiteral(')');
					var funcDec = ast.children[0].node.value();
					var funcAst = funcDec.ast;
					var funcName = funcDec.fname;
					var args = backend.breadthWalk(ast.children[1]);
					
					setTimeout(function() {
						if (funcName === 'printf') {
							var nodeValue = ast.node.value();
							robot.scopePlatform.expClear();
							robot.grabLiteral(nodeValue);
							robot.gotoOutputBox(function() {
								robot.openBox(function() {
									robot.dropLiteral();
									var outputText = backend.getDataOutput();
									outputText = outputText.replace(/\\n/g, '\n');
									$(output).find('#dataOutput').html(outputText);
									robot.closeBox(function() {
										robot.gotoCenter(function() {
											delayedStep();
										});
									});
								});
							});
						} else if(funcName === 'scanf') {
							robot.gotoInputBox();
							askForInput = true;
							$(input).find('#dataInput').val('');
							$(input).find('#dataInput').attr('disabled', false);
							$(input).find('#dataInputButton').button("enable");
							$(input).find('#dataInput').focus();
							var arrow = $(input).find('#inputArrow');
							arrow.show().css({opacity: '1.0', marginTop: '-90px'});
							arrow.animate({ opacity: '0', marginTop: '-32px' }, 1500, function() {
								arrow.hide();
							});
							/* wait for setInputData to continue */
						} else {
							var funcParams = backend.breadthWalk(funcAst.children[2]);

							var scopeSign = [];
							for (var i in funcParams) {
								var identifier = funcParams[i].children[1];
								var argValue = backend.getIdentifierValue(identifier);
								scopeSign.push(argValue);
							}
							scopeSign = funcName + ' ( ' + scopeSign.join(', ') + ' )';
							var platform = robot.createScopePlatform(scopeSign);
							
							for (var i in funcParams) {
								var type = funcParams[i].children[0].children[0].node.type;
								var boxColor = getBoxColor(type);
								var identifier = funcParams[i].children[1];
								var box = platform.addBox(identifier, boxColor);
							}
							robot.gotoPlatform(platform, function() {
								delayedStep();
							});
						}
					}, stepWait);
				break;
				case 'return':
					robot.scopePlatform.expUnshift(ast);
					var returnValue = ast.children[0].node.value();
					setTimeout(function() {
						robot.scopePlatform.expClear();
						robot.grabLiteral(returnValue);

						robot.scopePlatformsStack.pop();
						var platform = robot.getTopScopePlatform();
						robot.gotoPlatform(platform, function() {
							robot.dropLiteral();
							delayedStep();
						}, true);
					}, stepWait);
				break;


				/* Expression reductions */
				case 'exp':
					var subexp = ast.children[0];
					switch(subexp.node.type) {
						case 'identifier':
							var identifier = subexp;
							robot.lookUpPlatforms = robot.scopePlatformsStack.slice(0);
							lookUpSearch(identifier, function(box) {
								robot.gotoBox(box, function() {
									robot.openBox(function() {
										var identiferVal = identifier.node.value();
										robot.grabLiteral(identiferVal);
										robot.closeBox(function() {
											robot.gotoCenter(function() {
												lookUpBacktrack(function() {
													robot.dropLiteral();
													var evalAst = subexp.children[0];
													robot.scopePlatform.expReduce(evalAst, ast);
													delayedStep();
												});
											});
										});
									});
							 	});
							});
						break;
						case 'reference':
							delayedStep();
						break;
						case 'binop':
							var lval = subexp.children[0].node.value();
							var op = subexp.children[1].node.type;
							var rval = subexp.children[2].node.value();
							var evalAst = subexp.children[0];
							robot.scopePlatform.expReduce(evalAst, ast);
							delayedStep();
						break;
						case 'boolean':
							var booleanValue = ast.node.value();
							var constBox = robot.scopePlatform.constantsBox;
							robot.gotoConstantsBox(function() {
								robot.openBox(function() {
									robot.grabLiteral(booleanValue);
									robot.closeBox(function() {
										robot.gotoCenter(function() {
											robot.dropLiteral();
											robot.scopePlatform.expPush(ast);
											delayedStep();
										}); 
									});
								});
							});
						break;
						case 'number':
							var numberValue = ast.node.value();
							var constBox = robot.scopePlatform.constantsBox;
							robot.gotoConstantsBox(function() {
								robot.openBox(function() {
									robot.grabLiteral(numberValue);
									robot.closeBox(function() {
										robot.gotoCenter(function() {
											robot.dropLiteral();
											robot.scopePlatform.expPush(ast);
											delayedStep();
										});
									});
								});
							});
						break;
						case 'string':
							var stringValue = ast.node.value();
							var constBox = robot.scopePlatform.constantsBox;
							robot.gotoConstantsBox(function() {
								robot.openBox(function() {
									robot.grabLiteral(stringValue);
									robot.closeBox(function() {
										robot.gotoCenter(function() {
											robot.dropLiteral();
											robot.scopePlatform.expPush(ast);
											delayedStep();
										});
									});
								});
							});
						break;
						case 'call':
							if (ast.node.value !== null) {
								var evalAst = subexp.children[0].children[0];
								robot.scopePlatform.expReduce(evalAst, ast);
								var callValue = ast.node.value();
							}
							delayedStep();
						break;
					}
				break;

				default:
					delayedStep();
				break;
			}	
		};

		var delayedStep = function() {
			timer = setTimeout(main, stepWait);
		};

		this.init = function(loadingScreenId, inputContainerId, outputContainerId, editorId, worldScreenId, treeScreenId, screenWidth, screenHeight, stepSpeed) {
			loadingScreen = window.document.getElementById(loadingScreenId);
			input = window.document.getElementById(inputContainerId);
			output = window.document.getElementById(outputContainerId);
			this.editor = editor = new IRUNAROUND.Editor();
			editor.init(editorId);
			worldgraphics = new IRUNAROUND.GRAPHICS.World();
			worldgraphics.init(worldScreenId, screenWidth, screenHeight, stepSpeed * 1.5);
			treegraphics = new IRUNAROUND.GRAPHICS.Tree();
			treegraphics.init(treeScreenId, screenWidth, screenHeight, stepSpeed * 1.5);
			this.setStepSpeed(stepSpeed);
			backend = new IRUNAROUND.Backend();

			worldgraphics.loadModels(function() {
				loadingScreen.style.display = 'none';
				module.state = AppStates.Editing;
			});
		};

		this.reset = function() {
			ast = undefined;
			robot = undefined;
			appendLeft = false;
			askForInput = false;
			lastAst = undefined;
			timer = -1;
		};

		this.parse = function(ast) {
			editor.disableEditing();
			$(output).find('#dataOutput').html('');
			lastAst = null;
			backend.init(ast);
			treegraphics.resetScene();
			treegraphics.loadScene(ast);
			worldgraphics.resetScene();
			robot = worldgraphics.loadScene();
			module.state = AppStates.Playing;
			main();
		};

		this.play = function() {
			module.state = AppStates.Playing;
			editor.disableEditing();
			if (askForInput === true) {
				$(input).find('#dataInput').attr('disabled', false);
				$(input).find('#dataInputButton').button("enable");
			}
			worldgraphics.paused = false;
			if (timer > 0) {
				main();	
			}
		};

		this.pause = function() {
			module.state = AppStates.Paused;
			$(input).find('#dataInput').attr('disabled', true);
			$(input).find('#dataInputButton').button("disable");
			if (timer < 0) {
				worldgraphics.paused = true;
			} else {
				clearTimeout(timer);
			}
		};

		this.edit = function() {
			module.pause();
			module.reset();
			worldgraphics.resetScene();
			treegraphics.resetScene();
			editor.clearMarks();
			editor.enableEditing();
			$(output).find('#dataOutput').html('');
			$(input).find('#dataInput').val('');
			$(input).find('#dataInput').attr('disabled', true);
			$(input).find('#dataInputButton').button("disable");
			module.state = AppStates.Editing;
			editor.enableEditing();
		};

		this.setStepSpeed = function(stepSpeed) {
			stepWait = 2000 / stepSpeed;
			worldgraphics.setStepSpeed(stepSpeed * 1.5);
			treegraphics.setStepSpeed(stepSpeed * 1.5);
		};

		this.on = function(event, callback) {
			switch (event) {
				case 'finished':
					onFinished = callback;
				break;
			}
		};

		this.setTreeView = function() {
			worldgraphics.disable();
			treegraphics.enable();
		};

		this.setWorldView = function() {
			treegraphics.disable();
			worldgraphics.enable();
		};
	};
})(jQuery);