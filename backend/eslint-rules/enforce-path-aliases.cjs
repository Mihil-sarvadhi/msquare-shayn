module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow deep relative imports. Use path aliases instead.' },
    messages: {
      usePathAlias: "Use path alias (e.g., @modules/, @utils/) instead of deep relative import '{{path}}'.",
    },
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source === 'string' && source.startsWith('../../')) {
          context.report({ node, messageId: 'usePathAlias', data: { path: source } });
        }
      },
    };
  },
};
