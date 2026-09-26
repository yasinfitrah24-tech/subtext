import ast, operator

# We deliberately avoid eval(); use ast for a safe calculator.
def calc(expr: str):
    return ast.literal_eval(expr)
