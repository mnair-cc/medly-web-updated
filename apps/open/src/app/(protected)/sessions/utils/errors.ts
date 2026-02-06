export class ForbiddenError extends Error {
  public status: number;
  public detail?: unknown;

  constructor(message: string = "Access denied", detail?: unknown) {
    super(message);
    this.name = "ForbiddenError";
    this.status = 403;
    this.detail = detail;
  }
}

export function isForbiddenError(error: unknown): boolean {
  if (error instanceof ForbiddenError) return true;
  const message = (error as { message?: unknown })?.message;
  return (
    typeof message === "string" &&
    message.toLowerCase().includes("access denied")
  );
}
