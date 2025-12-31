import { jsPDF } from 'jspdf';
import { ResearchSession } from '@/types';

export async function generateResearchPDF(session: ResearchSession): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function to add text with automatic page breaks
  const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');

    const lines = doc.splitTextToSize(text, maxWidth);

    for (const line of lines) {
      if (yPosition + 10 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += fontSize * 0.5;
    }
    yPosition += 5; // Add spacing after text block
  };

  // Helper function to parse and render markdown text
  const addMarkdownText = (markdownText: string) => {
    const lines = markdownText.split('\n');
    let inTable = false;
    let tableRows: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        // If we were in a table, render it now
        if (inTable && tableRows.length > 0) {
          renderTable(tableRows);
          tableRows = [];
          inTable = false;
        }
        yPosition += 3; // Empty line spacing
        continue;
      }

      // Detect table rows (contains |)
      if (trimmed.includes('|') && !trimmed.startsWith('#')) {
        // Skip separator rows (----)
        if (trimmed.match(/^[|\s:-]+$/)) {
          continue;
        }

        inTable = true;
        const cells = trimmed
          .split('|')
          .map(cell => cell.trim())
          .filter(cell => cell.length > 0);
        tableRows.push(cells);
        continue;
      }

      // If we were in a table but this line isn't, render the table
      if (inTable && tableRows.length > 0) {
        renderTable(tableRows);
        tableRows = [];
        inTable = false;
      }

      // Handle headers (###, ##, #)
      if (trimmed.startsWith('###')) {
        addText(cleanMarkdown(trimmed.replace(/^###\s*/, '')), 12, true);
      } else if (trimmed.startsWith('##')) {
        addText(cleanMarkdown(trimmed.replace(/^##\s*/, '')), 13, true);
      } else if (trimmed.startsWith('#')) {
        addText(cleanMarkdown(trimmed.replace(/^#\s*/, '')), 14, true);
      }
      // Handle list items (-, *, •)
      else if (trimmed.match(/^[-*•]\s/)) {
        addText('  • ' + cleanMarkdown(trimmed.replace(/^[-*•]\s*/, '')), 10);
      }
      // Handle numbered lists
      else if (trimmed.match(/^\d+\.\s/)) {
        addText(cleanMarkdown(trimmed), 10);
      }
      // Check if line starts with bold
      else if (trimmed.match(/^\*\*[^*]+\*\*/)) {
        addText(cleanMarkdown(trimmed), 10, true);
      }
      // Regular text
      else {
        addText(cleanMarkdown(trimmed), 10);
      }
    }

    // Render any remaining table
    if (inTable && tableRows.length > 0) {
      renderTable(tableRows);
    }
  };

  // Helper to clean markdown formatting
  const cleanMarkdown = (text: string): string => {
    // Remove bold markers
    return text.replace(/\*\*/g, '');
  };

  // Helper to render tables as simple text
  const renderTable = (rows: string[][]) => {
    if (rows.length === 0) return;

    // First row is header
    if (rows[0]) {
      addText(rows[0].join(' | '), 10, true);
      yPosition += 2;
    }

    // Remaining rows
    for (let i = 1; i < rows.length; i++) {
      addText(rows[i].join(' | '), 9);
    }

    yPosition += 3;
  };

  // Header
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Deep Research Report', margin, 25);

  yPosition = 50;
  doc.setTextColor(0, 0, 0);

  // Research Info
  addText('Research Summary', 16, true);
  addText(`Initial Prompt: ${session.initialPrompt}`, 10);

  if (session.refinedPrompt) {
    addText(`Refined Prompt: ${session.refinedPrompt}`, 10);
  }

  // Fix Firestore timestamp conversion
  const createdDate = (session.createdAt as any)._seconds
    ? new Date((session.createdAt as any)._seconds * 1000)
    : new Date(session.createdAt);

  addText(`Date: ${createdDate.toLocaleString()}`, 10);
  addText(`Status: ${session.status.toUpperCase()}`, 10);

  yPosition += 10;

  // Refinement Questions and Answers
  if (session.refinementQuestions.length > 0) {
    addText('Refinement Questions & Answers', 16, true);
    session.refinementQuestions.forEach((q, index) => {
      addText(`${index + 1}. ${q.question}`, 11, true);
      if (q.answer) {
        addText(`Answer: ${q.answer}`, 10);
      }
      yPosition += 3;
    });
  }

  yPosition += 10;

  // OpenAI Deep Research Results
  if (session.openaiResult) {
    addText('OpenAI Deep Research Results', 16, true);
    doc.setDrawColor(41, 128, 185);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;
    addMarkdownText(session.openaiResult);
    yPosition += 10;
  }

  // Gemini Research Results
  if (session.geminiResult) {
    addText('Google Gemini Research Results', 16, true);
    doc.setDrawColor(219, 68, 55);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;
    addMarkdownText(session.geminiResult);
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      `Generated by Multi-API Deep Research Assistant`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  // Return PDF as buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}
