import { jsPDF } from 'jspdf';
import { ResearchSession } from '@/types';
import { marked } from 'marked';

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

  // Helper function to parse and render markdown text using marked
  const addMarkdownText = (markdownText: string) => {
    const tokens = marked.lexer(markdownText);

    for (const token of tokens) {
      renderToken(token);
    }
  };

  // Render individual markdown tokens
  const renderToken = (token: any) => {
    switch (token.type) {
      case 'heading':
        const headingSizes = [14, 13, 12, 11, 10, 10]; // h1-h6 sizes
        const size = headingSizes[token.depth - 1] || 10;
        addText(cleanMarkdown(token.text), size, true);
        yPosition += 2;
        break;

      case 'paragraph':
        addText(cleanMarkdown(token.text), 10);
        break;

      case 'list':
        renderList(token);
        break;

      case 'table':
        renderTable(token);
        break;

      case 'blockquote':
        addText('  ' + cleanMarkdown(token.text), 10);
        break;

      case 'code':
        addText(token.text, 9);
        break;

      case 'space':
        yPosition += 3;
        break;

      default:
        // Handle any other types as plain text
        if (token.text) {
          addText(cleanMarkdown(token.text), 10);
        }
    }
  };

  // Render list items
  const renderList = (listToken: any) => {
    for (const item of listToken.items) {
      const bullet = listToken.ordered
        ? `${listToken.start ? listToken.start : 1}. `
        : '  • ';

      addText(bullet + cleanMarkdown(item.text), 10);

      // Handle nested lists
      if (item.tokens) {
        for (const subToken of item.tokens) {
          if (subToken.type === 'list') {
            renderList(subToken);
          }
        }
      }
    }
    yPosition += 2;
  };

  // Render tables
  const renderTable = (tableToken: any) => {
    // Render header
    if (tableToken.header && tableToken.header.length > 0) {
      const headerCells = tableToken.header.map((cell: any) => cleanMarkdown(cell.text));
      addText(headerCells.join(' | '), 10, true);
      yPosition += 2;
    }

    // Render rows
    if (tableToken.rows) {
      for (const row of tableToken.rows) {
        const cells = row.map((cell: any) => cleanMarkdown(cell.text));
        addText(cells.join(' | '), 9);
      }
    }

    yPosition += 3;
  };

  // Helper to clean markdown formatting (bold, italic, code, links)
  const cleanMarkdown = (text: string): string => {
    return text
      .replace(/\*\*/g, '')      // Remove bold
      .replace(/\*/g, '')         // Remove italic
      .replace(/__/g, '')         // Remove bold (underscore)
      .replace(/_/g, '')          // Remove italic (underscore)
      .replace(/`/g, '')          // Remove code backticks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Convert links to text
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
