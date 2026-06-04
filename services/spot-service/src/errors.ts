/** Raised when a requested resource does not exist (mapped to HTTP 404). */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/** Raised when input fails validation (mapped to HTTP 400). */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
