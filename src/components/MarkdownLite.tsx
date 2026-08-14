import React from 'react';

/**
 * Renderizza un sottoinsieme minimo di Markdown: **grassetto**, elenchi puntati
 * (* o -) e numerati (1. 2. ...). Nessuna dipendenza esterna: la chat del
 * consulente usa solo questi elementi, non serve una libreria completa.
 */

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function renderBlocks(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let key = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    const items = listBuffer.map((item, i) => <li key={i}>{renderInline(item)}</li>);
    nodes.push(
      listType === 'ol'
        ? <ol key={`l-${key++}`} className="list-decimal pl-5 space-y-1 my-1.5">{items}</ol>
        : <ul key={`l-${key++}`} className="list-disc pl-4 space-y-1 my-1.5">{items}</ul>
    );
    listBuffer = [];
    listType = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushList(); continue; }

    const bulletMatch = line.match(/^[*-]\s+(.*)/);
    const numberedMatch = line.match(/^\d+[.)]\s+(.*)/);

    if (bulletMatch) {
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listBuffer.push(bulletMatch[1]);
    } else if (numberedMatch) {
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listBuffer.push(numberedMatch[1]);
    } else {
      flushList();
      nodes.push(<p key={`p-${key++}`} className="mb-1.5 last:mb-0">{renderInline(line)}</p>);
    }
  }
  flushList();
  return nodes;
}

export default function MarkdownLite({ text, className }: { text: string; className?: string }) {
  return <div className={className}>{renderBlocks(text)}</div>;
}
