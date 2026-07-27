/**
 * Standard success envelope so every endpoint returns a consistent shape:
 * { success, message, data, meta? }
 */
function ok(res, { data = null, message = 'Success', meta = undefined, status = 200 } = {}) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

function created(res, payload = {}) {
  return ok(res, { ...payload, status: 201, message: payload.message || 'Created' });
}

module.exports = { ok, created };
