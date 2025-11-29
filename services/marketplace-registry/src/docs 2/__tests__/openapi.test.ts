const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

describe('OpenAPI Spec', () => {
  const specPath = path.join(__dirname, '../openapi.yaml');
  let spec;

  beforeAll(() => {
    const file = fs.readFileSync(specPath, 'utf8');
    spec = yaml.load(file);
  });

  it('should be present and parseable', () => {
    expect(spec).toBeDefined();
    expect(spec.openapi).toBe('3.1.0');
  });

  it('should contain core paths', () => {
    expect(spec.paths['/plugins']).toBeDefined();
    expect(spec.paths['/plugins/{pluginId}']).toBeDefined();
    expect(spec.paths['/plugins/{pluginId}/reviews']).toBeDefined();
    expect(spec.paths['/plugins/{pluginId}/analytics']).toBeDefined();
    expect(spec.paths['/plugins/{pluginId}/monetization']).toBeDefined();
    expect(spec.paths['/plugins/{pluginId}/security']).toBeDefined();
  });

  it('should contain core schemas', () => {
    expect(spec.components.schemas.Plugin).toBeDefined();
    expect(spec.components.schemas.PluginVersion).toBeDefined();
    expect(spec.components.schemas.Monetization).toBeDefined();
    expect(spec.components.schemas.Analytics).toBeDefined();
    expect(spec.components.schemas.Review).toBeDefined();
    expect(spec.components.schemas.SecurityReport).toBeDefined();
    expect(spec.components.schemas.PluginSupportFeature).toBeDefined();
    expect(spec.components.schemas.Billing).toBeDefined();
  });
}); 