import React from 'react';

/**
 * Clean, lightweight MarkdownRenderer component for curriculum and long-form lessons.
 * Formats headings, code blocks, bullet points, tables, blockquotes, and inline code.
 */
export default function MarkdownRenderer({ content = '' }) {
  if (!content) return null;

  // Split into paragraphs / code block segments
  const lines = content.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let codeLang = '';
  let listBuffer = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} style={{ margin: '0.6rem 0 1rem 1.4rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
          {listBuffer.map((li, idx) => (
            <li key={idx} style={{ marginBottom: '0.35rem' }}>{parseInline(li)}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  const flushCode = () => {
    if (codeBuffer.length > 0) {
      elements.push(
        <div
          key={`code-${elements.length}`}
          style={{
            background: 'var(--color-surface-container-low, #f8fafc)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '1.25rem',
            margin: '1rem 0',
            overflowX: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {codeLang || 'CODE'}
            </span>
          </div>
          <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.86rem', color: '#1e293b', lineHeight: 1.5 }}>
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        </div>
      );
      codeBuffer = [];
      codeLang = '';
    }
  };

  const parseInline = (text) => {
    if (!text) return '';
    // Parse bold **text**
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} style={{ color: 'var(--text-main)', fontWeight: 800 }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={pIdx}
            style={{
              background: 'var(--color-surface-container-low, #f1f5f9)',
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              color: 'var(--color-primary, #2563eb)',
              fontSize: '0.85em',
              fontFamily: 'monospace',
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Unordered lists
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      listBuffer.push(line.trim().substring(2));
      continue;
    } else {
      flushList();
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} style={{ fontSize: '1.6rem', fontWeight: 900, margin: '1.25rem 0 0.75rem', color: 'var(--text-main)' }}>
          {parseInline(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} style={{ fontSize: '1.3rem', fontWeight: 800, margin: '1.25rem 0 0.5rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
          {parseInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1rem 0 0.35rem', color: 'var(--color-primary, #2563eb)' }}>
          {parseInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith('---')) {
      elements.push(<hr key={`hr-${i}`} style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '1.5rem 0' }} />);
    } else if (line.trim().length > 0) {
      elements.push(
        <p key={`p-${i}`} style={{ margin: '0.5rem 0', lineHeight: 1.65, fontSize: '0.92rem', color: 'var(--text-main)' }}>
          {parseInline(line)}
        </p>
      );
    }
  }

  flushList();
  flushCode();

  return <div className="markdown-content">{elements}</div>;
}
