
import { ArchitectureType, AnalysisReport, FunctionMetadata, PackageDependencies, GeneratedTestResponse } from "../types";

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

/**
 * Parse Dart functions with detailed metadata
 */
interface ParsedFunction {
  name: string;
  signature: string;
  lineStart: number;
  lineEnd: number;
  isPublic: boolean;
  returnType: string;
  isAsync: boolean;
}

export const parseDartFunctions = (code: string): ParsedFunction[] => {
  const functions: ParsedFunction[] = [];
  const lines = code.split('\n');

  // Match method declarations (handles Future, async, static, etc.)
  const functionRegex = /^\s*(static\s+)?(Future<[^>]+>|Stream<[^>]+>|[\w<>?]+)?\s+(\w+)\s*\(([^)]*)\)\s*(async)?\s*(?:=>|\{)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(functionRegex);

    if (match) {
      const name = match[3];

      // Filter: Ignore private, constructors, build, common overrides
      if (!name.startsWith('_') &&
        name !== 'build' &&
        name !== 'createState' &&
        name !== 'toJson' &&
        name !== 'fromJson' &&
        name !== 'toString' &&
        name !== 'hashCode' &&
        !/^[A-Z]/.test(name)) { // Not a constructor

        functions.push({
          name,
          signature: line.trim(),
          lineStart: i + 1,
          lineEnd: -1,
          isPublic: true,
          returnType: match[2] || 'void',
          isAsync: !!match[5]
        });
      }
    }
  }

  return functions;
};

/**
 * Find if a function is tested in test code
 */
export const findTestsForFunction = (
  functionName: string,
  testCode: string
): { isTested: boolean; testCount: number; details: string[] } => {

  if (!testCode || testCode.startsWith('//')) {
    return { isTested: false, testCount: 0, details: ['No test file'] };
  }

  const details: string[] = [];
  let testCount = 0;

  // Pattern 1: Test descriptions mentioning the function
  const testPatterns = [
    new RegExp(`test\\(['"][^'"]*${functionName}[^'"]*['"]`, 'gi'),
    new RegExp(`testWidgets\\(['"][^'"]*${functionName}[^'"]*['"]`, 'gi'),
    new RegExp(`blocTest<[^>]+>\\(['"][^'"]*${functionName}[^'"]*['"]`, 'gi'),
  ];

  for (const pattern of testPatterns) {
    const matches = [...testCode.matchAll(pattern)];
    testCount += matches.length;
    matches.forEach(m => {
      details.push(`Test found: ${m[0].substring(0, 60)}...`);
    });
  }

  // Pattern 2: Direct function invocations in test
  const invocationPattern = new RegExp(`\\b${functionName}\\s*\\(`, 'g');
  const invocations = [...testCode.matchAll(invocationPattern)];

  if (invocations.length > 0) {
    details.push(`Function invoked ${invocations.length} time(s)`);
  }

  // Pattern 3: Verify/expect statements
  const verifyPattern = new RegExp(`(verify|expect)\\([^)]*${functionName}`, 'gi');
  const verifications = [...testCode.matchAll(verifyPattern)];

  if (verifications.length > 0) {
    details.push(`${verifications.length} assertion(s) found`);
  }

  const isTested = testCount > 0 || invocations.length > 0 || verifications.length > 0;

  return {
    isTested,
    testCount: testCount + invocations.length,
    details: details.length > 0 ? details : ['No test references found']
  };
};

/**
 * MAIN STATIC ANALYSIS FUNCTION - Replaces AI analysis
 */
