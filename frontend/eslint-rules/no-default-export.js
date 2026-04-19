'use strict';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow default exports (use named exports)', recommended: false },
    schema: [],
    messages: { noDefault: 'Use named exports instead of default exports.' },
  },
  create(context) {
    return {
      ExportDefaultDeclaration(node) {
        context.report({ node, messageId: 'noDefault' });
      },
    };
  },
};
