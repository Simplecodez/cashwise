export class Cursor {
  static encode(cursor: string): string {
    return Buffer.from(cursor).toString('base64');
  }

  static decode(cursor: string): string {
    return Buffer.from(cursor, 'base64').toString('utf8');
  }
}