export const analyzeFlutterCoverageStatic = (
  prodCode: string,
  testCode: string,
  dependencies: PackageDependencies
): AnalysisReport => {

  if (!prodCode || prodCode === 'Loading...') {
    throw new Error('Production code is required');
  }

  const functions = parseDartFunctions(prodCode);
  const archType = detectArchitecture(prodCode);

  const analyzedFunctions: FunctionMetadata[] = functions.map(fn => {
    const testResult = findTestsForFunction(fn.name, testCode);

    return {
      name: fn.name,
      signature: fn.signature,
      isTested: testResult.isTested,
      reason: testResult.isTested
        ? testResult.details.join(', ')
        : 'No test coverage detected - Consider adding unit tests'
    };
  });

  const testedCount = analyzedFunctions.filter(f => f.isTested).length;
  const totalCount = analyzedFunctions.length;
  const coverage = totalCount > 0 ? Math.round((testedCount / totalCount) * 100) : 0;

  return {
    architectureType: archType,
    totalFunctions: totalCount,
    testedFunctions: testedCount,
    coveragePercentage: coverage,
    functions: analyzedFunctions,
    summary: generateStaticSummary(testedCount, totalCount, archType, dependencies),
    suggestions: generateStaticSuggestions(analyzedFunctions, archType, dependencies)
  };
};

const generateStaticSummary = (
  tested: number,
  total: number,
  arch: ArchitectureType,
  deps: PackageDependencies
): string => {
  const coverage = total > 0 ? Math.round((tested / total) * 100) : 0;

  let summary = `Static analysis detected ${total} public methods in this ${arch} class. `;

  if (coverage === 100) {
    summary += '✅ Excellent! All methods have test coverage.';
  } else if (coverage >= 70) {
    summary += `${tested}/${total} methods are tested (${coverage}%). Good coverage, but room for improvement.`;
  } else if (coverage >= 40) {
    summary += `${tested}/${total} methods are tested (${coverage}%). Coverage is moderate - consider adding more tests.`;
  } else {
    summary += `Only ${tested}/${total} methods are tested (${coverage}%). ⚠️ Low coverage detected!`;
  }

  return summary;
};

const generateStaticSuggestions = (
  functions: FunctionMetadata[],
  arch: ArchitectureType,
  deps: PackageDependencies
): string[] => {
  const suggestions: string[] = [];
  const untested = functions.filter(f => !f.isTested);

  if (untested.length > 0) {
    suggestions.push(`Add unit tests for: ${untested.slice(0, 5).map(f => f.name).join(', ')}${untested.length > 5 ? '...' : ''}`);
  }

  // Architecture-specific suggestions
  if (arch === 'bloc' || arch === 'cubit') {
    if (deps.hasBlocTest) {
      suggestions.push('Use blocTest() to verify state emissions');
    } else {
      suggestions.push('Consider adding bloc_test package for easier state testing');
    }
  }

  if (arch === 'repository') {
    suggestions.push('Ensure all DataSource methods are mocked');
    suggestions.push('Test exception handling and error propagation');
  }

  if (arch === 'widget') {
    suggestions.push('Use testWidgets() and Finder patterns');
    suggestions.push('Consider golden tests for UI regression');
  }

  if (arch === 'model') {
    suggestions.push('Verify JSON serialization (fromJson/toJson)');
    suggestions.push('Test equality and hashCode if using Equatable');
  }

  // Dependency-specific suggestions
  if (!deps.hasMocktail && !deps.hasMockito) {
    suggestions.push('Add mocktail or mockito for easier mocking');
  }

  return suggestions;
};

/**
 * TEMPLATE-BASED TEST GENERATION - Replaces AI generation
 */
export const generateMissingTestsStatic = (
  prodCode: string,
  missingFunctionNames: string[],
  dependencies: PackageDependencies,
  className: string
): GeneratedTestResponse => {

  const archType = detectArchitecture(prodCode);
  const functions = parseDartFunctions(prodCode);
  const targetFunctions = functions.filter(f => missingFunctionNames.includes(f.name));

  let testCode = '';

  // Generate imports
  testCode += generateTestImports(dependencies, archType);
  testCode += '\n\n';

  // Generate main test block
  testCode += `void main() {\n`;
  testCode += `  group('${className} Tests', () {\n`;

  if (archType === 'bloc' || archType === 'cubit') {
    testCode += generateBlocTests(targetFunctions, className, dependencies);
  } else if (archType === 'repository') {
    testCode += generateRepositoryTests(targetFunctions, className);
  } else if (archType === 'widget') {
    testCode += generateWidgetTests(targetFunctions, className);
  } else {
    testCode += generateGenericTests(targetFunctions, className);
  }

  testCode += `  });\n`;
  testCode += `}\n`;

  return {
    code: testCode,
    explanation: `Generated ${targetFunctions.length} test template(s) for ${archType} architecture. ` +
      `Customize the assertions and mock behaviors as needed.`
  };
};

