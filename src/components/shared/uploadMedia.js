'use client';

/**
 * Upload one file to our own server and get its public URL back.
 *
 * Every admin form that takes an image (book cover, preview pages, site logo)
 * goes through here, so "pick a file from your computer" behaves identically
 * everywhere instead of each screen inventing its own half of the flow.
 *
 * XHR rather than fetch because these are cover scans and short videos on a
 * home connection, and fetch still cannot report upload progress.
 */

const API =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '') + '/api';

const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');

export function uploadMedia(file, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API}/book-content/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token()}`);

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new Error('নেটওয়ার্ক সমস্যা — আপলোড হয়নি'));
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
      if (xhr.status >= 200 && xhr.status < 300 && body.success) resolve(body.data);
      else reject(new Error(body.message || 'আপলোড ব্যর্থ হয়েছে'));
    };

    xhr.send(fd);
  });
}

/** Reject anything that isn't an image before wasting an upload on it. */
export const isImageFile = file =>
  Boolean(file) &&
  (file.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(file.name || ''));
