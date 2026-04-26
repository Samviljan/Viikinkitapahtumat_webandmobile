/**
 * Resolve an image URL stored in the database for use in <img src>.
 * Local uploads are stored as relative paths like `/api/uploads/events/<id>.jpg`
 * — these need to be prefixed with REACT_APP_BACKEND_URL when rendered.
 * External URLs (`http(s)://…`) are returned unchanged.
 */
export function resolveImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const backend = process.env.REACT_APP_BACKEND_URL || "";
  return `${backend}${url}`;
}
