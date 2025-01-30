import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { Bold, Italic, Link as LinkIcon, Image as ImageIcon, List, ListOrdered } from 'lucide-react';

interface SermonEditorProps {
  onSave: (content: string) => void;
  onPublish: (content: string) => void;
  initialContent?: string;
}

export function SermonEditor({ onSave, onPublish, initialContent = '' }: SermonEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: 'Start writing your sermon notes...',
      }),
    ],
    content: initialContent,
  });

  const handleSave = () => {
    if (editor) {
      onSave(editor.getHTML());
    }
  };

  const handlePublish = () => {
    if (editor) {
      onPublish(editor.getHTML());
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-holy-blue-200 rounded-lg overflow-hidden">
      <div className="bg-holy-blue-50 border-b border-holy-blue-200 p-2 flex gap-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-holy-blue-100 ${
            editor.isActive('bold') ? 'bg-holy-blue-100' : ''
          }`}
        >
          <Bold className="h-5 w-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-holy-blue-100 ${
            editor.isActive('italic') ? 'bg-holy-blue-100' : ''
          }`}
        >
          <Italic className="h-5 w-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-holy-blue-100 ${
            editor.isActive('bulletList') ? 'bg-holy-blue-100' : ''
          }`}
        >
          <List className="h-5 w-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-holy-blue-100 ${
            editor.isActive('orderedList') ? 'bg-holy-blue-100' : ''
          }`}
        >
          <ListOrdered className="h-5 w-5" />
        </button>
        <button
          onClick={() => {
            const url = window.prompt('Enter the URL:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={`p-2 rounded hover:bg-holy-blue-100 ${
            editor.isActive('link') ? 'bg-holy-blue-100' : ''
          }`}
        >
          <LinkIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => {
            const url = window.prompt('Enter the image URL:');
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
          className="p-2 rounded hover:bg-holy-blue-100"
        >
          <ImageIcon className="h-5 w-5" />
        </button>
      </div>

      <EditorContent 
        editor={editor} 
        className="prose max-w-none p-4 min-h-[300px] focus:outline-none"
      />

      <div className="border-t border-holy-blue-200 p-4 bg-white flex justify-end gap-2">
        <button onClick={handleSave} className="btn-secondary">
          Save Draft
        </button>
        <button onClick={handlePublish} className="btn-primary">
          Publish
        </button>
      </div>
    </div>
  );
}