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


def scan_file(path: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        source = f.read()
    tree = ast.parse(source, filename=path)

    methods: List[Dict[str, Any]] = []

    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            namespace = node.name
            for item in node.body:
                if isinstance(item, ast.FunctionDef):
                    if item.name.startswith("_"):
                        continue
                    params = []
                    for arg in item.args.args:
                        if arg.arg == "self":
                            continue
                        params.append({
                            "name": arg.arg,
                            "in": "query",
                            "required": True,
                            "type": {
                                "name": annotation_to_text(arg.annotation)
                            }
                        })
                    methods.append({
                        "id": f"{namespace}.{item.name}",
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
                all_methods.extend(scan_file(path))
            except Exception as exc:
                print(f"Warning: failed to parse {path}: {exc}", file=sys.stderr)

    print(json.dumps(all_methods))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
