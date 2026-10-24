(function () {
  function equal(left, right) {
    if (left === right) return true;
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return leftKeys.length === rightKeys.length
      && leftKeys.every(key => Object.prototype.hasOwnProperty.call(right, key) && equal(left[key], right[key]));
  }

  function matchesType(value, type) {
    if (Array.isArray(type)) return type.some(item => matchesType(value, item));
    if (type === 'null') return value === null;
    if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
    if (type === 'array') return Array.isArray(value);
    if (type === 'integer') return Number.isInteger(value);
    if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
    return typeof value === type;
  }

  function validate(value, schema, path = '$', errors = []) {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      errors.push(`${path}: schema must be an object`);
      return errors;
    }

    if (schema.type && !matchesType(value, schema.type)) {
      errors.push(`${path}: expected ${Array.isArray(schema.type) ? schema.type.join(' or ') : schema.type}`);
      return errors;
    }
    if (Object.prototype.hasOwnProperty.call(schema, 'const') && !equal(value, schema.const)) {
      errors.push(`${path}: must equal ${JSON.stringify(schema.const)}`);
    }
    if (Array.isArray(schema.enum) && !schema.enum.some(item => equal(value, item))) {
      errors.push(`${path}: must match one of the allowed values`);
    }

    if (typeof value === 'string') {
      if (Number.isInteger(schema.minLength) && value.length < schema.minLength) errors.push(`${path}: must contain at least ${schema.minLength} characters`);
      if (Number.isInteger(schema.maxLength) && value.length > schema.maxLength) errors.push(`${path}: must contain at most ${schema.maxLength} characters`);
    }
    if (typeof value === 'number') {
      if (typeof schema.minimum === 'number' && value < schema.minimum) errors.push(`${path}: must be at least ${schema.minimum}`);
      if (typeof schema.maximum === 'number' && value > schema.maximum) errors.push(`${path}: must be at most ${schema.maximum}`);
    }

    if (Array.isArray(value)) {
      if (Number.isInteger(schema.minItems) && value.length < schema.minItems) errors.push(`${path}: must contain at least ${schema.minItems} items`);
      if (Number.isInteger(schema.maxItems) && value.length > schema.maxItems) errors.push(`${path}: must contain at most ${schema.maxItems} items`);
      if (schema.items && typeof schema.items === 'object') {
        value.forEach((item, index) => validate(item, schema.items, `${path}[${index}]`, errors));
      }
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (Number.isInteger(schema.minProperties) && Object.keys(value).length < schema.minProperties) errors.push(`${path}: must contain at least ${schema.minProperties} properties`);
      if (Number.isInteger(schema.maxProperties) && Object.keys(value).length > schema.maxProperties) errors.push(`${path}: must contain at most ${schema.maxProperties} properties`);
      const required = Array.isArray(schema.required) ? schema.required : [];
      for (const key of required) {
        if (typeof key === 'string' && !Object.prototype.hasOwnProperty.call(value, key)) errors.push(`${path}.${key}: required property is missing`);
      }
      const properties = schema.properties && typeof schema.properties === 'object' ? schema.properties : {};
      for (const [key, childSchema] of Object.entries(properties)) {
        if (Object.prototype.hasOwnProperty.call(value, key)) validate(value[key], childSchema, `${path}.${key}`, errors);
      }
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(value)) {
          if (!Object.prototype.hasOwnProperty.call(properties, key)) errors.push(`${path}.${key}: additional property is not allowed`);
        }
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        for (const [key, child] of Object.entries(value)) {
          if (!Object.prototype.hasOwnProperty.call(properties, key)) validate(child, schema.additionalProperties, `${path}.${key}`, errors);
        }
      }
    }

    if (Array.isArray(schema.oneOf)) {
      const matches = schema.oneOf.map(candidate => validate(value, candidate, path, []))
        .filter(candidateErrors => candidateErrors.length === 0).length;
      if (matches !== 1) errors.push(`${path}: must match exactly one allowed schema (${matches} matched)`);
    }
    if (Array.isArray(schema.anyOf)) {
      const matches = schema.anyOf.some(candidate => validate(value, candidate, path, []).length === 0);
      if (!matches) errors.push(`${path}: does not match any allowed schema`);
    }

    return errors;
  }

  window.GreenwoodsSchema = { validate };
})();
