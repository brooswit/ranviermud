import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { yaml } from '@codemirror/lang-yaml';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'javascript' | 'yaml' | 'json';
  readOnly?: boolean;
  placeholder?: string;
  height?: string;
  wordWrap?: boolean;
}

export default function CodeEditor({
  value,
  onChange,
  language = 'javascript',
  readOnly = false,
  placeholder,
  height = '400px',
  wordWrap = false
}: CodeEditorProps) {
  const extensions = useMemo(() => {
    try {
      const langExts = [];
      switch (language) {
        case 'javascript':
          langExts.push(javascript());
          break;
        case 'yaml':
          langExts.push(yaml());
          break;
        case 'json':
          langExts.push(json());
          break;
        default:
          langExts.push(javascript());
      }
      // Add word wrap if enabled
      if (wordWrap) {
        langExts.push(EditorView.lineWrapping);
      }
      return langExts;
    } catch (error) {
      console.error('Error creating CodeMirror extensions:', error);
      return [];
    }
  }, [language, wordWrap]);

  // Parse height to ensure it's a valid CSS value
  const heightValue = height || '400px';
  
  return (
    <div 
      className="code-editor-wrapper"
      style={{ 
        border: '1px solid var(--border)', 
        borderRadius: '4px', 
        height: heightValue, 
        overflow: 'hidden', 
        position: 'relative'
      }}
    >
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={oneDark}
        extensions={extensions}
        readOnly={readOnly}
        placeholder={placeholder}
        height={heightValue}
        maxHeight={heightValue}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          highlightSelectionMatches: false
        }}
      />
    </div>
  );
}
