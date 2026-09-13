/**
 * A video link as the shop pastes it, turned into one an <iframe> can play.
 *
 * YouTube does not let its own pages sit inside another site. A watch page, a
 * Shorts page and a live page all refuse to be framed, and the reader gets a
 * grey "this page might be temporarily down" box where the video should be.
 * Only the /embed/ player can be framed, so every YouTube link is rewritten to
 * it before it reaches the iframe.
 *
 * This used to be two private copies — the QR page and the admin preview — and
 * both knew youtu.be/ID and watch?v=ID and nothing else. A Short's Share button
 * gives youtube.com/shorts/ID, which went into the frame untouched, so every
 * Short a question carried showed that grey box. One copy now, so the page a
 * reader scans and the preview an admin checks cannot drift apart again.
 *
 * Host matching is the same loose `includes` as before, and anything that is
 * neither YouTube nor Vimeo is returned exactly as given: the only links whose
 * result changes are the ones that were broken.
 */
export function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      // A Short, a live stream and the old /v/ player carry the id as the path
      // segment after their kind. /embed/ is playable already and falls through
      // untouched, so a ?start= the shop added to it survives.
      const inPath = u.pathname.match(/^\/(?:shorts|live|v)\/([\w-]+)/);
      if (inPath) return `https://www.youtube.com/embed/${inPath[1]}`;
    }
    if (u.hostname.includes('vimeo.com')) {
      return `https://player.vimeo.com/video${u.pathname}`;
    }
  } catch {
    /* fall through to the raw url */
  }
  return url;
}

/**
 * Is this a YouTube Short — a video shot upright, 9:16?
 *
 * Only the /shorts/ link says so. A Short shared as a youtu.be or watch link
 * cannot be told apart from any other video, and keeps the ordinary frame.
 */
export function isVerticalVideo(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes('youtube.com') && u.pathname.startsWith('/shorts/');
  } catch {
    return false;
  }
}
