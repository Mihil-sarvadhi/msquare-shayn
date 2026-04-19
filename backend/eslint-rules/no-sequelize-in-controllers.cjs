module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow direct Sequelize/model imports in controllers. Use services.' },
    messages: { useService: "Do not import Sequelize models or sequelize directly in controllers. Call a service instead." },
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source === 'string' &&
            (source.includes('@db/') || source.includes('/models/') || source === 'sequelize')) {
          context.report({ node, messageId: 'useService' });
        }
      },
    };
  },
};
