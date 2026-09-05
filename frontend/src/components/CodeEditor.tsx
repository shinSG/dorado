import Editor from '@monaco-editor/react'

interface Props {
  value: string
  onChange: (value: string) => void
  height?: string
  readOnly?: boolean
}

export default function CodeEditor({ value, onChange, height = '350px', readOnly = false }: Props) {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-700">
      <Editor
        height={height}
        defaultLanguage="rust"
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          readOnly,
          padding: { top: 12 },
          wordWrap: 'on',
          tabSize: 4,
        }}
      />
    </div>
  )
}
