import boxen from "boxen";
import chalk from "chalk";
import figures from "figures";
import stringWidth from "string-width";

export const brand = {
  accent: chalk.hex("#2F6FED"),
  success: chalk.green,
  warning: chalk.yellow,
  danger: chalk.red,
  muted: chalk.gray,
  strong: chalk.bold,
};

export function brandBanner(title: string, subtitle?: string): string {
  const lines = [brand.strong(brand.accent(title))];
  if (subtitle) {
    lines.push(brand.muted(subtitle));
  }

  return boxen(lines.join("\n"), {
    borderStyle: "round",
    borderColor: "blue",
    padding: { top: 0, right: 1, bottom: 0, left: 1 },
    margin: { top: 0, right: 0, bottom: 1, left: 0 },
  });
}

export function sectionTitle(title: string, meta?: string): string {
  return meta
    ? `${brand.strong(title)} ${brand.muted(meta)}`
    : brand.strong(title);
}

export function symbol(kind: "success" | "warning" | "error" | "info"): string {
  if (kind === "success") return brand.success(figures.tick);
  if (kind === "warning") return brand.warning(figures.warning);
  if (kind === "error") return brand.danger(figures.cross);
  return brand.accent(figures.pointer);
}

export function truncateText(value: string, width: number): string {
  if (stringWidth(value) <= width) {
    return value;
  }

  let output = "";
  for (const character of value) {
    if (stringWidth(`${output}${character}…`) > width) {
      break;
    }
    output += character;
  }

  return `${output}…`;
}

export function padText(value: string, width: number): string {
  const padding = Math.max(0, width - stringWidth(value));
  return `${value}${" ".repeat(padding)}`;
}

export function subtle(value: string): string {
  return brand.muted(value);
}
