from functools import reduce
from lark import Lark
from lark import Visitor
from lark import Transformer
from lark.visitors import v_args


class SystemTemplateParser:
    def __init__(self) -> None:
        self.grammar = """
            template: ("{{" sum "}}" | str )*
            ?sum: product
                | sum "+" product   -> add
                | sum "-" product   -> sub

            ?product: atom
                | product "*" atom  -> mul
                | product "/" atom  -> div

            ?atom: NUMBER          -> number
                | "-" atom         -> neg
                | NAME             -> var
                | const            -> const
                | NAME "." NAME "(" func_args? ")" -> func
                | "&nbsp;" atom
                | atom "&nbsp;"
                | "(" sum ")"

            ?func_args: (func_arg ",")* func_arg
            ?func_arg: NAME "=" sum

            ?str: inline_text+ -> text
            ?const: /"[^"]*"/
            ?inline_text:  /[^\{\}]+/ | "{" inline_text | "}" inline_text

            %import common.CNAME -> NAME
            %import common.NUMBER
            %import common.WS_INLINE

            %ignore WS_INLINE
        """
        self.parser = Lark(self.grammar, start='template', parser='lalr')

    def parse_template(self, template: str, graph: "DialogGraph", bst: dict):
        # parse & analyze template
        parse_tree = self.parser.parse(template)

        # fill in constants, evaluate variables + functions
        return ValueTransformer(graph, bst).transform(parse_tree)

    def find_variables(self, template: str):
        # parse & analyze template
        parse_tree = self.parser.parse(template)
        # print(parse_tree.pretty())
        
        finder = VariableFinder()
        finder.visit(parse_tree)
        return finder.var_table


class VariableFinder(Visitor):
    def __init__(self) -> None:
        super().__init__()
        self.var_table = set()

    def var(self, tree):
        self.var_table.add(tree.children[0].value)

@v_args(inline=True)
class ValueTransformer(Transformer):
    from operator import add, sub, mul, truediv as div, neg

    def __init__(self, graph: "DialogGraph", bst: dict):
        self.graph = graph
        self.bst = bst

    def var(self, name):
        return self.bst[name]

    def func(self, table_name, func_name, func_args):
        results = self.graph.get_data_table_values(table_name.value, func_args, return_columns=[func_name.value])
        # TODO how to handle multiple results?
        return results[0][func_name]

    def func_args(self, *args):
        return reduce(lambda d1, d2: d1 | d2, args)

    def func_arg(self, name, value):
        return {name.value: value}

    def number(self, num):
        return float(num)

    def text(self, content):
        return content.value

    def const(self, content):
        return content.value

    def template(self, *args):
        return " ".join([str(arg).strip() for arg in args])

