import yaml from "js-yaml";

export function parseYaml<T>(source: string): T {
  return yaml.load(source) as T;
}

export function stringifyYaml(value: unknown): string {
  return yaml.dump(value, {
    lineWidth: 100,
    noRefs: true,
    sortKeys: false,
  });
}
