'use strict';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow raw useSelector/useDispatch; require useAppSelector/useAppDispatch', recommended: false },
    schema: [],
    messages: { noRaw: 'Use useAppSelector/useAppDispatch from @store/hooks instead of raw {{name}}.' },
  },
  create(context) {
    const banned = new Set(['useSelector', 'useDispatch']);
    return {
      ImportSpecifier(node) {
        if (
          banned.has(node.imported.name) &&
          node.parent.source.value === 'react-redux'
        ) {
          context.report({ node, messageId: 'noRaw', data: { name: node.imported.name } });
        }
      },
    };
  },
};
