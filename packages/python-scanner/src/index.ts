import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { basename, dirname, join, relative, resolve } from "node:path";
import type { SdkMethodSurface } from "@sdkdrift/core";
import { Project, Scope } from "ts-morph";

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
        output.push({
          id: `${moduleName}:${namespace}.${methodName}`,
          namespace,
          methodName,
          params: method.getParameters().map((param) => ({
            name: param.getName(),
            in: "query",
            required: !param.isOptional(),
            type: { name: param.getType().getText(param) }
          })),
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
      output.push({
        id: `${moduleName}:${methodName}`,
        namespace,
        methodName,
        params: fn.getParameters().map((param) => ({
          name: param.getName(),
          in: "query",
          required: !param.isOptional(),
          type: { name: param.getType().getText(param) }
        })),
        returnType: { name: fn.getReturnType().getText(fn) },
        visibility: "public",
        sourceFile: filePath
      });
    }
  }

  return output;
}
