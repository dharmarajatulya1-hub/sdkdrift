import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { basename, dirname, join, relative, resolve } from "node:path";
import type { SdkMethodSurface } from "@sdkdrift/core";
import { Node, Project, Scope } from "ts-morph";

export async function scanPythonSdk(sdkPath: string): Promise<SdkMethodSurface[]> {
  const scriptPath = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "python_ast_scan.py");

  return await new Promise<SdkMethodSurface[]>((resolve, reject) => {
    const child = spawn("python3", [scriptPath, sdkPath], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error: Error) => {
      reject(new Error(`Failed to start python scanner: ${error.message}`));
    });

    child.on("close", (code: number | null) => {
      if (code !== 0) {
        reject(new Error(`Python scanner exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout) as SdkMethodSurface[]);
      } catch (error) {
        reject(new Error(`Invalid scanner JSON output: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  });
}

// Placeholder until ts-morph scanner package is introduced.
export async function scanTypeScriptSdk(_sdkPath: string): Promise<SdkMethodSurface[]> {
  const project = new Project({
    skipAddingFilesFromTsConfig: true
  });
  const rootPath = resolve(_sdkPath).replace(/\\/g, "/");
  project.addSourceFilesAtPaths(`${rootPath}/**/*.ts`);

  const output: SdkMethodSurface[] = [];
  const emittedIds = new Set<string>();
  const verbPrefixes = ["get", "list", "create", "update", "delete", "post", "put", "patch", "retrieve", "remove"];
  const wrapperMethods = new Set(["withRawResponse", "withStreamingResponse", "with_raw_response", "with_streaming_response"]);

  function moduleNameFromPath(filePath: string): string {
    const rel = relative(rootPath, filePath).replace(/\\/g, "/").replace(/\.tsx?$/i, "");
    const parts = rel.split("/").filter((part) => part && part !== "__init__");
    return parts.join(".") || "root";
  }

  function isWrapperClass(className: string | undefined): boolean {
    if (!className) return false;
    return (
      className.endsWith("WithRawResponse") ||
      className.endsWith("WithStreamingResponse") ||
      className.endsWith("RawResponse") ||
      className.endsWith("StreamingResponse")
    );
  }

  function shouldIncludeClass(filePath: string, className: string | undefined, exported: boolean): boolean {
    if (!className) return false;
    if (isWrapperClass(className)) return false;
    if (className.endsWith("Api")) return true;
    if (filePath.includes("/api/")) return true;
    if (filePath.includes("/src/resources/")) return true;
    return exported;
  }

  function shouldIncludeFunction(filePath: string, fnName: string): boolean {
    if (filePath.includes("/api/") || filePath.includes("/src/resources/")) return true;
    return verbPrefixes.some((prefix) => fnName.toLowerCase().startsWith(prefix));
  }

  function emitMethod(surface: SdkMethodSurface): void {
    if (emittedIds.has(surface.id)) return;
    emittedIds.add(surface.id);
    output.push(surface);
  }

  function buildParamsFromCallable(callable: { getParameters(): Array<{ getName(): string; isOptional(): boolean; getType(): { getText(node: unknown): string } }> }, nodeForType: unknown) {
    return callable.getParameters().map((param) => ({
      name: param.getName(),
      in: "query" as const,
      required: !param.isOptional(),
      type: { name: param.getType().getText(nodeForType) }
    }));
  }

  function parsePathParams(pathTemplate: string): Array<{ name: string; in: "path"; required: true; type: { name: string } }> {
    const names = new Set<string>();
    const matcher = /\{([^}]+)\}/g;
    let match = matcher.exec(pathTemplate);
    while (match) {
      const rawName = (match[1] ?? "").trim();
      if (rawName) names.add(rawName);
      match = matcher.exec(pathTemplate);
    }
    return [...names].map((name) => ({
      name,
      in: "path",
      required: true,
      type: { name: "string" }
    }));
  }

  function stringLiteralValue(node: Node | undefined): string | undefined {
    if (!node) return undefined;
    if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
      return node.getLiteralText();
    }
    return undefined;
  }

  function getMethodLikeName(
    property:
      | import("ts-morph").PropertyAssignment
      | import("ts-morph").MethodDeclaration
      | import("ts-morph").ShorthandPropertyAssignment
  ): string | undefined {
    const nameNode = property.getNameNode();
    if (Node.isIdentifier(nameNode)) return nameNode.getText();
    if (Node.isStringLiteral(nameNode) || Node.isNoSubstitutionTemplateLiteral(nameNode)) return nameNode.getLiteralText();
    return undefined;
  }

  function isMethodFactoryCall(node: Node | undefined): node is import("ts-morph").CallExpression {
    if (!node || !Node.isCallExpression(node)) return false;
    const firstArg = node.getArguments()[0];
    if (!firstArg || !Node.isObjectLiteralExpression(firstArg)) return false;
    const hasMethod = firstArg.getProperty("method");
    const hasPath = firstArg.getProperty("fullPath") || firstArg.getProperty("path");
    return Boolean(hasMethod && hasPath);
  }

  function extractMethodFactoryPath(call: import("ts-morph").CallExpression): string | undefined {
    const firstArg = call.getArguments()[0];
    if (!firstArg || !Node.isObjectLiteralExpression(firstArg)) return undefined;

    const fullPathProp = firstArg.getProperty("fullPath");
    if (fullPathProp && Node.isPropertyAssignment(fullPathProp)) {
      const value = stringLiteralValue(fullPathProp.getInitializer());
      if (value) return value;
    }

    const pathProp = firstArg.getProperty("path");
    if (pathProp && Node.isPropertyAssignment(pathProp)) {
      const value = stringLiteralValue(pathProp.getInitializer());
      if (value) return value;
    }

    return undefined;
  }

  function extractExtendObjectMethods(filePath: string): void {
    const sourceFile = project.getSourceFile(filePath);
    if (!sourceFile) return;

    const moduleName = moduleNameFromPath(filePath);
    for (const variableDecl of sourceFile.getVariableDeclarations()) {
      const statement = variableDecl.getVariableStatement();
      if (!statement?.isExported()) continue;

      const namespace = variableDecl.getName();
      if (!namespace || namespace.startsWith("_")) continue;

      const initializer = variableDecl.getInitializer();
      if (!initializer || !Node.isCallExpression(initializer)) continue;
      const expression = initializer.getExpression();
      if (!Node.isPropertyAccessExpression(expression)) continue;
      if (expression.getName() !== "extend") continue;

      const firstArg = initializer.getArguments()[0];
      if (!firstArg || !Node.isObjectLiteralExpression(firstArg)) continue;

      for (const property of firstArg.getProperties()) {
        if (!Node.isMethodDeclaration(property) && !Node.isPropertyAssignment(property) && !Node.isShorthandPropertyAssignment(property)) {
          continue;
        }

        const methodName = getMethodLikeName(property);
        if (!methodName || methodName === "constructor" || methodName.startsWith("_") || wrapperMethods.has(methodName)) {
          continue;
        }

        if (Node.isMethodDeclaration(property)) {
          emitMethod({
            id: `${moduleName}:${namespace}.${methodName}`,
            namespace,
            methodName,
            params: buildParamsFromCallable(property, property),
            returnType: { name: property.getReturnType().getText(property) },
            visibility: "public",
            sourceFile: filePath
          });
          continue;
        }

        if (Node.isShorthandPropertyAssignment(property)) {
          continue;
        }

        const assignedValue = property.getInitializer();
        if (!assignedValue) continue;

        if (Node.isArrowFunction(assignedValue) || Node.isFunctionExpression(assignedValue)) {
          emitMethod({
            id: `${moduleName}:${namespace}.${methodName}`,
            namespace,
            methodName,
            params: buildParamsFromCallable(assignedValue, assignedValue),
            returnType: { name: assignedValue.getReturnType().getText(assignedValue) },
            visibility: "public",
            sourceFile: filePath
          });
          continue;
        }

        if (!isMethodFactoryCall(assignedValue)) {
          continue;
        }

        const specPath = extractMethodFactoryPath(assignedValue);
        const params = specPath ? parsePathParams(specPath) : [];
        emitMethod({
          id: `${moduleName}:${namespace}.${methodName}`,
          namespace,
          methodName,
          params,
          returnType: { name: assignedValue.getType().getText(assignedValue) },
          visibility: "public",
          sourceFile: filePath
        });
      }
    }
  }

  for (const sourceFile of project.getSourceFiles()) {
    const filePath = sourceFile.getFilePath();
    if (filePath.endsWith(".d.ts")) continue;
    if (/(^|\/)(test|tests|__tests__)\//.test(filePath)) continue;

    for (const classDecl of sourceFile.getClasses()) {
      const moduleName = moduleNameFromPath(filePath);
      const namespace = classDecl.getName() ?? basename(filePath, ".ts");
      if (!shouldIncludeClass(filePath, classDecl.getName(), classDecl.isExported())) continue;
      for (const method of classDecl.getMethods()) {
        const methodName = method.getName();
        if (method.getScope() === Scope.Private || methodName.startsWith("_") || wrapperMethods.has(methodName)) continue;
        emitMethod({
          id: `${moduleName}:${namespace}.${methodName}`,
          namespace,
          methodName,
          params: buildParamsFromCallable(method, method),
          returnType: { name: method.getReturnType().getText(method) },
          visibility: "public",
          sourceFile: filePath
        });
      }
    }

    for (const fn of sourceFile.getFunctions()) {
      if (!fn.isExported()) continue;
      const moduleName = moduleNameFromPath(filePath);
      const namespace = basename(filePath, ".ts");
      const methodName = fn.getName();
      if (!methodName || methodName.startsWith("_")) continue;
      if (wrapperMethods.has(methodName)) continue;
      if (!shouldIncludeFunction(filePath, methodName)) continue;
      emitMethod({
        id: `${moduleName}:${methodName}`,
        namespace,
        methodName,
        params: buildParamsFromCallable(fn, fn),
        returnType: { name: fn.getReturnType().getText(fn) },
        visibility: "public",
        sourceFile: filePath
      });
    }

    extractExtendObjectMethods(filePath);
  }

  return output;
}
