import sys
sys.path.insert(0, '../')

import ply.yacc as yacc
from ctokens import tokens
from pymag_trees.gen import Tree

def span(p, start, end):
    if isinstance(p[start], Tree):
        s = p[start].node['span'][0]
    else:
        s = p.lexpos(start)
    if isinstance(p[end], Tree):
        e = p[end].node['span'][1]
    else:
        e = p.lexpos(end) + len(p[end])
    return [s, e]

def Node(type="", span=[-1, -1]):
    return {
        'type': type,  
        'span': span,
        'value': None
    }

start = 'trans_unit' 
precedence = (
    ('left', 'OROR'), 
    ('left', 'ANDAND'), 
    ('left', 'EQUALEQUAL'), 
    ('left', 'LT', 'LE', 'GT', 'GE'),
    ('left', 'PLUS', 'MINUS'), 
    ('left', 'TIMES', 'DIVIDE', 'MOD'), 
    ('right', 'NOT'),
    ('nonassoc', 'LOWER_THAN_ELSE') ,
    ('nonassoc', 'ELSE'),
)

def p_trans_unit(p): 
    'trans_unit : element trans_unit'
    p[0] = Tree(Node('trans_unit'), 
                p[1], p[2])

def p_trans_unit_empty(p):
    'trans_unit : element'
    p[0] = Tree(Node('trans_unit'),
                p[1])

def p_element_stmt(p):
    'element : stmt'
    p[0] = p[1]

def p_element_function(p):
    'element : type identifier LPAREN optparams RPAREN compoundstmt'
    p[0] = Tree(Node('function'), 
                p[1], p[2], p[4], p[6])

def p_identifier(p):
    'identifier : IDENTIFIER'
    p[0] = Tree(Node('identifier', span(p, 1, 1)),
                Tree(Node(p[1], span(p, 1, 1))))

def p_reference(p):
    'reference : AND IDENTIFIER'
    p[0] = Tree(Node('reference', span(p, 1, 2)),
                Tree(Node(p[2], span(p, 2, 2))))

def p_type(p):
    '''type : INT
            | CHAR
            | FLOAT
            | VOID'''
    p[0] = Tree(Node('type', span(p, 1, 1)),
                Tree(Node(p[1], span(p, 1, 1))))


def p_optparams(p):
    'optparams : params'
    p[0] = p[1]

def p_optparams_empty(p):
    'optparams : '
    p[0] = Tree(Node('params'))

def p_params_one(p):
    'params : param'
    p[0] = Tree(Node('params'), 
                p[1])

def p_params_comma(p):
    'params : param COMMA params'
    p[0] = Tree(Node('params'), 
                p[1], p[3])

def p_param(p):
    'param : type identifier'
    p[0] = Tree(Node('param'), 
                p[1], p[2])



def p_compoundstmt(p):
    'compoundstmt : LBRACE stmts RBRACE'
    p[0] = p[2]

def p_stmts(p):
    'stmts : stmt stmts'
    p[0] = Tree(Node('stmts'), 
                p[1], p[2])

def p_stmts_one(p):
    'stmts : stmt'
    p[0] = Tree(Node('stmts'),
                p[1])

def p_stmt_or_compound(p):
    'stmt_or_compound : stmt'
    p[0] = Tree(Node('stmts'),
                p[1])

def p_stmt_or_compound_c(p):
    'stmt_or_compound : compoundstmt'
    p[0] = p[1]


def p_optsemi_none(p):
    'optsemi : '
    p[0] = Tree(Node())

def p_optsemi_some(p):
    'optsemi : SEMICOLON'
    p[0] = Tree(Node())

def p_stmt_estmt(p):
    'stmt : estmt'
    p[0] = Tree(Node('stmt'),
                p[1])


def p_stmt_if(p):
    'estmt : IF exp stmt_or_compound optsemi %prec LOWER_THAN_ELSE'
    p[0] = Tree(Node('if-then'), 
                p[2], p[3])

def p_stmt_while(p):
    'estmt : WHILE exp compoundstmt optsemi'
    p[0] = Tree(Node('while'), 
                p[2], p[3])

def p_stmt_if_else(p):
    'estmt : IF exp compoundstmt ELSE stmt_or_compound optsemi'
    p[0] = Tree(Node('if-then-else'), 
                p[2], p[3], p[5])

def p_stmt_declaration(p):
    'estmt : type identifier EQUAL exp optsemi'
    p[0] = Tree(Node('declaration', span(p, 1, 4)), 
                p[1], p[2], Tree(Node(p[3], span(p, 3, 3))), p[4])

def p_stmt_assigment(p):
    'estmt : identifier EQUAL exp optsemi' 
    p[0] = Tree(Node('assign', span(p, 1, 3)), 
                p[1], Tree(Node(p[2], span(p, 2, 2))), p[3])

def p_stmt_return(p):
    'estmt : RETURN exp optsemi'
    p[0] = Tree(Node('return', span(p, 1, 2)), 
                p[2])

def p_stmt_exp(p):
    'estmt : exp optsemi'
    p[0] = p[1]


def p_exp_eexp(p):
    'exp : eexp'
    p[0] = Tree(Node('exp', span(p, 1, 1)),
                p[1])

def p_exp_identifier(p): 
    'eexp : identifier'
    p[0] = p[1]

def p_exp_reference(p): 
    'eexp : reference'
    p[0] = p[1]

def p_exp_paren(p): 
    'exp : LPAREN exp RPAREN'
    p[0] = p[2]

def p_exp_number(p):
    'eexp : NUMBER'
    p[0] = Tree(Node('number', span(p, 1, 1)), 
                Tree(Node(p[1], span(p, 1, 1))))

def p_exp_string(p):
    'eexp : STRING'
    p[0] = Tree(Node('string', span(p, 1, 1)), 
                Tree(Node(p[1])))

def p_exp_true(p):
    'eexp : TRUE'
    p[0] = Tree(Node('boolean', span(p, 1, 1)), 
            Tree(Node(p[1])))

def p_exp_false(p):
    'eexp : FALSE'
    p[0] = Tree(Node('boolean', span(p, 1, 1)), 
            Tree(Node(p[1])))

def p_exp_not(p):
    'eexp : NOT exp'
    p[0] = Tree(Node('not'), 
                p[2])



def p_exp_binop(p):
    '''eexp : exp PLUS exp
           | exp MINUS exp
           | exp TIMES exp
           | exp MOD exp
           | exp DIVIDE exp
           | exp EQUALEQUAL exp
           | exp LE exp
           | exp LT exp
           | exp GE exp
           | exp GT exp
           | exp ANDAND exp
           | exp OROR exp'''
    p[0] = Tree(Node('binop', span(p, 1, 3)), 
                p[1], Tree(Node(p[2], span(p, 2, 2))), p[3])

def p_exp_call(p):
    'eexp : identifier LPAREN optargs RPAREN'
    p[0] = Tree(Node('call', span(p, 1, 4)), 
                p[1], p[3])

def p_optargs(p):
    'optargs : args'
    p[0] = p[1]

def p_optargs_empty(p):
    'optargs : '
    p[0] = Tree(Node('args'))

def p_args_comma(p):
    'args : arg COMMA args'
    p[0] = Tree(Node('args'), 
                p[1], p[3])

def p_args_one(p):
    'args : arg'
    p[0] = Tree(Node('args'), 
            p[1])

def p_arg(p):
    'arg : exp'
    p[0] = Tree(Node('arg', span(p, 1, 1)), 
            p[1])

def p_error(p):
    pass