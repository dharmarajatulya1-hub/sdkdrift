#!/usr/bin/env python3
import ast
import json
import os
import sys
from typing import Any, Dict, List


def annotation_to_text(node: Any) -> str:
    if node is None:
        return "unknown"
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return f"{annotation_to_text(node.value)}.{node.attr}"
    if isinstance(node, ast.Subscript):
        return f"{annotation_to_text(node.value)}[{annotation_to_text(node.slice)}]"
    if isinstance(node, ast.Constant):
        return str(node.value)
    if hasattr(ast, "unparse"):
        try:
            return ast.unparse(node)
        except Exception:
            return "unknown"
    return "unknown"


def module_name_from_path(path: str, root: str) -> str:
    relative_path = os.path.relpath(path, root).replace("\\", "/")
    if relative_path.endswith(".py"):
        relative_path = relative_path[:-3]
    parts = [part for part in relative_path.split("/") if part and part != "__init__"]
    return ".".join(parts) if parts else "root"


def is_wrapper_class(namespace: str) -> bool:
    return (
        namespace.endswith("WithRawResponse")
        or namespace.endswith("WithStreamingResponse")
        or namespace.endswith("RawResponse")
        or namespace.endswith("StreamingResponse")
    )


def scan_file(path: str, root: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        source = f.read()
    tree = ast.parse(source, filename=path)
    module_name = module_name_from_path(path, root)

    methods: List[Dict[str, Any]] = []

    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            namespace = node.name
            if is_wrapper_class(namespace):
                continue
            lowered_path = path.lower()
            base_names: List[str] = []
            for base in node.bases:
                base_text = annotation_to_text(base)
                if base_text:
                    base_names.append(base_text)
            lowered_bases = [base.lower() for base in base_names]

            is_api_class = (
                namespace.endswith("Api")
                or namespace.endswith("API")
                or namespace.endswith("Service")
                or "/api/" in lowered_path
                or any("apiresource" in base for base in lowered_bases)
                or any(base.endswith("service") for base in lowered_bases)
                or any(base.endswith("api") for base in lowered_bases)
            )
            if not is_api_class:
                continue
            for item in node.body:
                if isinstance(item, ast.FunctionDef):
                    if item.name.startswith("_"):
                        continue
                    if item.name in ("with_raw_response", "with_streaming_response"):
                        continue
                    params = []
                    positional_args = [arg for arg in item.args.args if arg.arg != "self"]
                    required_cutoff = len(positional_args) - len(item.args.defaults)
                    for arg in item.args.args:
                        if arg.arg == "self":
                            continue
                        position = len(params)
                        params.append({
                            "name": arg.arg,
                            "in": "query",
                            "required": position < required_cutoff,
                            "type": {
                                "name": annotation_to_text(arg.annotation)
                            }
                        })

                    for idx, arg in enumerate(item.args.kwonlyargs):
                        required = item.args.kw_defaults[idx] is None
                        params.append({
                            "name": arg.arg,
                            "in": "query",
                            "required": required,
                            "type": {
                                "name": annotation_to_text(arg.annotation)
                            }
                        })
                    methods.append({
                        "id": f"{module_name}:{namespace}.{item.name}",
                        "namespace": namespace,
                        "methodName": item.name,
                        "params": params,
                        "visibility": "public",
                        "sourceFile": path,
                    })

    return methods


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python_ast_scan.py <sdk_root>", file=sys.stderr)
        return 1

    root = sys.argv[1]
    all_methods: List[Dict[str, Any]] = []

    for dirpath, _, filenames in os.walk(root):
        for name in filenames:
            if not name.endswith(".py"):
                continue
            if name.startswith("test_"):
                continue
            path = os.path.join(dirpath, name)
            try:
                all_methods.extend(scan_file(path, root))
            except Exception as exc:
                print(f"Warning: failed to parse {path}: {exc}", file=sys.stderr)

    print(json.dumps(all_methods))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
