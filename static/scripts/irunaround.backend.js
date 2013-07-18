window.IRUNAROUND = window.IRUNAROUND || {};
window.IRUNAROUND.Backend = (function() {
	'use strict'
	return function() {
		var ast;
		var path = [];
		var funstack = [];
		var env = {
			'parent': undefined, 
			'values': {
				'printf output': '',
				'scanf input': null
			}
		};

		var FuncDec = function(fname, ast, env) {
			this.fname = fname;
			this.ast = ast;
			this.env = env;
		};

		FuncDec.prototype.toString = function() {
			return 'function: ' + this.fname;
		};
		this.FuncDec = FuncDec;

		var pushPath = function(pathlist) {
			for (var i in pathlist) {
				path.push(pathlist[i]);
			}
		};

		var unshiftPath = function(pathlist) {
			for (var i = pathlist.length - 1; i >= 0; i--) {
				path.unshift(pathlist[i]);
			}
		};

		var depthWalk = function(ast) {
			var result = [];
			var nodes = [];
			nodes.push(ast);
			while (nodes.length > 0) {
				var cur = nodes.pop();
				switch (cur.node.type) {
					case 'declaration':
					case 'assign':
						for (var i = cur.children.length - 1; i >= 0; i--) {
							nodes.push(cur.children[i]);
						}
						result.unshift(cur);
					break;
					case 'if-then':
					case 'if-then-else':
					case 'while':
						nodes.push(cur.children[0]);
						result.unshift(cur);
					break;
					case 'call':
						nodes.push(cur.children[0]);
						var args = breadthWalk(cur.children[1]);
						for (var i in args) {
							nodes.push(args[i]);
						}
						result.unshift(cur);
					break;
					default:
						for (var i = 0; i < cur.children.length; i++) {
							nodes.push(cur.children[i]);
						}
						result.unshift(cur);
					break;
				}
			}
			return result;
		};

		var breadthWalk = function(ast) {
			var result = [];
			var nodes = [];
			nodes.push(ast);
			while (nodes.length > 0) {
				var cur = nodes.pop();
				var lchild = cur.children[0];
				var rchild = cur.children[1];
				if (lchild && lchild.node.type) {
					result.push(lchild);
				}
				if (rchild) {
					nodes.push(rchild);
				}
			}
			return result;
		};
		this.breadthWalk = breadthWalk;

		var envLookup = function(vname, env) {
			if (vname === 'printf' || vname === 'scanf') {
				return new FuncDec(vname);
			}

			if (env.values[vname] !== undefined) {
				return env.values[vname];
			} else if (env.parent === undefined) {
				return undefined;
			} else {
				return envLookup(vname, env.parent);
			}
		};
		this.envLookup = envLookup;

		var envUpdate = function(vname, value, env) {
			if (env.values[vname] !== undefined) {
				env.values[vname] = value;
			} else if (env.parent !== undefined) {
				envUpdate(vname, value, env.parent)
			}
		};

		var evalNode = function(ast) {
			switch (ast.node.type) {

				// Elements

				case 'function':
					var fname = ast.children[1].children[0].node.type;
					env.values[fname] = new FuncDec(fname, ast, env);
				break;

				case 'stmt':
					var stmt = depthWalk(ast.children[0]);
					unshiftPath(stmt);
				break;

				// Statements

				case 'if-then':
					if (ast.children[0].node.value() === true) {
						var thenstmts = breadthWalk(ast.children[1]);
						unshiftPath(thenstmts);
					}
				break;

				case 'if-then-else':
					if (ast.children[0].node.value() === true) {
						var thenstmts = breadthWalk(ast.children[1]);
						unshiftPath(thenstmts);
					} else {
						var elsestmts = breadthWalk(ast.children[2]);
						unshiftPath(elsestmts);
					}
				break;

				case 'while':
					if (ast.children[0].node.value() === true) {
						var condstmts = depthWalk(ast);
						unshiftPath(condstmts);
						var whilestmts = breadthWalk(ast.children[1]);
						unshiftPath(whilestmts);
					}
				break;

				case 'return':
					var retval = ast.children[0].node.value();
					var ret = funstack.pop();
					var retast = ret[0];
					path = ret[1];
					env = ret[2];
					env.values['call ' + retast.id] = retval;
					retast.node.value = function() {
						return envLookup('call ' + retast.id, env);
					}
				break;

				case 'exp':
					ast.node.value = ast.children[0].node.value;
				break;

				case 'declaration':
					var varname = ast.children[1].children[0].node.type;
					env.values[varname] = ast.children[3].node.value();
					ast.node.value = function() {
						return varname + ' = ' + env.values[varname];
					};
				break;

				case 'assign':
					var varname = ast.children[0].children[0].node.type;
					var varval = ast.children[2].node.value();
					envUpdate(varname, varval, env);
					ast.node.value = function() {
						return varname + ' = ' + envLookup(varname, env);
					};
				break;

				case 'arg':
					ast.node.value = ast.children[0].node.value;
				break;

				// Expressions

				case 'number':
					ast.node.value = function() {
						return parseFloat(ast.children[0].node.type);
					}
				break;

				case 'string':
					ast.node.value = function() {
						return ast.children[0].node.type;
					};
				break;

				case 'boolean':
					ast.node.value = function() {
						return ast.children[0].node.type === 'true';
					};
				break;

				case 'not':
					ast.node.value = function() {
						return !ast.children[0].node.value();
					};
				break;

				case 'identifier':
					var idname = ast.children[0].node.type;
					ast.node.value = function() {
						return envLookup(idname, env);
					};
				break;

				case 'reference':
					var idname = ast.children[0].node.type;
					ast.node.value = function() {
						return idname;
					};
				break;

				case 'binop':
					var op = ast.children[1].node.type;
					var lexp = ast.children[0].node.value();
					var rexp = ast.children[2].node.value();

					switch (op) {
						case '+':
							ast.node.value = function() {
								if (typeof lexp === 'string' && typeof rexp === 'string') {
									return '"' + lexp.slice(1,-1) + rexp.slice(1,-1) + '"';
								}
								return lexp + rexp;
							};
						break;
						case '-':
							ast.node.value = function() {
								return lexp - rexp;
							};
						break;
						case '*':
							ast.node.value = function() {
								return lexp * rexp;
							};
						break;
						case '/':
							ast.node.value = function() {
								return lexp / rexp;
							};
						break;
						case '%':
							ast.node.value = function() {
								return lexp % rexp;
							};
						break;
						case '==':
							ast.node.value = function() {
								return lexp == rexp;
							};
						break;
						case '<=':
							ast.node.value = function() {
								return lexp <= rexp;
							};
						break;
						case '<':
							ast.node.value = function() {
								return lexp < rexp;
							}
						break;
						case '>=':
							ast.node.value = function() {
								return lexp >= rexp;
							};
						break;
						case '>':
							ast.node.value = function() {
								return lexp > rexp;
							};
						break;
						case '&&':
							ast.node.value = function() {
								return lexp && rexp;
							};
						break;
						case '||':
							ast.node.value = function() {
								return lexp || rexp;
							};
						break;
					}
				break;

				case 'call':
					var funname = ast.children[0].children[0].node.type;
					var args = breadthWalk(ast.children[1]);
					switch (funname) {
						case 'printf':
							var argFormat = args[0].node.value();
							var outputString = argFormat;

							if (args[1] !== undefined) {
								var argVal = args[1].node.value();
								outputString = outputString.replace('%d', parseInt(argVal));
								outputString = outputString.replace('%c', String(argVal));
								outputString = outputString.replace('%s', String(argVal));
								outputString = outputString.replace('%f', parseFloat(argVal));
							}

							ast.node.value = function() {
								return outputString;
							};

							var outputsofar = envLookup('printf output', env);
							outputsofar = outputsofar + outputString.slice(1,-1);
							envUpdate('printf output', outputsofar, env);
						break;
						case 'scanf':
							/* wait for user input and callback setDataInput(varname, dataInput); */
						break;
						default:
							funstack.push([ast, path, env]);
							path = [];
							var fundec = ast.children[0].node.value();
							var funast = fundec.ast;
							var funenv = fundec.env;
							var funparams = breadthWalk(funast.children[2]);
							var funstmts = breadthWalk(funast.children[3]);
							pushPath(funparams);

							var newenv = { 'parent': funenv, 'values': {} }
							for (var i in args) {
								var paramid = funparams[i].children[1].children[0].node.type;
								var argval = args[i].node.value();
								newenv.values[paramid] = argval;
							}
							pushPath(funstmts);
							env = newenv;
						break;
					}
				break;
			}
		};

		this.init = function(parsedAst) {
			ast = parsedAst;
			env = {
				'parent': undefined, 
				'values': {
					'printf output': ''
				}
			};
			path = [];
			var elements = breadthWalk(ast);
			pushPath(elements);
		};

		this.reset = function() {
			ast = undefined;
			env = {
				'parent': undefined, 
				'values': {
					'printf output': ''
				}
			};
			path = [];
		};

		this.getDataOutput = function() {
			return envLookup('printf output', env);
		};

		this.setDataInput = function(identifier, dataInput) {
			var varname = identifier.children[0].node.type;
			var dataInput = dataInput || null;
			envUpdate(varname, dataInput, env);
		};

		this.getEnv = function() {
			return env;
		};

		this.peek = function() {
			return path[0];
		};

		this.getIdentifierValue = function(identifier) {
			var idname = identifier.children[0].node.type;
			return envLookup(idname, env);
		};

		this.step = function() {
			var node = path.shift();
			if (node !== undefined) {
				evalNode(node);
				return node;
			}
		};
	};
})();