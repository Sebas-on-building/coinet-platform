const fs = require('fs');
const path = require('path');
const { parse } = require('graphql');

describe('GraphQL SDL', () => {
  const schemaPath = path.join(__dirname, '../graphql-schema.graphql');
  let schema;

  beforeAll(() => {
    schema = fs.readFileSync(schemaPath, 'utf8');
  });

  it('should be present and parseable', () => {
    expect(() => parse(schema)).not.toThrow();
  });

  it('should contain core types', () => {
    expect(schema).toContain('type Plugin');
    expect(schema).toContain('type PluginVersion');
    expect(schema).toContain('type Monetization');
    expect(schema).toContain('type Analytics');
    expect(schema).toContain('type Review');
    expect(schema).toContain('type SecurityReport');
    expect(schema).toContain('type PluginSupportFeature');
    expect(schema).toContain('type Billing');
  });

  it('should contain core queries', () => {
    expect(schema).toContain('type Query');
    expect(schema).toContain('plugins(');
    expect(schema).toContain('plugin(');
    expect(schema).toContain('pluginSecurityReport(');
    expect(schema).toContain('pluginAnalytics(');
    expect(schema).toContain('pluginReviews(');
  });
}); 