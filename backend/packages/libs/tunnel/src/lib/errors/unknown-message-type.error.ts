export class UnknownMessageTypeError extends Error {
  constructor(public readonly type: string, public readonly direction: 'income' | 'outcome') {
    super(`No registered ${direction} handler for message type "${type}"`);
    this.name = 'UnknownMessageTypeError';
  }
}
