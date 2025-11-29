/**
 * Plugin metadata type
 */
export interface PluginMeta {
  name: string;
  author: string;
  version: string;
  description?: string;
  icon?: string;
  permissions?: string[];
}

/**
 * Plugin context type
 */
export interface PluginContext {
  id: string;
  meta: PluginMeta;
  config: Record<string, any>;
  state: Record<string, any>;
}

/**
 * Plugin event type
 */
export interface PluginEvent {
  type: string;
  payload: any;
  date: string;
} 