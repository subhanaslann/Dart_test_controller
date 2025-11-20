
export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
  GENERATING_CODE = 'GENERATING_CODE',
  LOADING_REPO = 'LOADING_REPO',
  FETCHING_DEPS = 'FETCHING_DEPS'
}

export type ArchitectureType = 'bloc' | 'cubit' | 'repository' | 'datasource' | 'widget' | 'model' | 'util' | 'generic';

export interface FunctionMetadata {
  name: string;
  signature: string;
  isTested: boolean;
  reason?: string;
}

export interface AnalysisReport {
  architectureType: ArchitectureType;
  totalFunctions: number;
  testedFunctions: number;
  coveragePercentage: number;
  functions: FunctionMetadata[];
  summary: string;
  suggestions: string[];
}

export interface GeneratedTestResponse {
  code: string;
  explanation: string;
}

// GitHub & Project Structure Types
export interface RepoFile {
  path: string;
  type: 'blob' | 'tree';
  url: string; // API URL to fetch content
}

export type MatchType = 'exact' | 'fuzzy' | 'manual' | 'none';

export interface FilePair {
  id: string;
  name: string;
  libFile: RepoFile;
  testFile?: RepoFile;
  matchType: MatchType;
  packageRoot: string; // Path to the nearest pubspec.yaml (for monorepos)
}

export interface PackageDependencies {
  hasMockito: boolean;
  hasMocktail: boolean;
  hasBlocTest: boolean;
  hasRiverpod: boolean;
  hasFreezed: boolean;
  hasAutoRoute: boolean;
  hasHive: boolean;
}

export interface RepoStructure {
  pairs: FilePair[];
  unpairedTests: RepoFile[];
  packages: Record<string, PackageDependencies>; 
  rootPackageName: string;
  fileMap: Record<string, RepoFile>;
}

export interface DeepAnalysisContext {
  dependencyCode: Record<string, string>; // filename -> content
  linterRules?: string;
}
