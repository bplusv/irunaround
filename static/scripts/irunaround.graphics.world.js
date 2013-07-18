window.IRUNAROUND = window.IRUNAROUND || {};
window.IRUNAROUND.GRAPHICS = window.IRUNAROUND.GRAPHICS || {};
window.IRUNAROUND.GRAPHICS.World = (function(THREE, TWEEN) {
	'use strict'
	return function() {

		var axis;
		var active, container;
		var scene, renderer;
		var ambientLight, lightFront, lightBack;
		var camera, controls;
		var stepWait = 500;
		var robotTexture;
		var robotMorphModel;
		var module = this;
		this.robot;
		this.paused = false;
		var clock = new THREE.Clock();
		var animationDelta = 0;
		var animationElapsed = 0;

		var BoxBehaviours = { Opening: 0, Open: 1, Closing: 2, Closed: 3 };
		function Box(identifier, background, scopePlatform, minWidth, fontSize) {
			this.open = function(callback) {
				new TWEEN.Tween(lidRotator.rotation)
				.to({ 
						z: Math.PI * 3/4,
					}, stepWait * 2
				).easing(
					TWEEN.Easing.Elastic.Out
				).onStart(function() {
					self.behaviour = BoxBehaviours.Opening;
				}).onComplete(function() {
					self.behaviour = BoxBehaviours.Open;
					if (callback !== undefined) {
						callback();
					}
				}).start(animationElapsed);	
			}

			this.close = function(callback) {
				new TWEEN.Tween(lidRotator.rotation)
				.to({ 
						z: 0,
					}, stepWait
				).easing(
					TWEEN.Easing.Cubic.Out
				).onStart(function() {
					self.behaviour = BoxBehaviours.Closing;
				}).onComplete(function() {
					self.behaviour = BoxBehaviours.Closed;
					if (callback !== undefined) {
						callback();
					}
				}).start(animationElapsed);
			};

			var self = this;
			minWidth = minWidth || 100;
			var curTween;

			this.identifier = identifier;

			this.object3d;
			this.behaviour = BoxBehaviours.Closed;
			var idText = this.identifier.children[0].node.type;
			var textTexture = makeTextTexture(idText, '#fff', fontSize, background, minWidth, 100);
			var boxWidth = textTexture.image.width;

			var mainContainer = new THREE.Object3D();

			var s1 = new THREE.Mesh(
				new THREE.PlaneGeometry(boxWidth, 100, 10, 10),
				new THREE.MeshLambertMaterial({ map: textTexture, side: THREE.DoubleSide})
			);
			s1.position.x = 0;
			s1.position.y = 0;
			s1.position.z = -50;
			mainContainer.add(s1);

			var s2 = new THREE.Mesh(
				new THREE.PlaneGeometry(100, 100, 10, 10),
				new THREE.MeshLambertMaterial({ color: background, side: THREE.DoubleSide})
			);
			s2.position.x = boxWidth / 2;
			s2.position.y = 0;
			s2.position.z = 0;

			s2.rotation.y = -Math.PI / 2;
			mainContainer.add(s2);

			var s3 = new THREE.Mesh(
				new THREE.PlaneGeometry(boxWidth, 100, 10, 10), 
				new THREE.MeshLambertMaterial({ map: textTexture, side: THREE.DoubleSide})
			);
			s3.position.x = 0;
			s3.position.y = 0;
			s3.position.z = 50;
			mainContainer.add(s3);

			var s4 = new THREE.Mesh(
				new THREE.PlaneGeometry(100, 100, 10, 10), 
				new THREE.MeshLambertMaterial({ color: background, side: THREE.DoubleSide})
			);
			s4.position.x = -boxWidth / 2;
			s4.position.y = 0;
			s4.position.z = 0;

			s4.rotation.y = Math.PI / 2;
			mainContainer.add(s4);

			var s5 = new THREE.Mesh(
				new THREE.PlaneGeometry(boxWidth, 100, 10, 10), 
				new THREE.MeshLambertMaterial({ map: textTexture, side: THREE.DoubleSide})
			);
			s5.position.x = 0;
			s5.position.y = -50;
			s5.position.z = 0;

			s5.rotation.x = -Math.PI /2;
			mainContainer.add(s5);

			var lid = new THREE.Mesh(
				new THREE.PlaneGeometry(boxWidth, 100, 10, 10), 
				new THREE.MeshLambertMaterial({ map: textTexture, side: THREE.DoubleSide})
			);
			lid.position.x = boxWidth / 2;
			lid.position.y = 0;
			lid.position.z = 0;
			lid.rotation.x = -Math.PI / 2;

			var lidRotator = new THREE.Object3D();
			lidRotator.position.x = -boxWidth / 2;
			lidRotator.position.y = 50;
			lidRotator.position.z = 0;
			lidRotator.add(lid);
			mainContainer.add(lidRotator);
			mainContainer.receiveShadow = true;
			mainContainer.receiveShadow = true;

			this.width = boxWidth;
			this.height = 100;
			this.depth = 100;

			this.scopePlatform = scopePlatform;
			this.object3d = mainContainer;
		}

		var RobotBehaviours = { Stand: 0, Run: 1, StandGrab: 2, RunGrab: 3 };
		function Robot(morph) {
			this.grabLiteral = function(value) {
				this.dropLiteral();
				this.literal = new Text3d(value, 80, '#999');
				this.literal.position.y = 150;
				this.object3d.add(this.literal);
				this.stand();
			};

			this.dropLiteral = function() {
				if (this.literal !== undefined) {
					this.object3d.remove(this.literal);
					this.literal = undefined;
					this.stand();
				}
			};

			this.stand = function() {
				if (this.literal === undefined) {
					this.behaviour = RobotBehaviours.Stand;
					this.morph.setFrameRange(21, 22);
				} else {
					this.behaviour = RobotBehaviours.StandGrab;
					this.morph.setFrameRange(44, 45);
				}
			};
 
			this.run = function() {
				if (this.literal === undefined) {
					this.behaviour = RobotBehaviours.Run;
					this.morph.setFrameRange(1, 20);
				} else {
					this.behaviour = RobotBehaviours.RunGrab;
					this.morph.setFrameRange(23, 42);
				}
			};

			this.openBox = function(callback) {
				self.curBox.open(function() {
					if (callback !== undefined) {
						callback();
					}
				});
			};

			this.closeBox = function(callback) {
				self.curBox.close(function() {
					if (callback !== undefined) {
						callback();
					}
				});
			};

			this.gotoBox = function(box, callback) {
				self.curBox = box;
				self.run();
				var boxPos = new THREE.Vector3(
					self.scopePlatform.object3d.position.x + self.curBox.object3d.position.x, 
					self.object3d.position.y, 
					self.scopePlatform.object3d.position.z + self.curBox.object3d.position.z
				);
				self.object3d.lookAt(boxPos);
				new TWEEN.Tween(this.object3d.position)
				.to({ 
						x: boxPos.x,
						z: boxPos.z - self.curBox.depth
					}, stepWait * 2
				).easing(
					TWEEN.Easing.Quadratic.InOut
				).onUpdate(function() {
					var boxPos = new THREE.Vector3(
						self.scopePlatform.object3d.position.x + self.curBox.object3d.position.x, 
						self.object3d.position.y, 
						self.scopePlatform.object3d.position.z + self.curBox.object3d.position.z
					);
					self.object3d.lookAt(boxPos);
				}).onComplete(function() {
					self.stand();
					if (callback !== undefined) {
						callback();
					}
				}).start(animationElapsed);
			};

			this.gotoInputBox = function(callback) {
				this.curBox = this.scopePlatform.inputBox;
				self.run();
				var boxPos = new THREE.Vector3(
					self.scopePlatform.object3d.position.x + self.curBox.object3d.position.x, 
					self.object3d.position.y, 
					self.scopePlatform.object3d.position.z + self.curBox.object3d.position.z
				);
				self.object3d.lookAt(boxPos);
				new TWEEN.Tween(self.object3d.position)
				.to({ 
						x: boxPos.x,
						y: boxPos.y,
						z: boxPos.z + self.curBox.depth
					}, stepWait * 2
				).easing(
					TWEEN.Easing.Quadratic.InOut
				).onUpdate(function() {
					var boxPos = new THREE.Vector3(
						self.scopePlatform.object3d.position.x + self.curBox.object3d.position.x, 
						self.object3d.position.y, 
						self.scopePlatform.object3d.position.z + self.curBox.object3d.position.z
					);
					self.object3d.lookAt(boxPos);
				}).onComplete(function() {
					self.stand();
					if (callback !== undefined) {
						callback();
					}
				}).start(animationElapsed);
			};

			this.gotoOutputBox = function(callback) {
				this.curBox = this.scopePlatform.outputBox;
				self.run();
				var boxPos = new THREE.Vector3(
					self.scopePlatform.object3d.position.x + self.curBox.object3d.position.x, 
					self.object3d.position.y, 
					self.scopePlatform.object3d.position.z + self.curBox.object3d.position.z
				);
				self.object3d.lookAt(boxPos);
				new TWEEN.Tween(self.object3d.position
				).to({ 
						x: boxPos.x,
						y: boxPos.y,
						z: boxPos.z + self.curBox.depth
					}, stepWait * 2
				).easing(
					TWEEN.Easing.Quadratic.InOut
				).onUpdate(function() {
					var boxPos = new THREE.Vector3(
						self.scopePlatform.object3d.position.x + self.curBox.object3d.position.x, 
						self.object3d.position.y, 
						self.scopePlatform.object3d.position.z + self.curBox.object3d.position.z
					);
					self.object3d.lookAt(boxPos);
				}).onComplete(function() {
					self.stand();
					if (callback !== undefined) {
						callback();
					}
				}).start(animationElapsed);
			};

			this.gotoConstantsBox = function(callback) {
				self.curBox = self.scopePlatform.constantsBox;
				self.run();
				var boxPos = new THREE.Vector3(
					self.scopePlatform.object3d.position.x + self.curBox.object3d.position.x, 
					self.object3d.position.y, 
					self.scopePlatform.object3d.position.z + self.curBox.object3d.position.z
				);
				self.object3d.lookAt(boxPos);
				new TWEEN.Tween(self.object3d.position)
				.to({ 
						x: boxPos.x,
						y: boxPos.y,
						z: boxPos.z + self.curBox.depth
					}, stepWait * 2
				).easing(
					TWEEN.Easing.Quadratic.InOut
				).onUpdate(function() {
					var boxPos = new THREE.Vector3(
						self.scopePlatform.object3d.position.x + self.curBox.object3d.position.x, 
						self.object3d.position.y, 
						self.scopePlatform.object3d.position.z + self.curBox.object3d.position.z
					);
					self.object3d.lookAt(boxPos);
				}).onComplete(function() {
					self.stand();
					if (callback !== undefined) {
						callback();
					}
				}).start(animationElapsed);
			};

			this.gotoCenter = function(callback) {
				var centerPos = new THREE.Vector3(
					self.scopePlatform.object3d.position.x, 
					self.object3d.position.y, 
					self.scopePlatform.object3d.position.z
				);
				self.object3d.lookAt(centerPos);
				new TWEEN.Tween(self.object3d.position)
				.to({ 
						x: centerPos.x,
						y: centerPos.y,
						z: centerPos.z
					}, stepWait * 2
				).easing(
					TWEEN.Easing.Quadratic.InOut
				).onStart(function() {
					self.run();
				}).onComplete(function() {
					self.stand();
					if (callback !== undefined) {
						callback();
					}
				}).start(animationElapsed);
			};

			this.gotoPlatform = function(platform, callback, destroyPrevPlatform) {
				if (platform === self.scopePlatform) {
					if (callback !== undefined) {
						callback();
					}
					return;
				}
				self.run();
				var prevPlatformPos = self.scopePlatform.object3d.position;
				var platformPos = new THREE.Vector3(
					platform.object3d.position.x,
					platform.object3d.position.y,
					platform.object3d.position.z
				);
				var isAscending = platformPos.y > prevPlatformPos.y;
				self.object3d.lookAt(new THREE.Vector3(
					platformPos.x, 
					self.object3d.position.y, 
					platformPos.z)
				);
				new TWEEN.Tween(self.object3d.position)
				.to({ 
						x: platformPos.x,
						y: platformHeightOffset + (isAscending ? platformPos.y : prevPlatformPos.y),
						z: platformPos.z + (isAscending ? self.scopePlatform.depth / 2 : - platform.depth / 2)
					}, stepWait * 4
				).onStart(function() {
					self.run();
					controls.reset();
				}).onUpdate(function() {
					camera.lookAt(self.object3d.position);
					if (module.paused === false) {
						camera.position.x = self.object3d.position.x;
						camera.position.y = self.object3d.position.y + 800;
						camera.position.z = self.object3d.position.z + 2000;
					}
				}).easing(
					TWEEN.Easing.Quadratic.Out
				).onComplete(function() {
					if (destroyPrevPlatform === true) {
						scene.remove(self.scopePlatform.object3d);
					}
				}).chain(
					new TWEEN.Tween(self.object3d.position)
					.to({ 
							x: platformPos.x,
							y: platformPos.y,
							z: platformPos.z
						}, stepWait * 4
					).easing(
						TWEEN.Easing.Quadratic.In
					).onUpdate(function() {
						camera.lookAt(self.object3d.position);
						if (module.paused === false) {
							camera.position.x = self.object3d.position.x;
							camera.position.y = self.object3d.position.y + 800;
							camera.position.z = self.object3d.position.z + 2000;
						}
					}).onComplete(function() {
						self.scopePlatform = platform;
						controls.target = platformPos;
						self.stand();
						if (callback !== undefined) {
							callback();
						}
					})
				).start(animationElapsed);
			};

			this.update = function(delta) {
				if (this.morph !== undefined && module.paused === false) {
					this.morph.updateAnimation(delta);

					lightFront.position = new THREE.Vector3(
						self.object3d.position.x,
						self.object3d.position.y + 800,
						self.object3d.position.z + 2000
					);

					lightBack.position = new THREE.Vector3(
						self.object3d.position.x + 500,
						self.object3d.position.y + 800,
						self.object3d.position.z - 2000
					);
					
				}
			};

			this.createScopePlatform = function(scopeSignText) {
				var index = this.scopePlatformsStack.length;
				var posY = index * platformHeightOffset;
				var posZ = index * -platformDepthOffset;

				var platform = new ScopePlatform(0, posY, posZ, scopeSignText);
				this.scopePlatformsStack.push(platform);
				return platform;
			};

			this.destroyScopePlatform = function(platform) {
				scene.remove(platform.object3d);
			};

			this.getTopScopePlatform = function() {
				return self.scopePlatformsStack[self.scopePlatformsStack.length - 1];
			};

			this.getTopLookUpPlatform = function() {
				return self.lookUpPlatforms[self.lookUpPlatforms.length - 1];
			};

			var self = this;
			this.morph = morph;
			this.morph.duration = 300;
			
			this.literal;
			this.curBox;
			this.behaviour;
			this.elapsed = 0;
			this.scopePlatformsStack = [];
			this.lookUpPlatforms = [];
			this.backtrackPlatforms = []
			var platformHeightOffset = 400;
			var platformDepthOffset = 800;
			this.scopePlatform = this.createScopePlatform('global');

			this.object3d = new THREE.Object3D();
			this.object3d.add(this.morph);
			this.object3d.position = this.scopePlatform.object3d.position.clone();
			lightFront.target = this.object3d;
			lightBack.target = this.object3d;
			this.stand();
			scene.add(this.object3d);
		};

		function ScopePlatform(posX, posY, posZ, scopeSignText, width, depth) {
			this.object3d = new THREE.Object3D();
			this.boxes = [];

			var posX = posX || 0;
			var posY = posY || 0;
			var posZ = posZ || 0;
			this.object3d.position.x = posX;
			this.object3d.position.y = posY;
			this.object3d.position.z = posZ;

			this.width = width || 1200;
			this.depth = depth || 800;
			this.varBoxOffset = -this.width / 2;
			
			var platformMesh;
			this.drawPlatformMesh = function(width, depth) {
				this.object3d.remove(platformMesh);
				this.width = width;
				this.depth = depth;

				var platformMaterial = new THREE.MeshPhongMaterial({
					ambient: 0xffffff, 
					color: 0x3333aa, 
					specular: 0xffffff, 
					shininess: 50, 
					side: THREE.DoubleSide
				});
				platformMaterial.shading = THREE.SmoothShading;

				var platformGeometry = new THREE.PlaneGeometry(width, depth, 10, 10);
				platformGeometry.computeMorphNormals();

				platformMesh = new THREE.Mesh(platformGeometry, platformMaterial);

				platformMesh.rotation.x = -Math.PI/2;
				platformMesh.position.y = -1;
				platformMesh.receiveShadow = true;
				this.object3d.add(platformMesh);
			};


			this.scopeSign;
			this.drawScopeSign = function(scopeText) {
				var fontSize = 80;
				var background = '#9999ff';
				var minWidth = 600;
				var height = 100;
				var altitude = 250;
				var poleWidth = 10;

				if (this.scopeSign === undefined) {
					var textTexture = makeTextTexture(scopeText, '#fff', fontSize, background, minWidth, height);
					var signWidth = textTexture.image.width;
					this.scopeSign = new THREE.Object3D();

					var signMesh = new THREE.Mesh(
						new THREE.PlaneGeometry(signWidth, height, 10, 10),
						new THREE.MeshLambertMaterial({ map: textTexture, side: THREE.DoubleSide})
					);
					this.scopeSign.add(signMesh);
					var signPoleLeft = new THREE.Mesh(
						new THREE.PlaneGeometry(poleWidth, altitude, 10, 10),
						new THREE.MeshLambertMaterial({ color: 0x9999ff, side: THREE.DoubleSide})
					);
					signPoleLeft.position.x = -minWidth / 2 + poleWidth / 2;
					signPoleLeft.position.y = -altitude/2 - height / 2;
					this.scopeSign.add(signPoleLeft);
					this.scopeSign.add(signMesh);
					var signPoleRight = new THREE.Mesh(
						new THREE.PlaneGeometry(poleWidth, altitude, 10, 10),
						new THREE.MeshLambertMaterial({ color: 0x9999ff, side: THREE.DoubleSide})
					);
					signPoleRight.position.x = minWidth / 2 - poleWidth / 2;
					signPoleRight.position.y = -altitude/2 - height / 2;
					this.scopeSign.add(signPoleRight);
					this.object3d.add(this.scopeSign);
				}
				this.scopeSign.position.x = 0;
				this.scopeSign.position.y = 300;
				this.scopeSign.position.z = -this.depth / 2;
			};

			this.constantsBox;
			this.drawConstantsBox = function() {
				var boxMinWidth = 400;
				var constantsIdentifier = {
					node: { type:'declaration', value:null },
					children: [{
						node: { type:'Literals', value:null },
						children: []
					}]
				};
				if (this.constantsBox === undefined) {
					this.constantsBox = new Box(constantsIdentifier, '#9999ff', this, boxMinWidth, 50);
					this.object3d.add(this.constantsBox.object3d);				
				}
				this.constantsBox.object3d.position.x = 0;
				this.constantsBox.object3d.position.y = this.constantsBox.height / 2;
				this.constantsBox.object3d.position.z = -this.depth / 2 + this.constantsBox.depth / 2;
			};

			this.inputBox;
			this.drawInputBox = function() {
				var boxMinWidth = 200;
				var inputIdentifier = {
					node: { type:'declaration', value:null },
					children: [{
						node: { type:'Input', value:null },
						children: []
					}]
				};
				if (this.inputBox === undefined) {
					this.inputBox = new Box(inputIdentifier, '#9999ff', this, boxMinWidth, 50);
					this.object3d.add(this.inputBox.object3d);				
				}
				this.inputBox.object3d.position.x = -this.width / 2 + this.inputBox.width / 2;
				this.inputBox.object3d.position.y = this.inputBox.height / 2;
				this.inputBox.object3d.position.z = -this.depth / 2 + this.inputBox.depth / 2;
			};

			this.outputBox;
			this.drawOutputBox = function() {
				var boxMinWidth = 200;
				var outputIdentifier = {
					node: { type:'declaration', value:null },
					children: [{
						node: { type:'Output', value:null },
						children: []
					}]
				};
				if (this.outputBox === undefined) {
					this.outputBox = new Box(outputIdentifier, '#9999ff', this, boxMinWidth, 50);
					this.object3d.add(this.outputBox.object3d);				
				}
				this.outputBox.object3d.position.x = this.width / 2 - this.outputBox.width / 2;
				this.outputBox.object3d.position.y = this.outputBox.height / 2;
				this.outputBox.object3d.position.z = -this.depth / 2 + this.outputBox.depth / 2;
			};

			this.drawPlatformMesh(this.width, this.depth);
			this.drawConstantsBox();
			this.drawInputBox();
			this.drawOutputBox();
			this.drawScopeSign(scopeSignText);
			scene.add(this.object3d);

			this.expText3d;
			this.exp = [];
			this.expLastAst;
			this.drawExp = function() {
				var displayText = '';
				for (var i in this.exp) {
					displayText += ' ' + this.exp[i][1];
				}
				this.object3d.remove(this.expText3d);
				this.expText3d = new Text3d(displayText, 80, '#999');
				this.expText3d.position.y = 250;
				this.object3d.add(this.expText3d);
			};

			this.expPush = function(ast) {
				var expText = ast.node.value ? ast.node.value() : ast.node.type;
				this.exp.push([ast.id, expText]);
				this.expLastAst = ast;
				this.drawExp();
			};

			this.expUnshift = function(ast) {
				var expText = ast.node.value ? ast.node.value() : ast.node.type;
				this.exp.unshift([ast.id, expText]);
				this.expLastAst = ast;
				this.drawExp();
			};

			this.expReduce = function(evalAst, reduceAst) {
				for (var i in this.exp) {
					if (evalAst.id === this.exp[i][0]) {
						this.exp.splice(i);
						var expText = reduceAst.node.value ? reduceAst.node.value() : reduceAst.node.type;
						this.exp.push([reduceAst.id, expText]);
						this.drawExp();
						return;
					}
				}
			};

			this.expClear = function() {
				this.exp = [];
				this.object3d.remove(this.expText3d);
			};

			this.expPushLiteral = function(literal) {
				this.exp.push([-1, literal]);
				this.drawExp();
			};

			this.expUnshiftLiteral = function(literal) {
				this.exp.unshift([-1, literal]);
				this.drawExp();
			};

			this.resetVarBoxOffset = function() {
				this.varBoxOffset = -this.width / 2;
			};

			this.findIdentifierBox = function(identifier) {
				var idName = identifier.children[0].node.type;
				for (var i = 0; i < this.boxes.length; i++) {
					var boxName = this.boxes[i].identifier.children[0].node.type;
					if (idName == boxName) {
						return this.boxes[i];
					}
				}
			};

			this.removeIdentifierBox = function(identifier) {
				var idName = identifier.children[0].node.type;
				for (var i = 0; i < this.boxes.length; i++) {
					var boxName = this.boxes[i].identifier.children[0].node.type;
					if (idName == boxName) {
						var box = this.boxes[i];
						this.boxes.splice(i, 1);
						this.object3d.remove(box.object3d);
					}
				}
			}

			this.addBox = function(identifier, background) {
				var box = new Box(identifier, background, self);
				this.removeIdentifierBox(box.identifier);
				this.boxes.push(box);
				this.object3d.add(box.object3d);
				var totalBoxWidth = 0;
				for (var i in this.boxes) {
					totalBoxWidth += this.boxes[i].width;
				}
				var boxSpacing = 50;
				totalBoxWidth += boxSpacing * (this.boxes.length - 1);

				var boxOffset = this.object3d.position.x - totalBoxWidth / 2;
				for (var i in this.boxes) {
					this.boxes[i].object3d.position.x = boxOffset + this.boxes[i].width / 2;
					this.boxes[i].object3d.position.y = this.boxes[i].height / 2;
					this.boxes[i].object3d.position.z = this.depth / 2 - this.boxes[i].depth / 2;
					boxOffset += this.boxes[i].width + boxSpacing;
				}

				if (totalBoxWidth > this.width) {
					this.drawPlatformMesh(totalBoxWidth, this.depth);
				 	this.drawConstantsBox();
				}
				return box;
			};
		}

		function Text3d(text, size, color) {
			var size = size || 80;
			var color = color || '#ccc';

			var textGeo = new THREE.TextGeometry(text, {
				size: size,
				height: 20,
				curveSegments: 2,
				font: "helvetiker"
			});
			textGeo.computeBoundingBox();
			var centerOffset = -0.5 * ( textGeo.boundingBox.max.x - textGeo.boundingBox.min.x );
			var textMaterial = new THREE.MeshLambertMaterial( { color: color } );
			var textMesh = new THREE.Mesh( textGeo, textMaterial );

			textMesh.position.x = centerOffset;
			textMesh.position.y = 0;
			textMesh.position.z = 0;
			textMesh.rotation.x = 0;
			textMesh.rotation.y = Math.PI * 2;

			textMesh.castShadow = true;
			var text3d = new THREE.Object3D();
			text3d.add(textMesh);
			return text3d;
		};

		var makeTextTexture = function(text, color, fontsize, background, width, height) {
			var bitmap = document.createElement('canvas');
			var g = bitmap.getContext('2d');
			fontsize = fontsize * 1.0 || 35;
			g.font = fontsize + 'px Calibri';
			var textMetrics = g.measureText(text);

			var padding = 20 * 2;
			bitmap.width = textMetrics.width + padding < width ? width : textMetrics.width + padding;
			bitmap.height = height;
			var gx = bitmap.width / 2;
			var gy = bitmap.height / 2;

			g.fillStyle = background;
			g.fillRect(0, 0, bitmap.width, bitmap.height);

			g.fillStyle = color;
			g.font = fontsize + 'px Calibri';
			g.textAlign = 'center';
			g.textBaseline = 'middle';
			g.fillText(text, gx, gy);

			var texture = new THREE.Texture(bitmap);
			texture.needsUpdate = true;
			return texture;
		}

		this.init = function(screenId, screenWidth, screenHeight, stepSpeed) {
			container = document.getElementById(screenId);
			active = true;
			this.setStepSpeed(stepSpeed);

			camera = new THREE.PerspectiveCamera(25, 
				screenWidth / screenHeight, 50, 1e7);
			camera.position.x = 0;
			camera.position.y = 800;
			camera.position.z = 2000;

			scene = new THREE.Scene();
			scene.fog = new THREE.FogExp2(0xcccccc, 0.00005);

			ambientLight = new THREE.AmbientLight(0x222222);
      		scene.add(ambientLight);

			lightFront = new THREE.DirectionalLight(0xffffff, 1.0);
			lightFront.position.set(0, 800, 2000);
			lightFront.castShadow = true;
			scene.add(lightFront);

			lightBack = new THREE.DirectionalLight(0xffffff, 1.0);
			lightBack.position.set(500, 800, -2000);
			lightBack.castShadow = true;
			scene.add(lightBack);

			renderer = new THREE.WebGLRenderer();
			renderer.setClearColor(0xffffff);
			renderer.setSize(screenWidth, screenHeight);
			renderer.shadowMapEnabled = true;
			renderer.shadowMapSoft = true;

			controls = new THREE.TrackballControls(camera, renderer.domElement);
			controls.rotateSpeed = 1.0;
			controls.zoomSpeed = 1.2;
			controls.panSpeed = 0.8;
			controls.noZoom = false;
			controls.noPan = false;
			controls.staticMoving = true;
			controls.dynamicDampingFactor = 0.3;
			controls.keys = [ 65, 83, 68 ];

			container.appendChild(renderer.domElement);
			animate();
		};

		this.resetScene = function(callback) {
			TWEEN.removeAll();
			var obj, i;
			for (i = scene.children.length - 1; i >= 0; i--) {
				obj = scene.children[i];
				if (!(obj instanceof THREE.AmbientLight) && !(obj instanceof THREE.DirectionalLight) && !(obj instanceof THREE.AxisHelper) ) {
					scene.remove(obj);
				}
			}
			module.paused = false;
		};

		this.loadScene = function() {
			module.robot = new Robot(robotMorphModel);
			window.robot = module.robot;
			controls.reset();
			return module.robot;
		};

		this.setStepSpeed = function(stepSpeed) {
			stepWait = 2000 / stepSpeed;
		};

		var animate = function() {
			if (active === false) return;
			requestAnimationFrame(animate);

			animationDelta = clock.getDelta() * 1000;
			if (module.paused === false) {
				animationElapsed += animationDelta;
			}
			controls.update(0.01);
			TWEEN.update(animationElapsed);
			if (module.robot !== undefined) {
				module.robot.update(animationDelta);
			}

			render();
		};

		var render = function() {
			renderer.clear();
			renderer.render(scene, camera);
		};

		this.disable = function() {
			active = false;
		};

		this.enable = function() {
			active = true;
			animate();
		}

		this.loadModels = function(callback) {
			var loader = new THREE.JSONLoader(true);
			loader.load( "/static/scripts/models/robot.js", function(geometry, materials) {
				var morphMaterial = new THREE.MeshPhongMaterial({
					map: THREE.ImageUtils.loadTexture('/static/scripts/models/metal.png'),
					ambient: 0xffffff, 
					color: 0xffffff, 
					specular: 0xffffff, 
					shininess: 50, 
					morphTargets: true, 
					morphNormals: true, 
					side: THREE.DoubleSide
				});
				morphMaterial.shading = THREE.SmoothShading;
				geometry.computeMorphNormals();
				robotMorphModel = new THREE.MorphAnimMesh(geometry, morphMaterial);
				var s = 20;
				robotMorphModel.scale.set(s, s, s);
				robotMorphModel.position.y = 80;
				robotMorphModel.mirroredLoop = true;
				robotMorphModel.castShadow = true;
				robotMorphModel.receiveShadow = true;
				robotMorphModel.mirroredLoop = false;

				if (callback !== undefined) {
					callback();
				}
			});
		};
	};
})(THREE, TWEEN);