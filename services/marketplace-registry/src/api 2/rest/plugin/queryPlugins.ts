import { PluginService } from '../../services/plugin/PluginService';
import { validate } from '../../utils/validation';

export async function queryPlugins(req, res) {
  validate(req.query, 'PluginFilter');
  const plugins = await PluginService.queryPlugins(req.query, req.pagination);
  res.json(plugins);
} 