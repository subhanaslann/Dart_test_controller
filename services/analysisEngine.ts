
import { ArchitectureType } from "../types";

/**
 * Performs client-side static analysis to detect the architectural component type
 * of the Dart code. This helps prompt the AI more accurately.
 */
export const detectArchitecture = (code: string): ArchitectureType => {
  const cleanCode = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//gm, '');

  // 1. Detect State Management (Bloc/Cubit)
  if (cleanCode.includes('extends Bloc') || cleanCode.includes('extends Cubit')) {
    if (cleanCode.includes('extends Bloc')) return 'bloc';
    return 'cubit';
  }

  // 2. Detect Data Layer
  if (cleanCode.includes('extends Repository') || cleanCode.includes('implements Repository') || /class\s+\w+Repository/i.test(cleanCode)) {
    return 'repository';
  }
  if (/class\s+\w+(Remote|Local)DataSource/i.test(cleanCode) || cleanCode.includes('Retrofit')) {
    return 'datasource';
  }

  // 3. Detect Widgets
  if (cleanCode.includes('extends StatelessWidget') || cleanCode.includes('extends StatefulWidget') || cleanCode.includes('extends ConsumerWidget')) {
    return 'widget';
  }

  // 4. Detect Models (Freezed / JsonSerializable)
  if (cleanCode.includes('@freezed') || cleanCode.includes('@JsonSerializable') || cleanCode.includes('extends Equatable')) {
    return 'model';
  }

  // 5. Utils
  if (cleanCode.includes('static') && !cleanCode.includes('extends')) {
     // Heuristic: Classes with mostly static methods are usually Utils
    return 'util';
  }

  return 'generic';
};

/**
 * Extracts public method signatures to validate AI output
 */
export const extractPublicMethods = (code: string): string[] => {
  const methodRegex = /^\s*(?:[\w<>?]+\s+)?(\w+)\s*\([^)]*\)\s*(?:async\s*)?{/gm;
  const matches = [];
  let match;
  while ((match = methodRegex.exec(code)) !== null) {
    const methodName = match[1];
    // Ignore private methods, build methods, and standard overrides
    if (!methodName.startsWith('_') && methodName !== 'build' && methodName !== 'createState' && methodName !== 'toJson') {
      matches.push(methodName);
    }
  }
  return matches;
};

/**
 * Extracts imports from the code to determine dependencies.
 */
export const extractImports = (code: string): string[] => {
  const regex = /import\s+['"]([^'"]+)['"]/g;
  const imports = [];
  let match;
  while ((match = regex.exec(code)) !== null) {
    imports.push(match[1]);
  }
  return imports;
};