const generateTestImports = (deps: PackageDependencies, arch: ArchitectureType): string => {
  let imports = "import 'package:flutter_test/flutter_test.dart';\n";

  if (deps.hasMocktail) {
    imports += "import 'package:mocktail/mocktail.dart';\n";
  } else if (deps.hasMockito) {
    imports += "import 'package:mockito/mockito.dart';\n";
    imports += "import 'package:mockito/annotations.dart';\n";
  }

  if ((arch === 'bloc' || arch === 'cubit') && deps.hasBlocTest) {
    imports += "import 'package:bloc_test/bloc_test.dart';\n";
  }

  imports += "\n// TODO: Import your production file here\n";
  imports += "// import 'package:your_app/path/to/file.dart';\n";

  return imports;
};

const generateBlocTests = (functions: ParsedFunction[], className: string, deps: PackageDependencies): string => {
  let tests = '';

  if (deps.hasBlocTest) {
    tests += `    blocTest<${className}, dynamic>(\n`;
    tests += `      'emits correct states',\n`;
    tests += `      build: () => ${className}(),\n`;
    tests += `      act: (bloc) => bloc.add(YourEvent()),\n`;
    tests += `      expect: () => [YourExpectedState()],\n`;
    tests += `    );\n\n`;
  }

  return tests;
};

const generateRepositoryTests = (functions: ParsedFunction[], className: string): string => {
  let tests = '';

  functions.forEach(fn => {
    tests += `    test('${fn.name} returns data on success', () async {\n`;
    tests += `      // Arrange\n`;
    tests += `      final mockDataSource = MockDataSource();\n`;
    tests += `      final repository = ${className}(dataSource: mockDataSource);\n`;
    tests += `      // when(mockDataSource.method()).thenAnswer((_) async => mockData);\n\n`;
    tests += `      // Act\n`;
    tests += `      final result = await repository.${fn.name}();\n\n`;
    tests += `      // Assert\n`;
    tests += `      expect(result, isA<SuccessType>());\n`;
    tests += `    });\n\n`;

    tests += `    test('${fn.name} throws exception on failure', () async {\n`;
    tests += `      // TODO: Test error handling\n`;
    tests += `    });\n\n`;
  });

  return tests;
};

const generateWidgetTests = (functions: ParsedFunction[], className: string): string => {
  let tests = '';

  tests += `    testWidgets('${className} renders correctly', (tester) async {\n`;
  tests += `      await tester.pumpWidget(MaterialApp(home: ${className}()));\n\n`;
  tests += `      // TODO: Add finder assertions\n`;
  tests += `      // expect(find.text('Expected'), findsOneWidget);\n`;
  tests += `    });\n\n`;

  return tests;
};

const generateGenericTests = (functions: ParsedFunction[], className: string): string => {
  let tests = '';

  functions.forEach(fn => {
    tests += `    test('${fn.name} works correctly', () {\n`;
    tests += `      // Arrange\n`;
    tests += `      final instance = ${className}();\n\n`;
    tests += `      // Act\n`;
    tests += `      final result = instance.${fn.name}();\n\n`;
    tests += `      // Assert\n`;
    tests += `      expect(result, isNotNull);\n`;
    tests += `      // TODO: Add specific assertions\n`;
    tests += `    });\n\n`;
  });

  return tests;
};
