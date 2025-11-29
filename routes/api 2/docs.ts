import * as express from 'express';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yamljs';
import path from 'path';

const openapiPath = path.join(__dirname, 'openapi.yaml');
const openapiSpec = yaml.load(openapiPath);

const router = express.Router();
router.use('/', swaggerUi.serve, swaggerUi.setup(openapiSpec));

export default router; 