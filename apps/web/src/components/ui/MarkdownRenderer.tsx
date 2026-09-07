"use client";

import Prism from "prismjs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

import "prismjs/components/prism-markup";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-css";
import "prismjs/components/prism-java";
import "prismjs/components/prism-python";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-yaml";

export function MarkdownRenderer({ children }: { children: string }) {
  return (
    <article className="selaura-markdown max-w-none text-sm leading-7 text-[var(--foreground)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 mt-0 border-b border-[var(--border)] pb-3 text-3xl font-bold tracking-tight">
              {children}
            </h1>
          ),

          h2: ({ children }) => (
            <h2 className="mb-3 mt-8 border-b border-[var(--border)] pb-2 text-2xl font-bold">
              {children}
            </h2>
          ),

          h3: ({ children }) => (
            <h3 className="mb-2 mt-6 text-xl font-bold">{children}</h3>
          ),

          h4: ({ children }) => (
            <h4 className="mb-2 mt-5 text-lg font-semibold">{children}</h4>
          ),

          h5: ({ children }) => (
            <h5 className="mb-2 mt-5 text-base font-semibold">{children}</h5>
          ),

          h6: ({ children }) => (
            <h6 className="mb-2 mt-5 text-sm font-semibold">{children}</h6>
          ),

          p: ({ children }) => <p className="mb-4">{children}</p>,

          strong: ({ children }) => (
            <strong className="font-bold">{children}</strong>
          ),

          em: ({ children }) => <em className="italic">{children}</em>,

          u: ({ children }) => (
            <u className="underline underline-offset-2">{children}</u>
          ),

          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={[
                "font-medium",
                "text-[var(--foreground)]",
                "underline",
                "underline-offset-2",
                "decoration-[var(--foreground)]/40",
                "transition-colors",
                "hover:decoration-[var(--foreground)]",
              ].join(" ")}
            >
              {children}
            </a>
          ),

          img: ({ src, alt }) => (
            <span className="my-5 block">
              {}
              <img
                src={src}
                alt={alt ?? ""}
                loading="lazy"
                className={[
                  "max-h-[600px]",
                  "max-w-full",
                  "rounded-xl",
                  "border border-[var(--border)]",
                  "object-contain",
                ].join(" ")}
              />
            </span>
          ),

          ul: ({ children }) => (
            <ul className="mb-4 ml-6 list-disc space-y-1">{children}</ul>
          ),

          ol: ({ children }) => (
            <ol className="mb-4 ml-6 list-decimal space-y-1">{children}</ol>
          ),

          li: ({ children }) => <li className="pl-1">{children}</li>,

          blockquote: ({ children }) => (
            <blockquote className="mb-4 border-l-4 border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--muted)]">
              {children}
            </blockquote>
          ),

          pre: ({ children }) => (
            <pre
              className={[
                "mb-5",
                "overflow-x-auto",
                "rounded-xl",
                "border border-[var(--border)]",
                "bg-[var(--surface)]",
                "p-4",
              ].join(" ")}
            >
              {children}
            </pre>
          ),

          code: ({ className, children }) => {
            const language = normalizeLanguage(className);

            const raw = String(children ?? "").replace(/\n$/, "");

            if (!language) {
              return (
                <code
                  className={[
                    "font-mono",
                    "text-xs",
                    "leading-6",
                    "text-[var(--foreground)]",
                    "whitespace-pre",
                  ].join(" ")}
                >
                  {raw}
                </code>
              );
            }

            return <HighlightedCode code={raw} language={language} />;
          },

          hr: () => <hr className="my-7 border-[var(--border)]" />,

          table: ({ children }) => (
            <div className="mb-5 overflow-x-auto">
              <table className="w-full border-collapse">{children}</table>
            </div>
          ),

          thead: ({ children }) => (
            <thead className="bg-[var(--surface)]">{children}</thead>
          ),

          th: ({ children }) => (
            <th className="border border-[var(--border)] px-3 py-2 text-left font-semibold">
              {children}
            </th>
          ),

          td: ({ children }) => (
            <td className="border border-[var(--border)] px-3 py-2">
              {children}
            </td>
          ),

          del: ({ children }) => (
            <del className="text-[var(--muted)]">{children}</del>
          ),

          input: ({ type, checked, disabled }) => {
            if (type !== "checkbox") {
              return null;
            }

            return (
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                readOnly
                className="mr-2"
              />
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </article>
  );
}

function HighlightedCode({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const grammar = Prism.languages[language];

  if (!grammar) {
    return (
      <code
        className={[
          "font-mono",
          "text-xs",
          "leading-6",
          "whitespace-pre",
          "text-[var(--foreground)]",
        ].join(" ")}
      >
        {code}
      </code>
    );
  }

  const highlighted = Prism.highlight(code, grammar, language);

  return (
    <code
      className={["font-mono", "text-xs", "leading-6", "whitespace-pre"].join(
        " ",
      )}
      dangerouslySetInnerHTML={{
        __html: highlighted,
      }}
    />
  );
}

function normalizeLanguage(className?: string): string | undefined {
  if (!className) {
    return undefined;
  }

  const match = className.match(/(?:^|\s)language-([^\s]+)/);

  if (!match) {
    return undefined;
  }

  const language = match[1].toLowerCase();

  const aliases: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",

    ts: "typescript",
    tsx: "typescript",

    py: "python",

    sh: "bash",
    shell: "bash",
    zsh: "bash",

    yml: "yaml",

    md: "markdown",

    html: "markup",
    xml: "markup",
    svg: "markup",

    c: "c",
    h: "c",

    cpp: "cpp",
    cxx: "cpp",
    cc: "cpp",
    hpp: "cpp",
    hxx: "cpp",

    cs: "csharp",
  };

  const normalized = aliases[language] ?? language;

  return Prism.languages[normalized] ? normalized : undefined;
}
