export class HttpError extends Error {
  constructor(status, statusText, bodySnippet = '') {
    const note = bodySnippet ? ` – ${bodySnippet}` : '';
    super(`HTTP ${status} ${statusText}${note}`);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
  }
}
