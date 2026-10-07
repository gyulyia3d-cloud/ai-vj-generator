#!/usr/bin/env python3
"""Validate a JSON file against a JSON Schema with no third-party package (a small, honest subset).

  python schema_check.py <schema.json> <file.json>
  python schema_check.py project <file.json>     # uses ../schema/project.schema.json
  python schema_check.py brief <file.json>       # uses ../schema/brief.schema.json

Supported keywords: type, enum, required, properties, additionalProperties (false), items, minItems, maxItems,
minLength, minimum, maximum, pattern. Anything else in a schema is ignored (and the schema files only use these).
Exit code 0 = valid, 1 = invalid (one line per problem, with the JSON path), 2 = cannot read a file.
Why it exists: any AI, form or CI can check structure without `pip install jsonschema`; deeper rules live in validate_project.py.
"""
import json, os, re, sys

sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMAS = {"project": "project.schema.json", "brief": "brief.schema.json"}
TYPES = {"object": dict, "array": list, "string": str, "boolean": bool, "null": type(None)}


def is_type(v, t):
    if t == "number":
        return isinstance(v, (int, float)) and not isinstance(v, bool)
    if t == "integer":
        return (isinstance(v, int) and not isinstance(v, bool)) or (isinstance(v, float) and v.is_integer())
    return isinstance(v, TYPES[t])


def check(v, s, path, out):
    t = s.get("type")
    if t and not is_type(v, t):
        out.append(f"{path}: expected {t}, got {type(v).__name__}")
        return
    if "enum" in s and v not in s["enum"]:
        out.append(f"{path}: {v!r} is not one of {s['enum']}")
    if isinstance(v, str):
        if "minLength" in s and len(v) < s["minLength"]:
            out.append(f"{path}: shorter than {s['minLength']} characters")
        if "pattern" in s and not re.search(s["pattern"], v):
            out.append(f"{path}: {v!r} does not match {s['pattern']}")
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        if "minimum" in s and v < s["minimum"]:
            out.append(f"{path}: {v} is below {s['minimum']}")
        if "maximum" in s and v > s["maximum"]:
            out.append(f"{path}: {v} is above {s['maximum']}")
    if isinstance(v, dict):
        for k in s.get("required", []):
            if k not in v:
                out.append(f"{path}: missing required '{k}'")
        props = s.get("properties", {})
        for k, sub in props.items():
            if k in v:
                check(v[k], sub, f"{path}.{k}", out)
        if s.get("additionalProperties") is False:
            for k in v:
                if k not in props:
                    out.append(f"{path}: unknown property '{k}'")
    if isinstance(v, list):
        if "minItems" in s and len(v) < s["minItems"]:
            out.append(f"{path}: needs at least {s['minItems']} item(s)")
        if "maxItems" in s and len(v) > s["maxItems"]:
            out.append(f"{path}: at most {s['maxItems']} item(s)")
        if "items" in s:
            for i, x in enumerate(v):
                check(x, s["items"], f"{path}[{i}]", out)


def validate(schema, data):
    out = []
    check(data, schema, "$", out)
    return out


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    sp = sys.argv[1]
    sp = os.path.join(HERE, "..", "schema", SCHEMAS[sp]) if sp in SCHEMAS else sp
    try:
        schema = json.load(open(sp, encoding="utf-8"))
        data = json.load(open(sys.argv[2], encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as ex:
        print(f"cannot read: {ex}")
        sys.exit(2)
    errs = validate(schema, data)
    for e in errs:
        print("ERROR", e)
    print("valid" if not errs else f"{len(errs)} problem(s)")
    sys.exit(1 if errs else 0)


if __name__ == "__main__":
    main()
