/**
 * Request validation middleware backed by Zod. Pass a schema describing any of
 * { body, query, params }; validated/coerced values replace the originals.
 */
const ApiError = require('../utils/ApiError');

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.slice(1).join('.'),
      message: i.message,
    }));
    return next(ApiError.badRequest('Validation failed', details));
  }

  // Replace request parts with parsed/coerced values where present.
  if (result.data.body) req.body = result.data.body;
  if (result.data.query) Object.assign(req.query, result.data.query);
  if (result.data.params) req.params = result.data.params;
  next();
};

module.exports = validate;
