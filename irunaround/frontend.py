import sys
sys.path.insert(0, '../')

import ply.lex as lex
import ply.yacc as yacc
from pymag_trees.buchheim import buchheim_layout
from pymag_trees.gen import Tree

import ctokens
import cgrammar

def lexer(text):
	clexer = lex.lex(module=ctokens)
	clexer.input(text)
	result = []
	tok = clexer.token()
	while tok != None:
	    result.append(tok.value)
	    tok = clexer.token()
	return result

count = 0
def drawtree(text):
  global count
  count = 0
  text = '\n'.join(text.splitlines())
  cparser = yacc.yacc(module=cgrammar, write_tables=0, debug=0) 
  clexer = lex.lex(module=ctokens)
  parse_tree = cparser.parse(text, lexer=clexer, tracking=False, debug=False)
  draw_tree = buchheim_layout(parse_tree)
  flat_tree = flattenTree(draw_tree)
  return flat_tree

def flattenTree(dt):
  global count
  count += 1
  return {
    'id': str(count),
    'node': dt.tree.node,
    'x': dt.x, 
    'y': dt.y, 
    'children':[flattenTree(c) for c in dt.children]
  }

#DEBUG & testing =')

# text = ''' #include<stdio.h>

# int fact(int n) {
#   if (n < 2) {
#     return 1;
#   } else {
#     return fact(n - 1) * n;
#   }
# }

# fact(4); '''
# cparser = yacc.yacc(module=cgrammar, write_tables=0, debug=0) 
# clexer = lex.lex(module=ctokens)
# parse_tree = cparser.parse(text, lexer=clexer, tracking=False, debug=False)
# print parse_tree.children[0].node