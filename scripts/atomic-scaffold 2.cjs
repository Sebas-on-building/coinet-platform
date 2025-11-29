const fs = require('fs');
const path = require('path');

const templates = {
  commandHandler: (context, module) => `import { /*Command*/ } from 'shared-models/${context}/commands';

export function handle${capitalize(module)}Command(cmd) {
  // Validate, persist, emit event
  // Extensible: add hooks for new types
}
`,
  eventHandler: (context, module) => `import { /*Event*/ } from 'shared-models/${context}/events';

export function on${capitalize(module)}Event(event) {
  // Update projections, trigger downstream
  // Extensible: add listeners for analytics, reporting
}
`,
  service: (context, module) => `export class ${capitalize(module)}Service {
  async action(...) {
    // Core logic
    // Extensible: support new types
  }
}
`,
  api: (context, module) => `import { Router } from 'express';
const router = Router();

router.post('/action', async (req, res) => {
  // Validate and handle command
  res.status(200).json({ status: 'ok' });
});

export default router;
`,
  UIComponent: (context, module) => `import React from 'react';
import { Card, Badge } from 'shared-ui';

export const ${capitalize(module)}Status = ({ status }) => (
  <Card>
    <Badge color={status === 'active' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </Badge>
    <span>${capitalize(module)} Status</span>
  </Card>
);
`,
  UIComponentStories: (context, module) => `import React from 'react';
import { ${capitalize(module)}Status } from './${capitalize(module)}Status';

export default {
  title: '${capitalize(context)}/${capitalize(module)}/${capitalize(module)}Status',
  component: ${capitalize(module)}Status,
};

export const Active = () => <${capitalize(module)}Status status="active" />;
export const Inactive = () => <${capitalize(module)}Status status="inactive" />;
`,
  schema: (context, module) => `type Mutation {
  action(input: ${capitalize(module)}Input): Boolean!
}
`,
  readme: (context, module) => `# ${capitalize(module)} Module

Handles atomic logic for ${capitalize(context)}.

## Architecture

\`\`\`mermaid
flowchart TD
  A[Command] --> B[Service]
  B --> C[Event]
  C --> D[Projection]
\`\`\`

- Extensible for new types, providers, and pipelines.
`,
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateAtomicFiles(dir, context, module) {
  const files = [
    { name: 'commandHandler.ts', content: templates.commandHandler(context, module) },
    { name: 'eventHandler.ts', content: templates.eventHandler(context, module) },
    { name: 'service.ts', content: templates.service(context, module) },
    { name: 'api.ts', content: templates.api(context, module) },
    { name: `${capitalize(module)}Status.tsx`, content: templates.UIComponent(context, module) },
    { name: `${capitalize(module)}Status.stories.tsx`, content: templates.UIComponentStories(context, module) },
    { name: 'schema.graphql', content: templates.schema(context, module) },
    { name: 'README.md', content: templates.readme(context, module) },
  ];
  files.forEach(({ name, content }) => {
    const filePath = path.join(dir, name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content);
    }
  });
}

function traverse(dir, context = '', module = '') {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverse(fullPath, context || file, file);
      generateAtomicFiles(fullPath, context || file, file);
    }
  });
}

traverse('apps/');
traverse('packages/'); 