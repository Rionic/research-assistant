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
  const addText = (text: string, fontSize: number = 10, isBold: boolean = false, indent: number = 0) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');

    const lines = doc.splitTextToSize(text, maxWidth - indent);

    for (let i = 0; i < lines.length; i++) {
      if (yPosition + 10 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(lines[i], margin + indent, yPosition);
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

  // Render list items with proper hanging indentation
  const renderList = (listToken: any, indentLevel: number = 0) => {
    let itemNumber = listToken.start || 1;

    for (const item of listToken.items) {
      const bullet = listToken.ordered ? `${itemNumber}. ` : '• ';
      const bulletWidth = doc.getTextWidth(bullet);
      const leftIndent = indentLevel * 8; // 8mm per indent level

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      // Check for page break
      if (yPosition + 10 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      // Draw bullet
      doc.text(bullet, margin + leftIndent, yPosition);

      // Draw text with hanging indent
      const textIndent = leftIndent + bulletWidth + 2;
      const lines = doc.splitTextToSize(cleanMarkdown(item.text), maxWidth - textIndent);

      for (let i = 0; i < lines.length; i++) {
        if (i > 0 && yPosition + 10 > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(lines[i], margin + textIndent, yPosition);
        yPosition += 5;
      }

      // Handle nested lists
      if (item.tokens) {
        for (const subToken of item.tokens) {
          if (subToken.type === 'list') {
            renderList(subToken, indentLevel + 1);
          }
        }
      }

      if (listToken.ordered) itemNumber++;
    }
    yPosition += 2;
  };

  // Render tables with proper formatting
  const renderTable = (tableToken: any) => {
    if (!tableToken.header || tableToken.header.length === 0) return;

    const numColumns = tableToken.header.length;
    const columnWidth = maxWidth / numColumns;
    const rowHeight = 8;
    const cellPadding = 2;

    // Helper to draw a table row
    const drawRow = (cells: string[], isHeader: boolean = false) => {
      // Check if we need a new page
      if (yPosition + rowHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      const startY = yPosition;

      // Set font for this row
      doc.setFontSize(isHeader ? 10 : 9);
      doc.setFont('helvetica', isHeader ? 'bold' : 'normal');

      // Draw cells
      for (let i = 0; i < cells.length; i++) {
        const x = margin + (i * columnWidth);
        const text = cleanMarkdown(cells[i]);

        // Draw cell border
        doc.setDrawColor(200, 200, 200);
        doc.rect(x, startY, columnWidth, rowHeight);

        // Fill header background
        if (isHeader) {
          doc.setFillColor(240, 240, 240);
          doc.rect(x, startY, columnWidth, rowHeight, 'F');
          doc.rect(x, startY, columnWidth, rowHeight); // Redraw border
        }

        // Draw text (truncate if too long)
        const maxCellWidth = columnWidth - (2 * cellPadding);
        const truncatedText = doc.splitTextToSize(text, maxCellWidth)[0] || '';
        doc.text(truncatedText, x + cellPadding, startY + 5);
      }

      yPosition += rowHeight;
    };

    // Draw header row
    const headerCells = tableToken.header.map((cell: any) => cell.text);
    drawRow(headerCells, true);

    // Draw data rows
    if (tableToken.rows) {
      for (const row of tableToken.rows) {
        const cells = row.map((cell: any) => cell.text);
        drawRow(cells, false);
      }
    }

    yPosition += 5; // Add spacing after table
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
