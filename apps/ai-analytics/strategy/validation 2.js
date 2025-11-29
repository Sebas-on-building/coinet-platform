const Joi = require('joi');

// --- Allowlist Patterns ---
const patterns = {
  email: /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
  symbol: /^[A-Z0-9]{1,12}$/,
  username: /^[a-zA-Z0-9_]{3,32}$/,
  name: /^[a-zA-Z0-9 _\-]{1,64}$/,
};

// --- Length Limits ---
const limits = {
  email: 128,
  symbol: 12,
  username: 32,
  name: 64,
};

// --- Allowlist Validation Functions ---
function validateEmail(email) {
  return typeof email === 'string' && email.length <= limits.email && patterns.email.test(email);
}
function validateSymbol(symbol) {
  return typeof symbol === 'string' && symbol.length <= limits.symbol && patterns.symbol.test(symbol);
}
function validateUsername(username) {
  return typeof username === 'string' && username.length <= limits.username && patterns.username.test(username);
}
function validateName(name) {
  return typeof name === 'string' && name.length <= limits.name && patterns.name.test(name);
}

// --- Sanitization ---
function sanitizeString(str, maxLen) {
  return String(str).replace(/[^\w@.\- ]/g, '').slice(0, maxLen);
}

// --- JSON Schema/Joi Validation ---
function validateWithSchema(obj, schema) {
  const { error, value } = schema.validate(obj);
  return { valid: !error, error, value };
}

// --- Example Schemas ---
const strategySchema = Joi.object({
  userId: Joi.string().max(64).required(),
  name: Joi.string().max(64).pattern(patterns.name).required(),
  definition: Joi.object().required(),
});
const alertSchema = Joi.object({
  user_id: Joi.string().max(64).required(),
  symbol: Joi.string().pattern(patterns.symbol).required(),
  type: Joi.string().valid('price', 'percent_change', 'moving_average', 'multi').required(),
  condition: Joi.string().max(16),
  threshold: Joi.number(),
  cooldown: Joi.number().integer().min(0),
  webhook_url: Joi.string().uri().optional(),
});

module.exports = {
  validateEmail,
  validateSymbol,
  validateUsername,
  validateName,
  sanitizeString,
  validateWithSchema,
  strategySchema,
  alertSchema,
}; 