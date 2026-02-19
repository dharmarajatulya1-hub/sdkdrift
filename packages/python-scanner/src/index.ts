import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { SdkMethodSurface } from "@sdkdrift/core";

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
  return [];
}
