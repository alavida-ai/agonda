export class AgondaError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number,
    public readonly details?: string[],
  ) {
    super(message);
  }
}

export class RepoError extends AgondaError {
  constructor(message = "Error: not inside an Agonda repository") {
    super(message, 1);
  }
}

export class ValidationError extends AgondaError {
  constructor(message: string, details: string[] = []) {
    super(message, 2, details);
  }
}

export function isAgondaError(error: unknown): error is AgondaError {
  return error instanceof AgondaError;
}
