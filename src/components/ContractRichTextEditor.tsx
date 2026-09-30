import { useEffect } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Undo2,
} from 'lucide-react'

const extensions = [StarterKit]

function ToolButton({
  editor,
  label,
  active = false,
  onClick,
  children,
}: {
  editor: Editor
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex size-9 items-center justify-center rounded-md transition ${active ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-slate-100'}`}
      disabled={!editor.isEditable}
    >
      {children}
    </button>
  )
}

export default function ContractRichTextEditor({
  content,
  onUpdate,
  onEditorReady,
  editable = true,
}: {
  content: string
  onUpdate: (value: string) => void
  onEditorReady?: (editor: Editor | null) => void
  editable?: boolean
}) {
  const editor = useEditor({
    extensions,
    content,
    editable,
    onUpdate: ({ editor: currentEditor }) => onUpdate(currentEditor.getHTML()),
    editorProps: {
      attributes: {
        class: 'contract-prose focus:outline-none',
        'aria-label': 'Contenido del contrato',
      },
    },
  })

  useEffect(() => {
    onEditorReady?.(editor)
    return () => onEditorReady?.(null)
  }, [editor, onEditorReady])

  return (
    <div className="contract-editor-shell overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2 print:hidden" role="toolbar" aria-label="Formato del contrato">
        {editor && <>
          <ToolButton editor={editor} label="Negrita" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={17} /></ToolButton>
          <ToolButton editor={editor} label="Cursiva" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={17} /></ToolButton>
          <span className="mx-1 h-6 w-px bg-slate-200" />
          <ToolButton editor={editor} label="Encabezado" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={18} /></ToolButton>
          <ToolButton editor={editor} label="Lista con viñetas" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={18} /></ToolButton>
          <ToolButton editor={editor} label="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={18} /></ToolButton>
          <span className="mx-1 h-6 w-px bg-slate-200" />
          <ToolButton editor={editor} label="Deshacer" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={17} /></ToolButton>
          <ToolButton editor={editor} label="Rehacer" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={17} /></ToolButton>
        </>}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}