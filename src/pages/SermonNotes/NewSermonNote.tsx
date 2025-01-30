import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  X as Close,
  Eye,
  Send,
  Plus,
  AlertTriangle
} from 'lucide-react';

interface SermonNoteForm {
  title: string;
  pastorName: string;
  churchName: string;
  bibleVerses: string[];
}

export default function NewSermonNote() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SermonNoteForm>({
    title: '',
    pastorName: '',
    churchName: '',
    bibleVerses: ['']
  });
  const [newVerse, setNewVerse] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[300px] p-4'
      }
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addBibleVerse = useCallback(() => {
    if (newVerse.trim()) {
      setFormData(prev => ({
        ...prev,
        bibleVerses: [...prev.bibleVerses.filter(v => v.trim()), newVerse.trim()]
      }));
      setNewVerse('');
    }
  }, [newVerse]);

  const removeBibleVerse = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      bibleVerses: prev.bibleVerses.filter((_, i) => i !== index)
    }));
  }, []);

  const formatContent = () => {
    if (!editor) return null;

    return {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: formData.title }]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: `Pastor: ${formData.pastorName}` }
          ]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: `Church: ${formData.churchName}` }
          ]
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Scripture References' }]
        },
        {
          type: 'bulletList',
          content: formData.bibleVerses
            .filter(verse => verse.trim())
            .map(verse => ({
              type: 'listItem',
              content: [{
                type: 'paragraph',
                content: [{ type: 'text', text: verse }]
              }]
            }))
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Notes' }]
        },
        ...(editor.getJSON().content || [])
      ]
    };
  };

  const handlePublish = async () => {
    if (!user) {
      toast.error('You must be logged in to publish sermon notes');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSaving(true);

      const content = formatContent();
      if (!content) {
        throw new Error('Failed to format content');
      }

      const { data, error } = await supabase
        .from('sermon_notes')
        .insert([{
          title: formData.title,
          content,
          author_id: user.id,
          scripture_references: formData.bibleVerses.filter(verse => verse.trim()),
          visibility: 'public'
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast.success('Sermon notes published successfully!');
      navigate('/');
    } catch (error) {
      console.error('Error publishing sermon notes:', error);
      toast.error('Failed to publish sermon notes. Please try again.');
    } finally {
      setIsSaving(false);
      setShowPublishConfirm(false);
    }
  };

  const validateForm = () => {
    if (!editor) return false;

    const isValid = (
      formData.title.trim() &&
      formData.pastorName.trim() &&
      formData.churchName.trim() &&
      formData.bibleVerses.some(verse => verse.trim()) &&
      editor.getText().trim().length > 0
    );

    if (!isValid) {
      console.log('Form validation failed:', {
        title: formData.title.trim(),
        pastorName: formData.pastorName.trim(),
        churchName: formData.churchName.trim(),
        bibleVerses: formData.bibleVerses,
        editorContent: editor.getText().trim()
      });
    }

    return isValid;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-holy-blue-100">
        <div className="p-6 border-b border-holy-blue-100">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-holy-blue-900">
              New Sermon Notes
            </h1>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary"
              >
                <Close className="h-5 w-5 mr-2" />
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setIsPreview(!isPreview)}
                className="btn-secondary"
              >
                <Eye className="h-5 w-5 mr-2" />
                {isPreview ? 'Edit' : 'Preview'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validateForm()) {
                    setShowPublishConfirm(true);
                  } else {
                    toast.error('Please fill in all required fields');
                  }
                }}
                disabled={isSaving}
                className="btn-primary"
              >
                <Send className="h-5 w-5 mr-2" />
                Publish
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Required Fields */}
          <div className="grid gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-holy-blue-900">
                Sermon Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2"
                placeholder="Enter the sermon title"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="pastorName" className="block text-sm font-medium text-holy-blue-900">
                  Pastor's Name *
                </label>
                <input
                  type="text"
                  id="pastorName"
                  name="pastorName"
                  value={formData.pastorName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2"
                  placeholder="Enter the pastor's name"
                  required
                />
              </div>

              <div>
                <label htmlFor="churchName" className="block text-sm font-medium text-holy-blue-900">
                  Church Name *
                </label>
                <input
                  type="text"
                  id="churchName"
                  name="churchName"
                  value={formData.churchName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-holy-blue-200 px-3 py-2"
                  placeholder="Enter the church name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-holy-blue-900">
                Key Bible Verses *
              </label>
              <div className="mt-2 space-y-3">
                {formData.bibleVerses.map((verse, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={verse}
                      onChange={(e) => {
                        const newVerses = [...formData.bibleVerses];
                        newVerses[index] = e.target.value;
                        setFormData(prev => ({ ...prev, bibleVerses: newVerses }));
                      }}
                      className="flex-1 rounded-md border border-holy-blue-200 px-3 py-2"
                      placeholder="e.g., John 3:16"
                    />
                    <button
                      type="button"
                      onClick={() => removeBibleVerse(index)}
                      className="p-2 text-holy-blue-600 hover:text-holy-blue-700"
                    >
                      <Close className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newVerse}
                    onChange={(e) => setNewVerse(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addBibleVerse();
                      }
                    }}
                    className="flex-1 rounded-md border border-holy-blue-200 px-3 py-2"
                    placeholder="Add another verse"
                  />
                  <button
                    type="button"
                    onClick={addBibleVerse}
                    className="p-2 text-holy-blue-600 hover:text-holy-blue-700"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Editor */}
          <div>
            <label className="block text-sm font-medium text-holy-blue-900 mb-2">
              Sermon Notes *
            </label>
            {!isPreview && (
              <div className="mb-2 border-b border-holy-blue-100 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    className={`p-2 rounded hover:bg-holy-blue-100 ${
                      editor?.isActive('bold') ? 'bg-holy-blue-100' : ''
                    }`}
                  >
                    <Bold className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    className={`p-2 rounded hover:bg-holy-blue-100 ${
                      editor?.isActive('italic') ? 'bg-holy-blue-100' : ''
                    }`}
                  >
                    <Italic className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    className={`p-2 rounded hover:bg-holy-blue-100 ${
                      editor?.isActive('bulletList') ? 'bg-holy-blue-100' : ''
                    }`}
                  >
                    <List className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    className={`p-2 rounded hover:bg-holy-blue-100 ${
                      editor?.isActive('orderedList') ? 'bg-holy-blue-100' : ''
                    }`}
                  >
                    <ListOrdered className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
            <div className={`border border-holy-blue-200 rounded-lg ${isPreview ? 'p-6' : ''}`}>
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </div>

      {/* Publish Confirmation Dialog */}
      {showPublishConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-holy-blue-500 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-holy-blue-900">
                  Publish Sermon Notes
                </h3>
                <p className="text-holy-blue-600 mt-1">
                  Are you sure you want to publish these sermon notes? This will make them visible to others.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPublishConfirm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isSaving}
                className="btn-primary"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Publish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}