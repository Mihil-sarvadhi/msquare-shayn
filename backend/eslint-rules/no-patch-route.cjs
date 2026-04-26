module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow PATCH routes. Use PUT for updates.' },
    messages: { usePut: "Use .put() instead of .patch(). PATCH routes are not allowed." },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'patch') {
          context.report({ node, messageId: 'usePut' });
        }
      },
    };
  },
};
