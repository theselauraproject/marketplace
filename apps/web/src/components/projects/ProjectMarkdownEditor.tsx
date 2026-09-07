"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Editor from "react-simple-code-editor";
import Prism from "prismjs";

import "prismjs/components/prism-markdown";

import {
  Bold,
  Code2,
  Eye,
  Heading1,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
  Split,
  Underline,
} from "lucide-react";

import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

interface ProjectMarkdownEditorProps {
  value: string;
  onChange: React.Dispatch<React.SetStateAction<string>>;
  placeholder?: string;
}

type EditorMode = "write" | "preview" | "split";

type SavedSelection = {
  start: number;
  end: number;
};

export function ProjectMarkdownEditor({
  value,
  onChange,
  placeholder = "Write your project description...",
}: ProjectMarkdownEditorProps) {
  const [mode, setMode] = useState<EditorMode>("write");

  const [linkDialog, setLinkDialog] = useState(false);

  const [imageDialog, setImageDialog] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const savedSelection = useRef<SavedSelection | null>(null);

  function saveSelection() {
    const textarea = editorRef.current;

    if (!textarea) {
      return null;
    }

    const selection = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };

    savedSelection.current = selection;

    return selection;
  }

  function getSelection() {
    const textarea = editorRef.current;

    if (!textarea) {
      return null;
    }

    const saved = savedSelection.current;

    const start = saved?.start ?? textarea.selectionStart;

    const end = saved?.end ?? textarea.selectionEnd;

    return {
      textarea,
      start,
      end,
      selected: value.slice(start, end),
    };
  }

  function restoreSelection(start: number, end: number = start) {
    requestAnimationFrame(() => {
      const textarea = editorRef.current;

      if (!textarea) {
        return;
      }

      textarea.focus();

      textarea.setSelectionRange(start, end);

      savedSelection.current = {
        start,
        end,
      };
    });
  }

  function replaceSelection(before: string, after = "", defaultText = "") {
    const selection = getSelection();

    if (!selection) {
      return;
    }

    const { start, end, selected } = selection;

    const content = selected || defaultText;

    const replacement = before + content + after;

    const nextValue = value.slice(0, start) + replacement + value.slice(end);

    onChange(nextValue);

    restoreSelection(
      start + before.length,
      start + before.length + content.length,
    );
  }

  function insertAtCursor(text: string, selectionOffset = text.length) {
    const selection = getSelection();

    if (!selection) {
      return;
    }

    const { start, end } = selection;

    const nextValue = value.slice(0, start) + text + value.slice(end);

    onChange(nextValue);

    restoreSelection(start + selectionOffset);
  }

  function insertLine(prefix: string) {
    const selection = getSelection();

    if (!selection) {
      return;
    }

    const { start, end, selected } = selection;

    const replacement = selected
      ? selected
          .split("\n")
          .map((line) => `${prefix}${line}`)
          .join("\n")
      : prefix;

    const nextValue = value.slice(0, start) + replacement + value.slice(end);

    onChange(nextValue);

    restoreSelection(start, start + replacement.length);
  }

  function insertBold() {
    replaceSelection("**", "**", "bold");
  }

  function insertItalic() {
    replaceSelection("*", "*", "italic");
  }

  function insertUnderline() {
    replaceSelection("<u>", "</u>", "underline");
  }

  function insertHeading() {
    insertLine("# ");
  }

  function insertInlineCode() {
    replaceSelection("`", "`", "code");
  }

  function insertCodeBlock() {
    const selection = getSelection();

    if (!selection) {
      return;
    }

    const { start, end, selected } = selection;

    const replacement = selected ? `\`\`\`\n${selected}\n\`\`\`` : "```\n\n```";

    const nextValue = value.slice(0, start) + replacement + value.slice(end);

    onChange(nextValue);

    if (selected) {
      restoreSelection(start + 4, start + 4 + selected.length);
    } else {
      restoreSelection(start + 4);
    }
  }

  function openLinkDialog() {
    saveSelection();
    setLinkDialog(true);
  }

  function openImageDialog() {
    saveSelection();
    setImageDialog(true);
  }

  function insertLinkFromDialog(url: string, text: string) {
    const selection = getSelection();

    if (!selection) {
      return;
    }

    const { start, end, selected } = selection;

    const linkText = text.trim() || selected || "link";

    const markdown = `[${linkText}](${url.trim()})`;

    const nextValue = value.slice(0, start) + markdown + value.slice(end);

    onChange(nextValue);
    setLinkDialog(false);

    savedSelection.current = null;

    restoreSelection(start + markdown.length);
  }

  function insertImageFromDialog(url: string, alt: string) {
    const selection = getSelection();

    if (!selection) {
      return;
    }

    const { start, end } = selection;

    const cleanUrl = url.trim();

    if (!cleanUrl) {
      return;
    }

    const markdown = `![${alt.trim() || "image"}](${cleanUrl})`;

    const nextValue = value.slice(0, start) + markdown + value.slice(end);

    onChange(nextValue);
    setImageDialog(false);

    savedSelection.current = null;

    restoreSelection(start + markdown.length);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    const dataTransfer = event.dataTransfer;

    const html = dataTransfer.getData("text/html");

    if (html) {
      const image = extractImageFromHtml(html);

      if (image) {
        event.preventDefault();

        insertAtCursor(`![${image.alt || "image"}](${image.src})`);

        return;
      }
    }

    const uri = dataTransfer.getData("text/uri-list");

    if (uri) {
      const imageUrl = firstValidUrl(uri);

      if (imageUrl) {
        event.preventDefault();

        insertAtCursor(`![image](${imageUrl})`);

        return;
      }
    }

    const text = dataTransfer.getData("text/plain");

    if (text) {
      const imageUrl = firstValidUrl(text);

      if (imageUrl && isHttpUrl(imageUrl)) {
        event.preventDefault();

        insertAtCursor(`![image](${imageUrl})`);

        return;
      }
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (
      event.dataTransfer.types.includes("text/html") ||
      event.dataTransfer.types.includes("text/uri-list")
    ) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const html = event.clipboardData.getData("text/html");

    if (!html) {
      return;
    }

    const image = extractImageFromHtml(html);

    if (!image) {
      return;
    }

    event.preventDefault();

    insertAtCursor(`![${image.alt || "image"}](${image.src})`);
  }

  return (
    <>
      <div
        className={[
          "overflow-hidden",
          "rounded-2xl",
          "border border-[var(--border)]",
          "bg-[var(--background)]",
          "shadow-sm",
        ].join(" ")}
      >
        <div
          className={[
            "flex flex-wrap",
            "items-center justify-between",
            "gap-3",
            "border-b border-[var(--border)]",
            "bg-[var(--surface)]",
            "px-3 py-2",
          ].join(" ")}
        >
          <div className="flex flex-wrap items-center gap-0.5">
            <ToolbarButton label="Bold" onClick={insertBold}>
              <Bold size={15} />
            </ToolbarButton>

            <ToolbarButton label="Italic" onClick={insertItalic}>
              <Italic size={15} />
            </ToolbarButton>

            <ToolbarButton label="Underline" onClick={insertUnderline}>
              <Underline size={15} />
            </ToolbarButton>

            <ToolbarButton label="Code block" onClick={insertCodeBlock}>
              <span className="text-[11px] font-bold">{"</>"}</span>
            </ToolbarButton>

            <ToolbarButton label="Heading" onClick={insertHeading}>
              <Heading1 size={15} />
            </ToolbarButton>

            <ToolbarButton label="Link" onClick={openLinkDialog}>
              <Link size={15} />
            </ToolbarButton>

            <ToolbarButton label="Image URL" onClick={openImageDialog}>
              <Image size={15} />
            </ToolbarButton>

            <ToolbarButton label="Quote" onClick={() => insertLine("> ")}>
              <Quote size={15} />
            </ToolbarButton>

            <ToolbarButton label="Bullet list" onClick={() => insertLine("- ")}>
              <List size={15} />
            </ToolbarButton>

            <ToolbarButton
              label="Numbered list"
              onClick={() => insertLine("1. ")}
            >
              <ListOrdered size={15} />
            </ToolbarButton>

            <ToolbarButton label="Inline code" onClick={insertInlineCode}>
              <Code2 size={15} />
            </ToolbarButton>

            <ToolbarButton label="Code block" onClick={insertCodeBlock}>
              <span className="text-[11px] font-bold">{"</>"}</span>
            </ToolbarButton>

            <ToolbarButton
              label="Horizontal rule"
              onClick={() => insertLine("---")}
            >
              <Minus size={15} />
            </ToolbarButton>
          </div>

          <div
            className={[
              "flex items-center",
              "rounded-lg",
              "border border-[var(--border)]",
              "bg-[var(--background)]",
              "p-0.5",
            ].join(" ")}
          >
            <ViewButton
              active={mode === "write"}
              onClick={() => setMode("write")}
              label="Write"
            >
              <Code2 size={14} />
              <span className="hidden sm:inline">Write</span>
            </ViewButton>

            <ViewButton
              active={mode === "preview"}
              onClick={() => setMode("preview")}
              label="Preview"
            >
              <Eye size={14} />
              <span className="hidden sm:inline">Preview</span>
            </ViewButton>

            <ViewButton
              active={mode === "split"}
              onClick={() => setMode("split")}
              label="Split"
            >
              <Split size={14} />
              <span className="hidden sm:inline">Split</span>
            </ViewButton>
          </div>
        </div>

        {mode === "write" && (
          <MarkdownCodeEditor
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            editorRef={editorRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onPaste={handlePaste}
          />
        )}

        {mode === "preview" && <PreviewPane value={value} />}

        {mode === "split" && (
          <div className="grid min-w-0 md:grid-cols-2">
            <div className="min-w-0 border-b border-[var(--border)] md:border-b-0 md:border-r">
              <MarkdownCodeEditor
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                editorRef={editorRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onPaste={handlePaste}
              />
            </div>

            <div className="min-w-0">
              <PreviewPane value={value} split />
            </div>
          </div>
        )}
      </div>

      {linkDialog && (
        <MarkdownDialog
          title="Insert link"
          label="URL"
          placeholder="https://example.com"
          secondaryLabel="Link text"
          secondaryPlaceholder="Link text"
          onCancel={() => setLinkDialog(false)}
          onSubmit={insertLinkFromDialog}
        />
      )}

      {imageDialog && (
        <MarkdownDialog
          title="Insert image"
          label="Image URL"
          placeholder="https://example.com/image.png"
          secondaryLabel="Alt text"
          secondaryPlaceholder="Describe the image"
          onCancel={() => setImageDialog(false)}
          onSubmit={insertImageFromDialog}
        />
      )}
    </>
  );
}

function MarkdownCodeEditor({
  value,
  onChange,
  placeholder,
  editorRef,
  onDrop,
  onDragOver,
  onPaste,
}: {
  value: string;
  onChange: React.Dispatch<React.SetStateAction<string>>;
  placeholder: string;
  editorRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onPaste: (event: React.ClipboardEvent<HTMLDivElement>) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const textarea = containerRef.current?.querySelector("textarea") ?? null;

    editorRef.current = textarea;

    return () => {
      editorRef.current = null;
    };
  }, []);

  const highlighted = useMemo(() => {
    try {
      const grammar = Prism.languages.markdown;

      if (!grammar) {
        return escapeHtml(value || placeholder);
      }

      return Prism.highlight(value || placeholder, grammar, "markdown");
    } catch {
      return escapeHtml(value || placeholder);
    }
  }, [value, placeholder]);

  return (
    <div
      ref={containerRef}
      className={[
        "relative",
        "min-h-[520px]",
        "overflow-auto",
        "bg-[var(--background)]",
      ].join(" ")}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <Editor
        value={value}
        onValueChange={onChange}
        highlight={() => highlighted}
        padding={24}
        placeholder={placeholder}
        insertSpaces
        tabSize={4}
        onPaste={onPaste}
        style={{
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 14,
          lineHeight: 1.7,
          minHeight: 520,
          width: "100%",
          background: "transparent",
          color: "var(--foreground)",
          caretColor: "var(--foreground)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
        textareaClassName="outline-none selection:bg-[var(--surface-hover)]"
        preClassName="outline-none"
      />
    </div>
  );
}

function PreviewPane({
  value,
  split = false,
}: {
  value: string;
  split?: boolean;
}) {
  return (
    <div
      className={[
        "min-h-[520px]",
        "overflow-auto",
        "bg-[var(--background)]",
        "px-6 py-6",
        split ? "" : "border-t border-[var(--border)]",
      ].join(" ")}
    >
      {value.trim() ? (
        <MarkdownRenderer>{value}</MarkdownRenderer>
      ) : (
        <div className="flex min-h-[460px] items-center justify-center text-center">
          <div>
            <Eye size={24} className="mx-auto text-[var(--faint)]" />

            <p className="mt-3 text-sm font-medium text-[var(--muted)]">
              Nothing to preview
            </p>

            <p className="mt-1 text-xs text-[var(--faint)]">
              Start writing Markdown to see a preview.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MarkdownDialog({
  title,
  label,
  placeholder,
  secondaryLabel,
  secondaryPlaceholder,
  onCancel,
  onSubmit,
}: {
  title: string;
  label: string;
  placeholder: string;
  secondaryLabel: string;
  secondaryPlaceholder: string;
  onCancel: () => void;
  onSubmit: (value: string, secondary: string) => void;
}) {
  const [value, setValue] = useState("");

  const [secondary, setSecondary] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!value.trim()) {
      return;
    }

    onSubmit(value.trim(), secondary.trim());
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <form
        onSubmit={submit}
        className={[
          "w-full max-w-md",
          "rounded-2xl",
          "border border-[var(--border)]",
          "bg-[var(--surface)]",
          "p-5",
          "shadow-2xl",
        ].join(" ")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-2 py-1 text-lg leading-none text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          >
            ×
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--foreground)]/70">
              {label}
            </span>

            <input
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={placeholder}
              className={dialogInputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--foreground)]/70">
              {secondaryLabel}
            </span>

            <input
              value={secondary}
              onChange={(event) => setSecondary(event.target.value)}
              placeholder={secondaryPlaceholder}
              className={dialogInputClass}
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-hover)]"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={!value.trim()}
            className={[
              "rounded-lg",
              "bg-[var(--foreground)]",
              "px-3.5 py-2",
              "text-xs font-semibold",
              "text-[var(--background)]",
              "disabled:cursor-not-allowed",
              "disabled:opacity-40",
            ].join(" ")}
          >
            Insert
          </button>
        </div>
      </form>
    </div>
  );
}

function ToolbarButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={[
        "flex h-8 w-8",
        "items-center justify-center",
        "rounded-lg",
        "text-[var(--muted)]",
        "transition",
        "hover:bg-[var(--surface-hover)]",
        "hover:text-[var(--foreground)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ViewButton({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={[
        "flex h-7 items-center gap-1.5",
        "rounded-md px-2.5",
        "text-xs font-medium",
        "transition",
        active
          ? "bg-[var(--surface-hover)] text-[var(--foreground)] shadow-sm"
          : "text-[var(--muted)] hover:text-[var(--foreground)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function extractImageFromHtml(html: string): {
  src: string;
  alt: string;
} | null {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  try {
    const document = new DOMParser().parseFromString(html, "text/html");

    const image = document.querySelector("img");

    if (!image) {
      return null;
    }

    const candidates = [
      image.getAttribute("src"),
      image.getAttribute("data-src"),
      image.getAttribute("data-original"),
      image.getAttribute("data-lazy-src"),
    ].filter((value): value is string => Boolean(value));

    const srcset = image.getAttribute("srcset");

    if (srcset) {
      const firstSrcset = srcset
        .split(",")
        .map((entry) => entry.trim().split(/\s+/)[0])
        .find(Boolean);

      if (firstSrcset) {
        candidates.push(firstSrcset);
      }
    }

    for (const candidate of candidates) {
      try {
        const resolved = new URL(candidate, window.location.href).href;

        if (resolved.startsWith("data:") || resolved.startsWith("blob:")) {
          continue;
        }

        if (isHttpUrl(resolved)) {
          return {
            src: resolved,
            alt: image.getAttribute("alt") ?? "",
          };
        }
      } catch {
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function firstValidUrl(value: string): string | null {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (line.startsWith("#")) {
      continue;
    }

    try {
      const url = new URL(line);

      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.href;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const dialogInputClass = [
  "w-full",
  "rounded-lg",
  "border border-[var(--border)]",
  "bg-[var(--background)]",
  "px-3 py-2.5",
  "text-sm",
  "outline-none",
  "placeholder:text-[var(--faint)]",
  "focus:border-[var(--foreground)]/30",
  "focus:ring-2",
  "focus:ring-[var(--foreground)]/5",
].join(" ");

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
