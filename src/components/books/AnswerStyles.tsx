"use client";

/**
 * Styling for saved answer HTML wherever it is rendered (`.sb-answer`).
 *
 * Answers come out of a Word-aware editor, so the markup can contain tables,
 * inline colours, font sizes and images — none of which Tailwind's `prose`
 * styles alone handle well, and tables in particular render as borderless
 * runs of text without this.
 *
 * `dark` switches the few colour decisions for the reader page's dark shell.
 */
export default function AnswerStyles({ dark = false }: { dark?: boolean }) {
  const border = dark ? "#3a3a3a" : "#e2e8f0";
  const headBg = dark ? "#1c1c1c" : "#f1f5f9";
  const muted = dark ? "#94a3b8" : "#64748b";

  return (
    <style jsx global>{`
      .sb-answer {
        overflow-wrap: anywhere;
      }

      /* Tables: a wide pasted table must scroll in its own box, never widen
         the page and push the reader sideways on a phone. */
      .sb-answer table {
        border-collapse: collapse;
        width: 100%;
        margin: 1rem 0;
        display: block;
        overflow-x: auto;
        white-space: nowrap;
      }
      @media (min-width: 640px) {
        .sb-answer table {
          display: table;
          white-space: normal;
        }
      }
      .sb-answer th,
      .sb-answer td {
        border: 1px solid ${border};
        padding: 8px 10px;
        vertical-align: top;
        text-align: left;
      }
      .sb-answer th {
        background: ${headBg};
        font-weight: 600;
      }

      .sb-answer img {
        max-width: 100%;
        height: auto;
        border-radius: 0.5rem;
        margin: 0.75rem 0;
      }

      /* Word's nested lists arrive as real ul/ol after the paste cleaner, but
         Tailwind's prose resets the markers past the first level. */
      .sb-answer ul {
        list-style: disc;
        padding-left: 1.35rem;
      }
      .sb-answer ol {
        list-style: decimal;
        padding-left: 1.35rem;
      }
      .sb-answer ul ul {
        list-style: circle;
      }
      .sb-answer ul ul ul {
        list-style: square;
      }
      .sb-answer ol ol {
        list-style: lower-alpha;
      }
      .sb-answer ol ol ol {
        list-style: lower-roman;
      }
      .sb-answer li {
        margin: 0.2rem 0;
      }
      .sb-answer li > p {
        margin: 0;
      }

      .sb-answer blockquote {
        border-left: 3px solid ${border};
        padding-left: 0.9rem;
        color: ${muted};
        font-style: normal;
      }

      .sb-answer mark {
        padding: 0 2px;
        border-radius: 2px;
        /* Highlights are pale by design; on the dark page the text on top of
           them has to flip or it disappears into the swatch. */
        ${dark ? "color: #0f172a;" : ""}
      }

      .sb-answer a {
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      .sb-answer hr {
        border: 0;
        border-top: 1px solid ${border};
        margin: 1.25rem 0;
      }
    `}</style>
  );
}
