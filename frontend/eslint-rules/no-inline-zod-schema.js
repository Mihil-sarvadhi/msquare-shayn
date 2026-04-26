'use strict';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow inline Zod schema definitions in component files', recommended: false },
    schema: [],
    messages: { noInline: 'Define Zod schemas in src/utils/validations/index.ts, not inline.' },
  },
  create(context) {
    const filename = context.getFilename();
    const isComponentFile = /\.(tsx)$/.test(filename) && !filename.includes('validations');
    if (!isComponentFile) return {};
    return {
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'z'
        ) {
          context.report({ node, messageId: 'noInline' });
        }
      },
    };
  },
};
