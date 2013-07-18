window.IRUNAROUND = window.IRUNAROUND || {};
window.IRUNAROUND.GRAPHICS = window.IRUNAROUND.GRAPHICS || {};
window.IRUNAROUND.GRAPHICS.Tree = (function(THREE, TWEEN) {
	'use strict'
	return function() {
		var nodeScale = 200;
		var nodeHeightSpacing = 0.70;
		var nodeWidthSpacing = 1.75;
		var active, container;
		var scene, light, renderer;
		var camera, controls;
		var stepWait = 500;
		var curtween = new TWEEN.Tween();
		var morph;
		var clock = new THREE.Clock();
		var animationDelta = 0;
		var animationElapsed = 0;
		this.paused = false;
		var self = this;

		var animate = function() {
			if (active === false) return;
			requestAnimationFrame(animate);

			animationDelta = clock.getDelta() * 1000;
			animationElapsed += animationDelta;
			// controls.update(0.01);
			TWEEN.update(animationElapsed);
			render();
		};

		var render = function() {
			renderer.clear();
			renderer.render(scene, camera);
		};

		var drawLine = function(x0, y0, z0, x1, y1, z1, color) {
			var lineGeometry = new THREE.Geometry();
			var lineMat = new THREE.LineBasicMaterial({
				color: color, 
				lineWidth: 3 
			});
			var p1 = new THREE.Vector3(x0, y0, z0);
			var p2 = new THREE.Vector3(x1, y1, z1);
			lineGeometry.vertices.push(p1, p2);
			var line = new THREE.Line(lineGeometry, lineMat);
			scene.add(line);
		};

		var drawAxis = function(axisLength) {
			drawLine(-axisLength, 0, 0, axisLength, 0, 0, 0xFF0000);
			drawLine(0, -axisLength, 0, 0, axisLength, 0, 0x00FF00);
			drawLine(0, 0, -axisLength, 0, 0, axisLength, 0x0000FF);
		};

		var makeTextTexture = function(text, color, fontsize, background, width, height) {
			var bitmap = document.createElement('canvas');
			bitmap.width = width;
			bitmap.height = height;
			var gx = bitmap.width / 2;
			var gy = bitmap.height / 2;
			var g = bitmap.getContext('2d');

			g.fillStyle = background;
			g.fillRect(0, 0, width, height);
			g.font = fontsize + 'px Calibri';
			g.textAlign = 'center';
			g.fillStyle = color;
			g.fillText(text, gx, gy);
			var texture = new THREE.Texture(bitmap);
			texture.needsUpdate = true;
			return texture;
		}

		var drawNode = function(id, x, y, text, background) {
			var cubeGeometry = new THREE.CubeGeometry(
				nodeScale, nodeScale / 2, nodeScale / 2
			);
			var textTexture = makeTextTexture(text, '#fff', nodeScale / 8, background, nodeScale, nodeScale / 2);
			var cubeMat = new THREE.MeshLambertMaterial({ map: textTexture });
			var cube = new THREE.Mesh(cubeGeometry, cubeMat);
			cube.castShadow = true;
			cube.receiveShadow = true;
			cube.position.x = x * nodeScale * nodeWidthSpacing;
			cube.position.y = y * -nodeScale * nodeHeightSpacing;
			cube.name = id;
			scene.add(cube);
		};

		var drawTree = function(ast) {
			var text = ast.node ? ast.node.type : '';
			drawNode(ast.id, ast.x, ast.y, text, '#088da5');
			for (var i in ast.children) {
				var child = ast.children[i];
				drawNodeEdge(ast.x, ast.y, child.x, child.y);
				drawTree(child);
			}
		};

		var drawNodeEdge = function(x0, y0, x1, y1) {
			drawLine(x0 * nodeScale * nodeWidthSpacing, 
				y0 * -nodeScale * nodeHeightSpacing, 
				0, x1 * nodeScale * nodeWidthSpacing, 
				y1 * -nodeScale * nodeHeightSpacing, 
				0, '#000'
			);
		};

		this.init = function(screenId, screenWidth, screenHeight, stepSpeed) {
			container = document.getElementById(screenId);
			active = true;
			this.setStepSpeed(stepSpeed);

			camera = new THREE.PerspectiveCamera(25, 
				screenWidth / screenHeight, 50, 1e7);
			camera.position.x = 0;
			camera.position.y = 0;
			camera.position.z = 0;

			scene = new THREE.Scene();

			light = new THREE.DirectionalLight(0xffffff, 1.0);
			light.position.set(0, 0, 0);
			light.castShadow = true;
			scene.add(light);

			renderer = new THREE.WebGLRenderer();
			renderer.setClearColor(0xFFFFFF);

			renderer.setSize(screenWidth, screenHeight);
			renderer.shadowMapEnabled = true;
			
			// controls = new THREE.FlyControls(camera, renderer.domElement);
			// controls.movementSpeed = 1000;
			// controls.rollSpeed = Math.PI / 8;
			// controls.autoForward = false;
			// controls.dragToLook = true;

			container.appendChild(renderer.domElement);
			animate();
		};

		this.resetScene = function() {
			TWEEN.removeAll();
			var obj, i;
			for (i = scene.children.length - 1; i >= 0; i--) {
				obj = scene.children[i];
				if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
					scene.remove(obj);
				}
			}
		};

		this.loadScene = function(ast) {
			drawTree(ast);
			var node = scene.getObjectByName('1');
			if (node) {
				curtween.stop();
				curtween = new TWEEN.Tween(camera.position)
				.to({ 
						x: node.position.x, 
				  		y: node.position.y - 1000, 
				  		z: node.position.z + 5000 
					}, 3000
				).onUpdate(function() {
					light.position = camera.position;
					light.target.position = node.position;
				}).easing(TWEEN.Easing.Cubic.Out).start(animationElapsed);
			}
		};

		this.editNode = function(nodeId, text, background) {
			var node = scene.getObjectByName(nodeId);
			if (node === undefined) return;

			var texture = makeTextTexture(text, '#fff', nodeScale / 8, background, nodeScale, nodeScale / 2);
			node.material.map = texture;
			curtween.stop();
			curtween = new TWEEN.Tween(camera.position)
				.to({ 
					x: node.position.x, 
			  		y: node.position.y, 
			  		z: node.position.z + 2000 
				}, stepWait
			).onStart(function() {

			}).onUpdate(function() {
				light.position = camera.position;
				light.target.position = node.position;
			}).easing(TWEEN.Easing.Cubic.Out).start(animationElapsed);
		};

		this.setStepSpeed = function(stepSpeed) {
			stepWait = 2000 / stepSpeed;
		};

		this.disable = function() {
			active = false;
		};

		this.enable = function() {
			active = true;
			animate();
		}
	};
})(THREE, TWEEN);