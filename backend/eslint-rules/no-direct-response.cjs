module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow direct res.json/send/status in controllers. Use handleApiResponse().' },
    messages: { useHandleApiResponse: "Use handleApiResponse() instead of res.{{method}}()." },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression') return;
        const obj = node.callee.object;
        const prop = node.callee.property;
        if (obj.type === 'Identifier' && obj.name === 'res' &&
            prop.type === 'Identifier' && ['json', 'send', 'status'].includes(prop.name)) {
          context.report({ node, messageId: 'useHandleApiResponse', data: { method: prop.name } });
        }
      },
    };
  },
};
