
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisReport, GeneratedTestResponse, PackageDependencies, ArchitectureType, DeepAnalysisContext } from "../types";
import { detectArchitecture, extractPublicMethods } from "./analysisEngine";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getSystemInstructionForArch = (
    arch: ArchitectureType, 
    deps: PackageDependencies,
    context?: DeepAnalysisContext
): string => {
  let base = `You are a Senior Flutter Engineer specializing in Test Driven Development. `;
  
  // Architecture specific
  switch (arch) {
    case 'bloc':
    case 'cubit':
      base += `This is State Management (Bloc/Cubit). Use 'bloc_test' if available. Check state emissions. `;
      break;
    case 'repository':
      base += `This is a Repository. Focus on mocking DataSources. Ensure Exceptions are propagated or handled. `;
      break;
    case 'model':
      base += `This is a Data Model. Verify fromJson/toJson/equality. `;
      break;
    case 'widget':
      base += `This is a Widget. Use widgetPump, finders, and golden checks if appropriate. `;
      break;
    default:
      base += `Focus on pure logic unit testing. `;
  }

  // Dependency specific
  if (deps.hasMocktail) base += `Use 'mocktail' for mocking. `;
  else if (deps.hasMockito) base += `Use 'mockito' with @GenerateMocks. `;
  else base += `Use manual Fake/Mock classes. `;

  // Linter Context
  if (context?.linterRules) {
      base += `\n\nRESPECT THESE LINTER RULES:\n${context.linterRules.substring(0, 500)}...\n`;
  }

  return base;
};

export const analyzeFlutterCoverage = async (
  prodCode: string,
  testCode: string,
  dependencies: PackageDependencies,
  context?: DeepAnalysisContext
): Promise<AnalysisReport> => {
  if (!prodCode) throw new Error("Production code is required.");

  const archType = detectArchitecture(prodCode);
  const knownMethods = extractPublicMethods(prodCode);
  
  const systemPrompt = getSystemInstructionForArch(archType, dependencies, context);

  const userPrompt = `
    **Task:** Analyze coverage with High Precision.
    **Architecture:** ${archType.toUpperCase()}
    **Detected Public Methods:** ${knownMethods.join(', ')}

    **Production Code:**
    \`\`\`dart
    ${prodCode}
    \`\`\`

    **Test Code:**
    \`\`\`dart
    ${testCode}
    \`\`\`
    
    **Instructions:**
    1. Ignore private methods.
    2. Zero coverage if test file is empty.
    3. Verify that assertions ('expect', 'verify') actually exist.
    4. Check if EDGE CASES (nulls, exceptions, empty lists) are covered, not just happy paths.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      architectureType: { type: Type.STRING },
      totalFunctions: { type: Type.INTEGER },
      testedFunctions: { type: Type.INTEGER },
      coveragePercentage: { type: Type.NUMBER },
      summary: { type: Type.STRING },
      suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
      functions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            signature: { type: Type.STRING },
            isTested: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
          },
          required: ["name", "isTested", "signature"],
        },
      },
    },
    required: ["totalFunctions", "testedFunctions", "functions", "summary", "coveragePercentage"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: 'user', parts: [{ text: systemPrompt + "\n" + userPrompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1, 
      },
    });

    const result = JSON.parse(response.text || "{}") as AnalysisReport;
    if (!result.architectureType) result.architectureType = archType;
    return result;
  } catch (error) {
    console.error("Analysis Error:", error);
    throw new Error("Failed to analyze coverage. " + error);
  }
};

export const generateMissingTests = async (
  prodCode: string,
  missingFunctionNames: string[],
  dependencies: PackageDependencies,
  context?: DeepAnalysisContext
): Promise<GeneratedTestResponse> => {
  
  const archType = detectArchitecture(prodCode);
  const systemPrompt = getSystemInstructionForArch(archType, dependencies, context);
  
  let references = "";
  if (context && Object.keys(context.dependencyCode).length > 0) {
      references = `\n**CONTEXT (Dependencies Source Code):**\nUse these interfaces to write accurate Mocks (e.g. when(mockRepo.method()) ).\n`;
      for (const [filename, code] of Object.entries(context.dependencyCode)) {
          references += `--- FILE: ${filename} ---\n${code.substring(0, 2000)}\n\n`;
      }
  }

  const prompt = `
    ${systemPrompt}

    **Production Code:**
    \`\`\`dart
    ${prodCode}
    \`\`\`

    ${references}

    **Task:**
    Write MISSING unit tests for: ${missingFunctionNames.join(", ")}.
    
    **Strict Requirements:**
    1. Return ONLY valid Dart code.
    2. DO NOT re-generate the whole file if not needed, but structure it so it can be copy-pasted.
    3. **MOCKING:** Use the provided Context to know which methods to mock. Do not halluncinate methods.
    4. **EDGE CASES:** You MUST include tests for Exceptions (throwsA) and Error states.
    5. Use strict types.
    6. Minimal imports.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      code: { type: Type.STRING, description: "Dart test code." },
      explanation: { type: Type.STRING, description: "Strategy explanation." },
    },
    required: ["code", "explanation"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.3, 
      },
    });

    const result = JSON.parse(response.text || "{}") as GeneratedTestResponse;

    if (result.code) {
        result.code = result.code.replace(/^```dart\s*/, '').replace(/\s*```$/, '');
    }

    return result;
  } catch (error) {
    console.error("Generation Error:", error);
    throw new Error("Failed to generate tests.");
  }
};
