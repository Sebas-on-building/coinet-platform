export interface Plugin {
  id: string;
  name: string;
  version: string;
  widgets?: WidgetManifest[];
  analytics?: AnalyticsManifest[];
  dataSources?: DataSourceManifest[];
  register?: () => void;
}

export interface WidgetManifest {
  id: string;
  name: string;
  icon: string;
  size: 'sm' | 'md' | 'lg';
  category?: string;
  component: any;
}

export interface AnalyticsManifest {
  id: string;
  name: string;
  description: string;
  run: (params: any) => Promise<any>;
}

export interface DataSourceManifest {
  id: string;
  name: string;
  fetch: (params: any) => Promise<any>;
} 