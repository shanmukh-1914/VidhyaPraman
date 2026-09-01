/**
 * pdfNotesExport.js - High-Precision PDF Exporter for AI Study Notes & Technical Guides.
 * Formats Markdown into publication-grade, printable HTML documents with CSS page-break optimization.
 */

function markdownToHtml(md) {
  if (!md) return '';
  
  let html = md
    // Escape HTML special characters
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    
    // Code blocks with syntax container
    .replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<div class="code-block"><div class="code-header">${lang || 'CODE'}</div><pre><code>${code.trim()}</code></pre></div>`;
    })
    
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    
    // Headings
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    
    // Bold and Italic
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    
    // Blockquotes
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    
    // Horizontal rule
    .replace(/^---$/gim, '<hr/>')
    
    // Bullet lists
    .replace(/^\s*[-*+]\s+(.*$)/gim, '<li>$1</li>');

  // Wrap contiguous list items in <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, (match) => `<ul>${match}</ul>`);

  // Wrap remaining bare text lines into paragraphs
  const paragraphs = html.split(/\n{2,}/).map(para => {
    const trimmed = para.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<div') || trimmed.startsWith('<ul') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<hr')) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
  });

  return paragraphs.join('\n');
}

export function exportNotesToPDF(notesList, candidateName = 'Learner', singleTopic = null) {
  if (!notesList || notesList.length === 0) return;

  const notesToExport = Array.isArray(notesList) ? notesList : [notesList];
  const docTitle = singleTopic 
    ? `SkillForge_Study_Notes_${singleTopic.replace(/[^a-zA-Z0-9_-]/g, '_')}`
    : `SkillForge_Master_Study_Notes_${new Date().toISOString().slice(0, 10)}`;

  const notesHtml = notesToExport.map((note, idx) => {
    const renderedBody = markdownToHtml(note.notesMarkdown || '');
    return `
      <section class="note-page ${idx > 0 ? 'page-break' : ''}">
        <div class="note-header">
          <div class="brand-row">
            <div class="brand-logo">
              <span class="logo-icon">⚡</span>
              <span class="brand-text">SkillForge AI • Master Study Notes</span>
            </div>
            <div class="badge-tag">${note.language || 'English'} • Verified</div>
          </div>
          <h1 class="topic-title">${note.topic}</h1>
          <div class="meta-row">
            <span><strong>Candidate:</strong> ${candidateName}</span>
            <span><strong>Generated:</strong> ${note.createdAt || new Date().toLocaleDateString()}</span>
            ${note.query ? `<span><strong>Focus:</strong> "${note.query}"</span>` : ''}
          </div>
        </div>
        
        <div class="note-body">
          ${renderedBody}
        </div>
        
        <div class="note-footer">
          <span>SkillForge 1:1 AI Technical Mentorship Engine</span>
          <span>Page ${idx + 1} of ${notesToExport.length}</span>
        </div>
      </section>
    `;
  }).join('\n');

  const fullDocumentHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.6;
      font-size: 13.5px;
      padding: 24px;
    }
    
    .note-page {
      max-width: 860px;
      margin: 0 auto 30px auto;
      padding: 32px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    }
    
    .page-break {
      page-break-before: always;
      break-before: page;
    }
    
    .note-header {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    
    .brand-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 800;
      font-size: 14px;
      color: #2563eb;
      letter-spacing: 0.5px;
    }
    
    .logo-icon {
      font-size: 16px;
    }
    
    .badge-tag {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
    }
    
    .topic-title {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 6px 0 10px 0;
      line-height: 1.3;
    }
    
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 11.5px;
      color: #64748b;
    }
    
    .meta-row strong {
      color: #334155;
    }
    
    h1 {
      font-size: 18px;
      font-weight: 800;
      color: #1e293b;
      margin: 20px 0 10px 0;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
    }
    
    h2 {
      font-size: 15px;
      font-weight: 700;
      color: #2563eb;
      margin: 18px 0 8px 0;
    }
    
    h3 {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      margin: 14px 0 6px 0;
    }
    
    p {
      margin-bottom: 12px;
      color: #334155;
    }
    
    ul {
      margin: 8px 0 14px 20px;
      color: #334155;
    }
    
    li {
      margin-bottom: 4px;
    }
    
    blockquote {
      border-left: 3px solid #3b82f6;
      background: #f8fafc;
      padding: 10px 14px;
      margin: 12px 0;
      border-radius: 0 6px 6px 0;
      color: #475569;
      font-style: italic;
    }
    
    .code-block {
      background: #0f172a;
      border-radius: 8px;
      margin: 14px 0;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    .code-header {
      background: #1e293b;
      color: #94a3b8;
      font-size: 10.5px;
      font-weight: 700;
      padding: 4px 12px;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.5px;
    }
    
    pre {
      padding: 12px 14px;
      overflow-x: auto;
      margin: 0;
    }
    
    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      line-height: 1.5;
    }
    
    .code-block code {
      color: #e2e8f0;
    }
    
    .inline-code {
      background: #f1f5f9;
      color: #dc2626;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11.5px;
      border: 1px solid #e2e8f0;
    }
    
    hr {
      border: 0;
      height: 1px;
      background: #e2e8f0;
      margin: 20px 0;
    }
    
    .note-footer {
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94a3b8;
      font-weight: 600;
    }
    
    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }
      .note-page {
        border: none;
        box-shadow: none;
        padding: 16px 0;
        margin: 0;
        max-width: 100%;
      }
      .code-block {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      @page {
        margin: 1.5cm;
        size: A4 portrait;
      }
    }
  </style>
</head>
<body>
  ${notesHtml}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>
  `;

  // Open formatted print window for instant PDF save/print
  const printWindow = window.open('', '_blank', 'width=900,height=750');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(fullDocumentHtml);
    printWindow.document.close();
  } else {
    // Fallback: trigger print via hidden iframe if pop-up blocked
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(fullDocumentHtml);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 500);
    }
  }
}
