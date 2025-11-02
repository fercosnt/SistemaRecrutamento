import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { GlassButton } from './ui/glass';

// Extensão customizada para tamanhos de fonte
const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Digite aqui...',
  minHeight = 150,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontSize,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-invert max-w-none focus:outline-none`,
        style: `min-height: ${minHeight}px; padding: 16px;`,
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const fontSizes = [
    { value: '12px', label: '12px (Muito pequeno)' },
    { value: '14px', label: '14px (Pequeno)' },
    { value: '16px', label: '16px (Normal)' },
    { value: '18px', label: '18px (Médio)' },
    { value: '20px', label: '20px (Grande)' },
    { value: '24px', label: '24px (Muito grande)' },
    { value: '28px', label: '28px (Destaque 1)' },
    { value: '32px', label: '32px (Destaque 2)' },
    { value: '36px', label: '36px (Título pequeno)' },
    { value: '48px', label: '48px (Título grande)' },
  ];

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-white/20 rounded-lg overflow-hidden bg-white/5 backdrop-blur-sm">
      {/* Toolbar */}
      <div className="border-b border-white/20 p-2 flex items-center gap-2 sticky top-0 bg-white/10 backdrop-blur-md z-10">
        {/* Botão Bold */}
        <GlassButton
          variant={editor.isActive('bold') ? 'primary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="w-8 h-8 p-0 flex items-center justify-center"
          title="Negrito (Ctrl+B)"
        >
          <span className="font-bold">B</span>
        </GlassButton>

        {/* Dropdown Tamanho de Fonte */}
        <Select
          value={editor.getAttributes('textStyle').fontSize || '16px'}
          onValueChange={(value) => {
            if (value === '16px') {
              editor.chain().focus().unsetFontSize().run();
            } else {
              editor.chain().focus().setFontSize(value).run();
            }
          }}
        >
          <SelectTrigger className="w-[180px] h-8 bg-white/10 border-white/20 text-white text-sm">
            <SelectValue placeholder="Tamanho" />
          </SelectTrigger>
          <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
            {fontSizes.map((size) => (
              <SelectItem
                key={size.value}
                value={size.value}
                className="hover:bg-white/10 text-sm"
              >
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Editor Content */}
      <div className="text-white/90 [&_.ProseMirror]:outline-none [&_.ProseMirror:focus]:outline-none">
        <EditorContent editor={editor} />
        {editor.isEmpty && (
          <div
            className="absolute pointer-events-none text-white/40 italic"
            style={{ top: '56px', left: '16px' }}
          >
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
