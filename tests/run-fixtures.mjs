import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const cli = "./packages/cli/dist/cli.js";

function runCase({ name, spec, sdk, lang, config, expectedCategories = [], expectedScore, minScore, expectExitCode }) {
  const args = [
    cli,
    "scan",
    "--spec",
    spec,
    "--sdk",
    sdk,
    "--lang",
    lang,
    "--format",
    "json"
  ];

  if (config) {
    args.push("--config", config);
  }
  if (typeof minScore === "number") {
    args.push("--min-score", String(minScore));
  }

  let stdout = "";
  let exitCode = 0;
  try {
    stdout = execFileSync("node", args, { encoding: "utf8" });
  } catch (error) {
    exitCode = error.status ?? 1;
    stdout = String(error.stdout ?? "");
  }

  if (typeof expectExitCode === "number") {
    assert.equal(exitCode, expectExitCode, `${name}: expected exit ${expectExitCode}, got ${exitCode}`);
  } else {
    assert.equal(exitCode, 0, `${name}: expected success`);
  }

  const report = JSON.parse(stdout);
  if (typeof expectedScore === 'number') {
    assert.equal(report.score, expectedScore, `${name}: unexpected score`);
  }

  const categories = report.findings.map((f) => f.category);
  for (const category of expectedCategories) {
    assert.ok(categories.includes(category), `${name}: missing category ${category}`);
  }

  console.log(`PASS ${name}: score=${report.score} findings=${report.findings.length}`);
}

function runConfigErrorCase({ name, spec, sdk, lang, config, expectedError }) {
  const args = [cli, "scan", "--spec", spec, "--sdk", sdk, "--lang", lang, "--format", "json", "--config", config];

  let stderr = "";
  let exitCode = 0;
  try {
    execFileSync("node", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    exitCode = error.status ?? 1;
    stderr = String(error.stderr ?? "");
  }

  assert.equal(exitCode, 1, `${name}: expected CLI error exit code 1`);
  assert.match(stderr, new RegExp(expectedError), `${name}: expected error message match`);
  console.log(`PASS ${name}: config validation error surfaced`);
}

runCase({
  name: "missing-endpoint",
  spec: "./fixtures/cases/missing-endpoint/openapi.yaml",
  sdk: "./fixtures/cases/missing-endpoint/sdk/python",
  lang: "python",
  expectedCategories: ["missing_endpoint"]
});

runCase({
  name: "required-param",
  spec: "./fixtures/cases/required-param/openapi.yaml",
  sdk: "./fixtures/cases/required-param/sdk/python",
  lang: "python",
  expectedCategories: ["required_field_added"]
});

runCase({
  name: "type-mismatch",
  spec: "./fixtures/cases/type-mismatch/openapi.yaml",
  sdk: "./fixtures/cases/type-mismatch/sdk/python",
  lang: "python",
  expectedCategories: ["type_mismatch"]
});

runCase({
  name: "override",
  spec: "./fixtures/cases/override/openapi.yaml",
  sdk: "./fixtures/cases/override/sdk/python",
  lang: "python",
  config: "./fixtures/cases/override/sdkdrift.config.yaml",
  expectedScore: 100
});

runCase({
  name: "ts-basic",
  spec: "./fixtures/cases/ts-basic/openapi.yaml",
  sdk: "./fixtures/cases/ts-basic/sdk/ts",
  lang: "ts",
  expectedScore: 100
});

runCase({
  name: "heuristic-nested",
  spec: "./fixtures/cases/heuristic-nested/openapi.yaml",
  sdk: "./fixtures/cases/heuristic-nested/sdk/python",
  lang: "python",
  expectedScore: 100
});

runCase({
  name: "optional-param",
  spec: "./fixtures/cases/optional-param/openapi.yaml",
  sdk: "./fixtures/cases/optional-param/sdk/python",
  lang: "python",
  expectedCategories: ["changed_param"]
});

runCase({
  name: "param-casing",
  spec: "./fixtures/cases/param-casing/openapi.yaml",
  sdk: "./fixtures/cases/param-casing/sdk/ts",
  lang: "ts",
  expectedScore: 100
});

runCase({
  name: "python-annotated",
  spec: "./fixtures/cases/python-annotated/openapi.yaml",
  sdk: "./fixtures/cases/python-annotated/sdk/python",
  lang: "python",
  expectedScore: 100
});

runCase({
  name: "threshold-exit",
  spec: "./fixtures/cases/missing-endpoint/openapi.yaml",
  sdk: "./fixtures/cases/missing-endpoint/sdk/python",
  lang: "python",
  minScore: 95,
  expectExitCode: 2
});

runConfigErrorCase({
  name: "invalid-config",
  spec: "./fixtures/cases/invalid-config/openapi.yaml",
  sdk: "./fixtures/cases/invalid-config/sdk/python",
  lang: "python",
  config: "./fixtures/cases/invalid-config/sdkdrift.config.yaml",
  expectedError: "heuristicThreshold must be a number between 0 and 1"
});

console.log("All fixture tests passed.");
