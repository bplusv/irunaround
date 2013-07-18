(function() {
	'use strict'
	$(function() {
		var initialStepSpeed = 10;

		window.mainApp = new IRUNAROUND.Main();
		mainApp.init('loadingScreen', 'dataInputContainer', 'dataOutputContainer', 'editor', 'world-graphics', 'tree-graphics', 640, 360, initialStepSpeed);
		mainApp.setWorldView();
		mainApp.on('finished', function() {
			$('#playButton').hide();
			$('#pauseButton').hide();
		});

		$('#tabs').tabs({ 
			active: 1,
			activate: function(e, ui) {
				switch (ui.newPanel.attr('id')) {
					case 'tabs-tree':
						mainApp.setTreeView();
					break;
					case 'tabs-world':
						mainApp.setWorldView();
					break;
				}
			} 
		});
	    $('.tabs-bottom .ui-tabs-nav, .tabs-bottom .ui-tabs-nav > *')
			.removeClass('ui-corner-all ui-corner-top')
			.addClass('ui-corner-bottom');
	    $('.tabs-bottom .ui-tabs-nav').appendTo('.tabs-bottom');

		$('#stepSpeed').slider({
			min: 5,
			max: 35,
			range: 'min',
			value: initialStepSpeed,
			slide: function(e, ui) {
				mainApp.setStepSpeed(ui.value);
			}
		});

		$('#codeForm').on('submit', function(e) {
			e.preventDefault();
			var $this = $(this);
			mainApp.editor.save();

			if (mainApp.state === mainApp.AppStates.Editing) {
				$.ajax({
					type: "POST",
					url: $this.attr('action'),
					data: $this.serialize() + '\nmain();',
				}).done(function(response) {
					mainApp.parse(response);
					$('#pauseButton').show();
					$('#editButton').show();
					$('#codeExamples').buttonset("disable");
				}).fail(function() {
					mainApp.edit();
					$('#playButton').show();
					$('#pauseButton').hide();
					$('#editButton').hide();
				});
			} else if (mainApp.state === mainApp.AppStates.Paused) {
				mainApp.play();
				$('#pauseButton').show();
				$('#editButton').show();
				$('#playButton').hide();
			}
		});

		$('#dataInputForm').on('submit', function(e) {
			e.preventDefault();
			var $this = $(this);
			var $input = $('#dataInput');
			if ($input.val() !== '') {
				mainApp.setDataInput();
				$('#dataInput').val('');
			}
		});

		$('#playButton').button(
			{icons: {primary: "ui-icon-play"}}
		).on('click', function() {
			$('#playButton').hide();
			mainApp.editor.disableEditing();
			$('#codeForm').submit();
		});

		$('#pauseButton').button(
			{icons: {primary: "ui-icon-pause"}}
 		).on('click', function() {
			mainApp.pause();
			$('#playButton').show();
			$(this).hide();
		}).hide();

		$('#editButton').button(
			{icons: {primary: "ui-icon-pencil"}}
		).on('click', function() {
				mainApp.edit();
				$('#codeExamples').buttonset("enable");
				$('#playButton').show();
				$('#pauseButton').hide();
				$(this).hide();
		}).hide();

		$('#dataInputButton').button({ disabled: true });

		var code1 = '#include <stdio.h>\n\n' +
		'int main() {\n' +
		'  float a = 5.5;\n' +
		'  int b = 6;\n' +
		'  int c = 3;\n' +
		'  float d = 1.5;\n' +
		'  float x = 0;\n\n' +
		'  x = a + b - a + c * c / d;\n' +
		'  printf("Sin parentesis: %f\\n", x);\n' +
		'  x = (a + b - a + c) * c / d;\n' +
		'  printf("Con parentesis: %f\\n", x);\n' +
		'  return 0;\n' +
		'}';

		var code2 = '#include <stdio.h>\n\n' +
		'int x = 0;\n' +
		'int y = 0;\n' +

		'int main() {\n' +
		'  scanf("%d", &x);\n' +
		'  scanf("%d", &y);\n' +
		'  if (x == y) {\n' +
		'    printf("x es igual que y");\n' +
		'  } else {\n' +
		'    if (x > y) {\n' +
		'      printf("x es mayor que y");\n' +
		'    } else {\n' +
		'      printf("x es menor que y");\n' +
		'    }\n' +
		'  }\n' +
		'  return 0;\n' + 
		'}';

		var code3 =' #include <stdio.h>\n\n' +
		'int cont = 1;\n\n' +
		'int main() {\n' +
		'  while (cont <= 5) {\n' +
		'    if (cont % 2 == 0) {\n' +
		'      printf("%d es par\\n", cont);\n' +
		'    } else {\n' +
		'      printf("%d es impar\\n", cont);\n' +
		'    }\n' +
		'    cont = cont + 1;\n' +
		'  }\n' +
		'  return 0;\n' +
		'}';


		var code4 = '#include <stdio.h>\n\n' +
		'float radio = 0;\n' +
		'float resultado = 0;\n\n' +
		'float area_circulo(float radio) {\n' +
		'  float pi = 3.1416;\n' +
		'  return  pi * radio * radio;\n' +
		'}\n\n' +
		'int main() {\n' +  
		'  scanf("%f", &radio);\n' +
		'  resultado = area_circulo(radio);\n' +
		'  printf("%f", resultado);\n' +
		'  return 0;\n' +
		'}';

		var code5 = '#include <stdio.h>\n\n' +
		'int factorial(int n) {\n' +
		'  if (n <= 1) {\n' +
		'    return 1;\n' +
		'  } else {\n' +
		'    return n * factorial(n - 1);\n' +
		'  }\n' +
		'}\n\n' +
		'int main() {\n' +
		'  int entrada = 0;\n' +
		'  scanf("%d", &entrada);\n' +
		'  int res = factorial(entrada);\n' +
		'  printf("%d", res);\n' +
		'  return 0;\n' +
		'}';

		var code6 = '#include <stdio.h>\n\n' +
		'int fib(int n) {\n' +
		'  if (n <= 2) {\n' +
		'    return 1;\n' +
		'  } else {\n' +
		'    return fib(n - 1) + fib(n - 2);\n' +
		'  }\n' +
		'}\n\n' +
		'int main() {\n' +
		'  int entrada = 0;\n' +
		'  scanf("%d", &entrada);\n' +
		'  int resultado = fib(entrada);\n' +
		'  printf("%d", resultado);\n' +
		'  return 0;\n' +
		'}';


		$('#codeExamples').buttonset();
		$('#codeExample1').on('click', function() {
			mainApp.editor.setValue(code1);
		});
		$('#codeExample2').on('click', function() {
			mainApp.editor.setValue(code2);
		});
		$('#codeExample3').on('click', function() {
			mainApp.editor.setValue(code3);
		});
		$('#codeExample4').on('click', function() {
			mainApp.editor.setValue(code4);
		});
		$('#codeExample5').on('click', function() {
			mainApp.editor.setValue(code5);
		});
		$('#codeExample6').on('click', function() {
			mainApp.editor.setValue(code6);
		});

		$('#inputArrow').hide();
		mainApp.editor.setValue(code1);
	});
})(IRUNAROUND);