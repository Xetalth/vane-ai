export interface Organization {
  id: number;
  name: string;
  cluster_region: string;
}

export interface FeatureFlag {
  id: number;
  name: string;
  key: string;
  description?: string;
  environment?: string;
  status: "canary" | "healthy" | "investigating" | "killed";
  rollout_percentage: number;
  connected_repo?: string;
  code_context?: string;
  organization_id?: number;
}

export interface TelemetryData {
  errorRate: number;
  p99Latency: number;
  activeCrashes: number;
  canarySample: string;
}