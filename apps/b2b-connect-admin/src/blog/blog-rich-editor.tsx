import { useEffect } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Bold, Heading2, Heading3, Italic, List, ListOrdered, Minus } from "lucide-react"

export function BlogRichEditor({ onChange, value }: { onChange(value: string): void; value: string }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "<p>Write the blog article here...</p>",
    editorProps: { attributes: { class: "blog-editor-surface" } },
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
  })

  useEffect(() => {
    if (!editor || editor.getHTML() === value) return
    editor.commands.setContent(value || "<p>Write the blog article here...</p>", { emitUpdate: false })
  }, [editor, value])

  return (
    <div className="blog-editor-card">
      <div className="blog-editor-toolbar">
        <button aria-label="Bold" className={editor?.isActive("bold") ? "active" : ""} title="Bold" type="button" onClick={() => editor?.chain().focus().toggleBold().run()}><Bold size={17} /></button>
        <button aria-label="Italic" className={editor?.isActive("italic") ? "active" : ""} title="Italic" type="button" onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={17} /></button>
        <span className="blog-toolbar-divider" />
        <button aria-label="Heading 2" className={editor?.isActive("heading", { level: 2 }) ? "active" : ""} title="Heading 2" type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={18} /></button>
        <button aria-label="Heading 3" className={editor?.isActive("heading", { level: 3 }) ? "active" : ""} title="Heading 3" type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={18} /></button>
        <span className="blog-toolbar-divider" />
        <button aria-label="Bullet list" className={editor?.isActive("bulletList") ? "active" : ""} title="Bullet list" type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={18} /></button>
        <button aria-label="Numbered list" className={editor?.isActive("orderedList") ? "active" : ""} title="Numbered list" type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={18} /></button>
        <button aria-label="Horizontal rule" title="Horizontal rule" type="button" onClick={() => editor?.chain().focus().setHorizontalRule().run()}><Minus size={18} /></button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

export default BlogRichEditor
