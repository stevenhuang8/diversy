export class MissingVariableError extends Error {
  variable: string;

  constructor(variable: string) {
    super(`Template variable "${variable}" is missing or empty`);
    this.name = "MissingVariableError";
    this.variable = variable;
  }
}

/**
 * Fills "{{name}}" placeholders in compliance-approved copy.
 * Nothing else in the template may change.
 */
export function render(template: string, vars: Record<string, string | undefined>): string {
  let output = template;
  for (const [name, value] of Object.entries(vars)) {
    output = output.replace(`{{${name}}}`, String(value));
  }
  return output;
}
