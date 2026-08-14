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
      /* Depth is only a guess at what the author meant. When the paste cleaner
         could read the real marker off the Word document it says so with a type
         attribute, and that has to beat the guess — a roman sub-list nested one
         deep is otherwise silently relettered a, b, c. */
      .sb-answer ol[type='1'] {
        list-style: decimal;
      }
      .sb-answer ol[type='a'] {
        list-style: lower-alpha;
      }
      .sb-answer ol[type='A'] {
        list-style: upper-alpha;
      }
      .sb-answer ol[type='i'] {
        list-style: lower-roman;
      }
      .sb-answer ol[type='I'] {
        list-style: upper-roman;
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
           them has to flip or it disappears into the swatch. Marked important
           because TipTap's Highlight writes color:inherit into the element's
           own style attribute, and an inline declaration outranks everything
           except this. */
        ${dark ? "color: #0f172a !important;" : ""}
      }
      ${
        dark
          ? `/* Word shades table cells and whole paragraphs too, and that arrives
             as an inline background rather than a <mark>. Same problem, so the
             same answer: anything that brought its own background gets dark
             text. An element that also brought its own colour still wins —
             that colour is inline and inline always beats a stylesheet. */
      .sb-answer [style*='background'] {
        color: #0f172a;
      }`
          : ""
      }

      /* A pasted Word document usually opens with its own Heading 1, which the
         editor now keeps. Left at prose's default it would shout louder than the
         question it is answering. */
      .sb-answer h1 {
        font-size: 1.35em;
        margin: 1.1em 0 0.5em;
      }
      .sb-answer h2 {
        font-size: 1.18em;
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
