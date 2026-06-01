// =============================================================================
// DepGraph CLI — API Types
// Request/response shapes matching the Week 1 Next.js API contract exactly.
// =============================================================================

// ─── Risk Level ───────────────────────────────────────────────────────────────

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'healthy';

// ─── Score Dimension ──────────────────────────────────────────────────────────

export interface DimensionScore {
  score: number;
  weight: number;
  label: string;
  reason: string;
  available: boolean;
}

export interface ScoreDimensions {
  maintenance: DimensionScore;
  busFactor: DimensionScore;
  issueHealth: DimensionScore;
  downloadTrend: DimensionScore;
  depFreshness: DimensionScore;
  vulnerability: DimensionScore;
}

// ─── Package Score ────────────────────────────────────────────────────────────

export interface PackageScore {
  packageName: string;
  packageVersion: string | null;
  ecosystem: string;
  score: number;
  riskLevel: RiskLevel;
  abandonmentRisk: boolean;
  dimensions: ScoreDimensions;
  topFactors: Array<{ label: string; reason: string }>;
  alternatives: Alternative[];
  computedAt: string;
}

export interface Alternative {
  name: string;
  score: number;
  apiCompat: string;
  migrationEffort: string;
}

// ─── Scan Report ──────────────────────────────────────────────────────────────

export interface ScanReport {
  id: string;
  shareToken: string;
  overallScore: number;
  totalDeps: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  healthyCount: number;
  packages: PackageScore[];
  createdAt: string;
  projectId: string | null;
}

// ─── API Request ──────────────────────────────────────────────────────────────

export interface ScanRequest {
  /** Array of "name@version" strings */
  packages: string[];
  /** SHA-256 hash of raw package-lock.json content */
  lockfileHash: string;
}

export interface ApiErrorPayload {
  error: string;
  status: number;
}
