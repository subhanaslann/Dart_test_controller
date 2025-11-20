
import { RepoFile, RepoStructure, FilePair, MatchType, PackageDependencies } from '../types';
import { extractImports } from './analysisEngine';

const GITHUB_API_BASE = 'https://api.github.com/repos';
const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB limit for source files

export const parseRepoUrl = (url: string): { owner: string; repo: string } | null => {
  if (!url) return null;
  const trimmed = url.trim();

  const simpleMatch = trimmed.match(/^([^/]+)\/([^/]+)$/);
  if (simpleMatch) {
      return { owner: simpleMatch[1], repo: simpleMatch[2].replace(/\.git$/, '') };
  }

  try {
    const urlToParse = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const urlObj = new URL(urlToParse);
    
    if (urlObj.hostname.includes('github.com')) {
        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
            return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
        }
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return null;
};

export class GithubService {
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  private getHeaders() {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
    };
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }
    return headers;
  }

  async fetchRepoTree(owner: string, repo: string, branch: string = 'main'): Promise<RepoStructure> {
    try {
      const treeUrl = `${GITHUB_API_BASE}/${owner}/${repo}/git/trees/${branch}?recursive=1`;
      const treeResponse = await fetch(treeUrl, { headers: this.getHeaders() });

      if (!treeResponse.ok) {
         if (treeResponse.status === 404 && branch === 'main') {
             return this.fetchRepoTree(owner, repo, 'master');
         }
         throw new Error(`GitHub API Error: ${treeResponse.statusText} (Check URL or Token permissions)`);
      }

      const treeData = await treeResponse.json();
      const allFiles: RepoFile[] = treeData.tree;

      // Filter Dart files
      const dartFiles = allFiles.filter(f => 
          f.path.endsWith('.dart') && 
          f.type === 'blob' &&
          !f.path.endsWith('.g.dart') && 
          !f.path.endsWith('.freezed.dart') &&
          !f.path.endsWith('.config.dart')
      );

      const libFiles = dartFiles.filter(f => f.path.includes('lib/'));
      const testFiles = dartFiles.filter(f => f.path.includes('test/'));

      // Optimization: Map for O(1) lookup
      const testFileMap = new Map<string, RepoFile>();
      const testFilesByName = new Map<string, RepoFile[]>();
      const allFilesMap: Record<string, RepoFile> = {}; // For Dependency Resolution

      allFiles.forEach(f => {
          allFilesMap[f.path] = f;
      });

      testFiles.forEach(f => {
          testFileMap.set(f.path, f);
          const name = f.path.split('/').pop();
          if (name) {
              if (!testFilesByName.has(name)) {
                  testFilesByName.set(name, []);
              }
              testFilesByName.get(name)?.push(f);
          }
      });

      // Locate pubspecs and parse Name
      const pubspecFiles = allFiles.filter(f => f.path.endsWith('pubspec.yaml'));
      const packageDependencies: Record<string, PackageDependencies> = {};
      let rootPackageName = 'app'; // Default
      
      await Promise.all(pubspecFiles.map(async (file) => {
          if ((file as any).size && (file as any).size > 100000) return; 
          try {
            const content = await this.fetchFileContent(file.url);
            const dir = file.path.replace('pubspec.yaml', '');
            packageDependencies[dir] = this.parseDependencies(content);
            
            if (dir === '') {
                const nameMatch = content.match(/^name:\s+(\w+)/m);
                if (nameMatch) rootPackageName = nameMatch[1];
            }
          } catch (e) {
            console.warn("Failed to parse pubspec", file.path);
          }
      }));

      if (Object.keys(packageDependencies).length === 0) {
          packageDependencies[''] = this.parseDependencies('');
      }

      const pairs: FilePair[] = [];
      const usedTests = new Set<string>();

      for (const lib of libFiles) {
        const filename = lib.path.split('/').pop()?.replace('.dart', '');
        if (!filename) continue;

        // Find nearest package root
        const packageRoot = Object.keys(packageDependencies)
            .filter(root => lib.path.startsWith(root))
            .sort((a, b) => b.length - a.length)[0] || '';

        const relativeLibPath = lib.path.substring(packageRoot.length).replace(/^lib\//, '');
        const exactTestPath = `${packageRoot}test/${relativeLibPath.replace(/\.dart$/, '_test.dart')}`;
        
        let match = testFileMap.get(exactTestPath);
        let type: MatchType = 'none';

        if (match) {
          type = 'exact';
        } else {
          const expectedTestName = `${filename}_test.dart`;
          const candidates = testFilesByName.get(expectedTestName);
          if (candidates && candidates.length > 0) {
              match = candidates[0];
              type = 'fuzzy';
          }
        }

        if (match) usedTests.add(match.path);

        pairs.push({
          id: lib.path,
          name: filename,
          libFile: lib,
          testFile: match,
          matchType: type,
          packageRoot: packageRoot
        });
      }

      const unpairedTests = testFiles.filter(t => !usedTests.has(t.path));

      return { 
          pairs: pairs.sort((a, b) => a.matchType === 'none' ? -1 : 1), 
          unpairedTests, 
          packages: packageDependencies,
          rootPackageName,
          fileMap: allFilesMap
      };

    } catch (error: any) {
      if (error.message.includes('403') || error.message.includes('429')) {
        throw new Error("GitHub API Rate Limit Exceeded. Please provide a valid Personal Access Token.");
      }
      throw error;
    }
  }

  async fetchFileContent(url: string): Promise<string> {
    const response = await fetch(url, { headers: this.getHeaders() });
    if (!response.ok) throw new Error("Failed to fetch content");
    const data = await response.json();
    if (data.size > MAX_FILE_SIZE_BYTES) return "// File too large.";
    if (data.encoding === 'base64' && data.content) {
      try {
        return decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
      } catch (e) {
        return atob(data.content.replace(/\s/g, ''));
      }
    }
    throw new Error("Unknown encoding");
  }

  async fetchDeepDependencies(
      code: string, 
      currentFilePath: string, 
      rootPackageName: string, 
      fileMap: Record<string, RepoFile>
  ): Promise<Record<string, string>> {
    const imports = extractImports(code);
    const dependencies: Record<string, string> = {};
    
    // We only want internal dependencies (package:rootName/... or relative)
    // We ignore dart:*, package:flutter*, and 3rd party libs
    const internalImports = imports.filter(imp => {
        return imp.startsWith(`package:${rootPackageName}/`) || imp.startsWith('.') || imp.startsWith('..');
    });

    // Limit to top 5 crucial dependencies to save tokens/time
    const importsToFetch = internalImports.slice(0, 5);

    await Promise.all(importsToFetch.map(async (imp) => {
        const resolvedPath = this.resolveImportPath(imp, currentFilePath, rootPackageName);
        if (resolvedPath && fileMap[resolvedPath]) {
            try {
                const content = await this.fetchFileContent(fileMap[resolvedPath].url);
                const fileName = resolvedPath.split('/').pop() || imp;
                dependencies[fileName] = content;
            } catch (e) {
                console.warn(`Failed to fetch dependency ${imp}`);
            }
        }
    }));

    return dependencies;
  }

  async fetchLinterRules(fileMap: Record<string, RepoFile>): Promise<string | undefined> {
     const linterFile = fileMap['analysis_options.yaml'];
     if (linterFile) {
         try {
             return await this.fetchFileContent(linterFile.url);
         } catch (e) { return undefined; }
     }
     return undefined;
  }

  private resolveImportPath(importStr: string, currentPath: string, packageName: string): string | null {
      if (importStr.startsWith(`package:${packageName}/`)) {
          return importStr.replace(`package:${packageName}/`, 'lib/');
      }
      
      if (importStr.startsWith('.')) {
          // Resolve relative path
          const parts = currentPath.split('/');
          parts.pop(); // remove filename
          
          const importParts = importStr.split('/');
          
          for (const part of importParts) {
              if (part === '.') continue;
              if (part === '..') {
                  if (parts.length > 0) parts.pop();
              } else {
                  parts.push(part);
              }
          }
          return parts.join('/');
      }
      
      return null;
  }

  private parseDependencies(yamlContent: string): PackageDependencies {
    return {
      hasMockito: yamlContent.includes('mockito:'),
      hasMocktail: yamlContent.includes('mocktail:'),
      hasBlocTest: yamlContent.includes('bloc_test:'),
      hasRiverpod: yamlContent.includes('flutter_riverpod:') || yamlContent.includes('hooks_riverpod:'),
      hasFreezed: yamlContent.includes('freezed:') || yamlContent.includes('freezed_annotation:'),
      hasAutoRoute: yamlContent.includes('auto_route:'),
      hasHive: yamlContent.includes('hive:'),
    };
  }
}
