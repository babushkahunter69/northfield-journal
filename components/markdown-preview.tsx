export function MarkdownPreview({ content }: { content: string }) {
  return <div className="prose-article">{content.split('\n').map((line, index) => renderLine(line, index))}</div>;
}

function renderLine(line: string, index: number) {
  if (line.startsWith('> ')) return <blockquote key={index}>{line.replace('> ', '')}</blockquote>;
  if (line.startsWith('### ')) return <h3 key={index}>{line.replace('### ', '')}</h3>;
  if (line.startsWith('## ')) return <h2 key={index}>{line.replace('## ', '')}</h2>;
  if (line.startsWith('- ')) return <ul key={index}><li>{line.replace('- ', '')}</li></ul>;
  if (!line.trim()) return <div key={index} className="h-2" />;
  return <p key={index}>{line}</p>;
}