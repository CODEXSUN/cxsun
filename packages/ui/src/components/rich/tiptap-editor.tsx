import {
  Bold,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Redo2,
  TextQuote,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react"
import type { ReactNode } from "react"
import { useEffect } from "react"

import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

import { cn } from "../../lib/utils"

import { Button } from "../ui/button"

export type CxTiptapEditorProps = {
  content: string
  onChange?: (value: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
  contentClassName?: string
}

function ToolbarButton({
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-8 rounded-lg px-2.5",
        active && "border-foreground/20 bg-accent text-accent-foreground"
      )}
    >
      {children}
    </Button>
  )
}

export function CxTiptapEditor({
  content,
  onChange,
  placeholder = "Write something...",
  editable = true,
  className,
  contentClassName,
}: CxTiptapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[180px] w-full rounded-b-[1.1rem] border-0 bg-background px-4 py-4 text-sm leading-7 text-foreground outline-none",
          "prose prose-sm max-w-none prose-headings:font-heading prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-blockquote:border-l-border prose-blockquote:text-muted-foreground",
          "prose-ul:my-4 prose-ol:my-4 prose-li:my-1",
          contentClassName
        ),
      },
    },
    onUpdate({ editor: nextEditor }) {
      onChange?.(nextEditor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) {
      return
    }

    const currentContent = editor.getHTML()

    if (currentContent !== content) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [content, editor])

  if (!editor) {
    return null
  }

  const activeEditor = editor

  function setLink() {
    const previousUrl = activeEditor.getAttributes("link").href as string | undefined
    const nextUrl = window.prompt("Enter link URL", previousUrl ?? "https://")

    if (nextUrl === null) {
      return
    }

    if (!nextUrl.trim()) {
      activeEditor.chain().focus().unsetLink().run()
      return
    }

    activeEditor.chain().focus().extendMarkRange("link").setLink({ href: nextUrl.trim() }).run()
  }

  return (
    <div className={cn("overflow-hidden rounded-[1.15rem] border border-border/70 bg-background shadow-sm", className)}>
      {editable ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/30 px-3 py-2.5">
          <ToolbarButton
            active={activeEditor.isActive("bold")}
            onClick={() => activeEditor.chain().focus().toggleBold().run()}
            disabled={!activeEditor.can().chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={activeEditor.isActive("italic")}
            onClick={() => activeEditor.chain().focus().toggleItalic().run()}
            disabled={!activeEditor.can().chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={activeEditor.isActive("underline")}
            onClick={() => activeEditor.chain().focus().toggleUnderline().run()}
            disabled={!activeEditor.can().chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="size-4" />
          </ToolbarButton>
          <ToolbarButton active={activeEditor.isActive("bulletList")} onClick={() => activeEditor.chain().focus().toggleBulletList().run()}>
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton active={activeEditor.isActive("orderedList")} onClick={() => activeEditor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <ToolbarButton active={activeEditor.isActive("blockquote")} onClick={() => activeEditor.chain().focus().toggleBlockquote().run()}>
            <TextQuote className="size-4" />
          </ToolbarButton>
          <ToolbarButton active={activeEditor.isActive("link")} onClick={setLink}>
            <LinkIcon className="size-4" />
          </ToolbarButton>
          <div className="ml-auto flex items-center gap-2">
            <ToolbarButton onClick={() => activeEditor.chain().focus().undo().run()} disabled={!activeEditor.can().chain().focus().undo().run()}>
              <Undo2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => activeEditor.chain().focus().redo().run()} disabled={!activeEditor.can().chain().focus().redo().run()}>
              <Redo2 className="size-4" />
            </ToolbarButton>
          </div>
        </div>
      ) : null}
      <EditorContent editor={activeEditor} />
    </div>
  )
}
