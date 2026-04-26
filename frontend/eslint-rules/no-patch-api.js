'use strict';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow PATCH HTTP method in API calls', recommended: false },
    schema: [],
    messages: { noPatch: 'Use PUT instead of PATCH for API updates.' },
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.property.type === 'Identifier' &&
          node.property.name === 'patch' &&
          node.object.type === 'Identifier' &&
          ['apiService', 'baseService', 'axios'].includes(node.object.name)
        ) {
          context.report({ node, messageId: 'noPatch' });
        }
      },
    };
  },
};
