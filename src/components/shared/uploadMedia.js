'use client';

/**
 * Upload one PUBLIC file to our own server and get its public URL back.
 *
 * Every admin form that takes a marketing asset (book cover, preview pages,
 * sample PDF) goes through here, so "pick a file from your computer" behaves
 * identically everywhere instead of each screen inventing its own half of the
 * flow.
 *
 * The endpoint is /book-content/upload-public, NOT /book-content/upload. The
 * latter now stores into the protected directory and hands back an
 * access-checked URL, which is right for answer figures and videos and wrong
 * for everything here: a cover has to load for a logged-out shopper and for
 * Facebook's link-preview crawler, and behind that check both get a 401 and a
 * broken image. Answer media is uploaded from the content editor and from
 * RichTextEditor, which call the protected route directly and must keep doing
 * so — do not "unify" them onto this one.
 *
 * XHR rather than fetch because these are cover scans on a home connection, and
 * fetch still cannot report upload progress.
 */

const API =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '') + '/api';

const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');

export function uploadMedia(file, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API}/book-content/upload-public`);
    xhr.setRequestHeader('Authorization', `Bearer ${token()}`);

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new Error('নেটওয়ার্ক সমস্যা — আপলোড হয়নি'));
    // Without these the promise never settles: the picker keeps spinning at
    // "আপলোড হচ্ছে 0%" and the admin is told nothing at all, which is how a
    // dead upload came to look like a frozen form.
    xhr.onabort = () => reject(new Error('আপলোড বাতিল হয়েছে'));
    xhr.ontimeout = () => reject(new Error('আপলোড সময়সীমা পেরিয়ে গেছে — আবার চেষ্টা করুন'));
    xhr.onload = () => {
      let body;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // A proxy that rejects an oversized body answers with HTML, not JSON.
        return reject(
          new Error(
            xhr.status === 413
              ? 'ফাইলটি সার্ভারের সীমার চেয়ে বড়'
              : `আপলোড ব্যর্থ (HTTP ${xhr.status})`
          )
        );
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.success) return resolve(body.data);
      // Pass the server's own wording through: "missing permission
      // 'content.write'", "File type not allowed" and an expired token each need
      // a different fix, and a blanket "আপলোড ব্যর্থ" sent all three to the same
      // dead end. globalErrorHandler puts the useful half of a validation
      // failure in errors[], so keep that too, and fall back to the status code
      // so there is always something to report.
      const detail = body.errors?.[0]?.message;
      return reject(
        new Error(
          [body.message, detail].filter(Boolean).join(' — ') ||
            `আপলোড ব্যর্থ (HTTP ${xhr.status})`
        )
      );
    };

    xhr.send(fd);
  });
}

/** Reject anything that isn't an image before wasting an upload on it. */
export const isImageFile = file =>
  Boolean(file) &&
  (file.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(file.name || ''));

/**
 * Same guard for PDFs.
 *
 * The name check is not redundant with the MIME check: a file dragged off the
 * Windows desktop often arrives with an empty `type`, so trusting MIME alone
 * would reject a perfectly good PDF.
 */
export const isPdfFile = file =>
  Boolean(file) && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || ''));

/** Human-readable file size for upload UIs. */
export const formatFileSize = bytes => {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
};
