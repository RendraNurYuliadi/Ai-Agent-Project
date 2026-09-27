"use client";

import React from "react";

interface FormattedMessageProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

/**
 * Normalizes literal backslash-n sequences (e.g. "\\n" from raw strings or JSON)
 * into real newline characters.
 */
export function normalizeLineBreaks(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n");
}

/**
 * Parses inline formatting like **bold**, *italic*, `code`, and [links](url).
 */
function parseInline(text: string, isUser: boolean = false): React.ReactNode[] {
  if (!text) return [];

  // Match bold (**text** or __text__), inline code (`text`), italic (*text* or _text_)
  const regex = /(\*\*.*?\*\*|__.*?__|`.*?`|\*.*?\*|_.*?_)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;

    // Bold **text** or __text__
    if (
      (part.startsWith("**") &&
        part.endsWith("**") &&
        part.length >= 4) ||
      (part.startsWith("__") &&
        part.endsWith("__") &&
        part.length >= 4)
    ) {
      return (
        <strong key={i} className={`font-semibold ${isUser ? "text-black" : "text-white"}`}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Inline code `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={i}
          className={`
            rounded-md
            px-1.5 py-0.5
            font-mono
            text-xs
            ${
              isUser
                ? "border border-neutral-300 bg-neutral-100 text-black"
                : "border border-neutral-800 bg-[#0a0a0a] text-neutral-300"
            }
          `}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Italic *text* or _text_
    if (
      (part.startsWith("*") &&
        part.endsWith("*") &&
        part.length >= 2 &&
        !part.startsWith("**")) ||
      (part.startsWith("_") &&
        part.endsWith("_") &&
        part.length >= 2 &&
        !part.startsWith("__"))
    ) {
      return (
        <em key={i} className={`italic ${isUser ? "text-neutral-800" : "text-neutral-300"}`}>
          {part.slice(1, -1)}
        </em>
      );
    }

    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

/**
 * FormattedMessage parses message content, converting literal `\n` to real line breaks,
 * styling bullet points, numbered lists, bold text, code blocks, and headers cleanly.
 */
export function FormattedMessage({
  content,
  className = "",
  isUser = false,
}: FormattedMessageProps) {
  if (!content) return null;

  const normalized = normalizeLineBreaks(content);
  const lines = normalized.split("\n");

  const elements: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    // 1. Code blocks (```code```)
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];

      index++;

      while (
        index < lines.length &&
        !lines[index].trim().startsWith("```")
      ) {
        codeLines.push(lines[index]);
        index++;
      }

      if (index < lines.length) index++;

      elements.push(
        <div
          key={`code-${index}`}
          className={`
            my-2
            overflow-x-auto
            rounded-xl
            border
            p-3
            font-mono
            text-xs
            ${
              isUser
                ? "border-neutral-300 bg-neutral-100 text-black"
                : "border-neutral-800 bg-[#050505] text-neutral-300"
            }
          `}
        >
          <pre>{codeLines.join("\n")}</pre>
        </div>
      );

      continue;
    }

    // 2. Unordered list item (- item, * item, • item)
    const bulletMatch = line.match(/^(\s*)[-*•]\s+(.*)$/);

    if (bulletMatch) {
      const listItems: string[] = [];

      while (index < lines.length) {
        const match = lines[index].match(/^(\s*)[-*•]\s+(.*)$/);

        if (match) {
          listItems.push(match[2]);
          index++;
        } else {
          break;
        }
      }

      elements.push(
        <ul
          key={`ul-${index}`}
          className="my-1.5 space-y-1 pl-1"
        >
          {listItems.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 leading-relaxed"
            >
              <span
                className={`
                  mt-1
                  select-none
                  text-xs
                  leading-none
                  ${isUser ? "text-neutral-700" : "text-neutral-500"}
                `}
              >
                •
              </span>

              <span className="flex-1">
                {parseInline(item, isUser)}
              </span>
            </li>
          ))}
        </ul>
      );

      continue;
    }

    // 3. Numbered list item (1. item, 2. item)
    const numberedMatch = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/);

    if (numberedMatch) {
      const numberedItems: {
        num: string;
        text: string;
      }[] = [];

      while (index < lines.length) {
        const match = lines[index].match(
          /^(\s*)(\d+)[.)]\s+(.*)$/
        );

        if (match) {
          numberedItems.push({
            num: match[2],
            text: match[3],
          });

          index++;
        } else {
          break;
        }
      }

      elements.push(
        <ol
          key={`ol-${index}`}
          className="my-1.5 space-y-1 pl-1"
        >
          {numberedItems.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 leading-relaxed"
            >
              <span
                className={`
                  mt-0.5
                  min-w-[1.2rem]
                  select-none
                  text-xs
                  font-semibold
                  ${isUser ? "text-neutral-700" : "text-neutral-500"}
                `}
              >
                {item.num}.
              </span>

              <span className="flex-1">
                {parseInline(item.text, isUser)}
              </span>
            </li>
          ))}
        </ol>
      );

      continue;
    }

    // 4. Headers (### Header)
    if (line.startsWith("### ")) {
      elements.push(
        <h4
          key={`h4-${index}`}
          className={`
            mt-2.5
            mb-1
            text-sm
            font-semibold
            ${isUser ? "text-black" : "text-neutral-300"}
          `}
        >
          {parseInline(line.slice(4), isUser)}
        </h4>
      );

      index++;
      continue;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h3
          key={`h3-${index}`}
          className={`
            mt-3
            mb-1
            text-sm
            font-bold
            ${isUser ? "text-black" : "text-white"}
          `}
        >
          {parseInline(line.slice(3), isUser)}
        </h3>
      );

      index++;
      continue;
    }

    // 5. Empty line (Paragraph break)
    if (line.trim() === "") {
      elements.push(
        <div
          key={`spacer-${index}`}
          className="h-2"
        />
      );

      index++;
      continue;
    }

    // 6. Regular paragraph line with whitespace-pre-wrap
    elements.push(
      <p
        key={`p-${index}`}
        className="leading-relaxed whitespace-pre-wrap"
      >
        {parseInline(line, isUser)}
      </p>
    );

    index++;
  }

  const defaultColor = isUser ? "text-black" : "text-neutral-300";

  return (
    <div className={`text-sm ${defaultColor} ${className}`}>
      {elements}
    </div>
  );
}