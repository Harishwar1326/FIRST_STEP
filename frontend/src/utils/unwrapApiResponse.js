/** Unwrap `{ status, data, message }` envelopes from the backend API. */
export const unwrapApiResponse = (body) => {
  if (body && typeof body === 'object' && body.status === 'success' && body.data !== undefined) {
    return body.data
  }
  return body
}
