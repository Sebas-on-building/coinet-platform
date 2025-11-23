import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

const router = express.Router();
const openApiPath = path.join(__dirname, '../../docs/openapi.yaml');
const openApiSpec = YAML.load(openApiPath);

// Custom Swagger UI options for world-class branding
const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { background: linear-gradient(90deg, #0f2027, #2c5364); }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
    .swagger-ui .topbar .topbar-wrapper span { font-family: 'SF Pro Display', 'Canva Sans', 'Inter', 'Segoe UI', sans-serif; font-size: 2rem; color: #fff; }
    .swagger-ui .info { border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); background: #fff; }
    .swagger-ui .scheme-container { border-radius: 8px; }
    body { background: #f7f8fa; }
  `,
  customSiteTitle: 'Coinet Marketplace API Docs',
};

router.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerOptions));

export default router; 