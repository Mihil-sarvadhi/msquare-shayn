module.exports = {
  rules: {
    'no-raw-error-throw': require('./no-raw-error-throw.cjs'),
    'no-direct-response': require('./no-direct-response.cjs'),
    'no-patch-route': require('./no-patch-route.cjs'),
    'enforce-path-aliases': require('./enforce-path-aliases.cjs'),
    'no-sequelize-in-controllers': require('./no-sequelize-in-controllers.cjs'),
  },
};
