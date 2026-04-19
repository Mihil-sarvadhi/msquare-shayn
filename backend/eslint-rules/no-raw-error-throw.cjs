module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow throwing raw Error. Use AppError from @utils/appError.' },
    messages: { useAppError: "Use 'throw new AppError(...)' instead of 'throw new {{name}}()'." },
    schema: [],
  },
  create(context) {
    const builtinErrors = ['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError'];
    return {
      ThrowStatement(node) {
        if (node.argument?.type === 'NewExpression' &&
            node.argument.callee.type === 'Identifier' &&
            builtinErrors.includes(node.argument.callee.name)) {
          context.report({ node, messageId: 'useAppError', data: { name: node.argument.callee.name } });
        }
      },
    };
  },
};
