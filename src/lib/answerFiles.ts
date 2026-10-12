/**
 * Links to the files attached to a book answer — PDFs, figures, videos.
 */

export type AnswerFile = { title: string; fileUrl: string; fileType?: string };

export const isPdfAttachment = (a: AnswerFile) =>
  /\.pdf(\?|#|$)/i.test(a.fileUrl) || (a.fileType || "").toLowerCase() === "pdf";

/** Uploaded answer files live behind this route; anything else is an outside link. */
export const isOurFile = (url: string) => /\/api\/book-content\/media\//.test(url);

/**
 * Every link to our own uploads, made relative to THIS site.
 *
 * An upload's address is stored whole, host included, and the host is whatever
 * the server was called when the file went up. Files from the shop's first
 * months carry the old server's address — and that server is gone ("no
 * available server"), so a figure or PDF stored that way never loads, however
 * healthy the file is on the new one. Stripping the host sends every one of
 * them through this site's own /api and /uploads proxy, to the server that
 * actually has them. The database is not touched; only what the page renders.
 */
const OUR_UPLOAD_HOST = /https?:\/\/[^/\s"'<>\\]+(?=\/(?:api\/book-content\/media|uploads\/materials)\/)/g;

export function onThisSite<T>(payload: T): T {
  if (payload == null) return payload;
  return JSON.parse(JSON.stringify(payload).replace(OUR_UPLOAD_HOST, "")) as T;
}

/**
 * The link that makes the phone SAVE a file instead of opening it.
 *
 * Opening it was the problem: Android Chrome shows a PDF in a tab only after
 * the whole file has arrived, so tapping "download" on a large answer PDF left
 * the reader on a blank grey page with no progress — and, if the signal
 * dropped, there for good. ?download=1 has the server send it as an attachment
 * (named after its title), which goes to the phone's download manager: a
 * progress bar in the notifications, carries on in the background, ends up in
 * Downloads. Kept same-site (path only) so the `download` attribute applies too.
 */
export function downloadLink(fileUrl: string, name: string): string {
  if (!isOurFile(fileUrl)) return fileUrl;
  try {
    const u = new URL(fileUrl, "https://magicviva.com");
    u.searchParams.set("download", "1");
    if (name) u.searchParams.set("name", name);
    return `${u.pathname}${u.search}`;
  } catch {
    return fileUrl;
  }
}

/** The name the saved file gets, extension included. */
export function fileNameFor(a: Pick<AnswerFile, "title" | "fileUrl">): string {
  const ext = (a.fileUrl.split("?")[0].match(/\.([a-z0-9]{2,5})$/i)?.[1] || "").toLowerCase();
  const title = (a.title || "file").trim();
  return ext && !title.toLowerCase().endsWith(`.${ext}`) ? `${title}.${ext}` : title;
}
