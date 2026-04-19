'use strict';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow deep relative imports (../../); require path aliases', recommended: false },
    schema: [],
    messages: { noDeep: 'Use path aliases (e.g. @/components/) instead of deep relative imports.' },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (typeof node.source.value === 'string' && node.source.value.startsWith('../..')) {
          context.report({ node, messageId: 'noDeep' });
        }
      },
    };
  },
};
