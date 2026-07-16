/** Internal Discord dependency failure carrying retry classification. */
export class DiscordRequestFailureError extends Error {
  readonly retryAfterMilliseconds: number | undefined;
  readonly retryable: boolean;

  constructor(
    message: string,
    retryable: boolean,
    retryAfterMilliseconds?: number,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "DiscordRequestFailureError";
    this.retryAfterMilliseconds = retryAfterMilliseconds;
    this.retryable = retryable;
  }
}
