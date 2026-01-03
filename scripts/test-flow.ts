#!/usr/bin/env tsx
import dotenv from 'dotenv';
import { resolve } from 'path';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import sgMail from '@sendgrid/mail';
import { jsPDF } from 'jspdf';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const results = {
  envVars: false,
  openai: false,
  gemini: false,
  pdf: false,
  email: false,
};

async function testEnvironmentVariables() {
  console.log('\n=== Environment Variables ===');

  const requiredVars = ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'];
  let allPresent = true;

  for (const varName of requiredVars) {
    const isSet = !!process.env[varName];
    console.log(`${isSet ? '✓' : '✗'} ${varName}`);
    if (!isSet) allPresent = false;
  }

  results.envVars = allPresent;
  return allPresent;
}

async function testOpenAI() {
  console.log('\n=== OpenAI API ===');

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Say "test successful"' }],
      max_tokens: 10,
    });

    console.log('✓ gpt-4o accessible');
    results.openai = true;
    return true;
  } catch (error: any) {
    console.log('✗ OpenAI test failed:', error.message);
    results.openai = false;
    return false;
  }
}

async function testGemini() {
  console.log('\n=== Google Gemini API ===');

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

    await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: 'What is AI? Answer in one sentence.',
    });

    console.log('✓ gemini-flash-latest accessible');
    results.gemini = true;
    return true;
  } catch (error: any) {
    console.log('✗ Gemini test failed:', error.message);
    results.gemini = false;
    return false;
  }
}

async function testPDFGeneration() {
  console.log('\n=== PDF Generation ===');

  try {
    const doc = new jsPDF();
    doc.text('Test PDF', 20, 20);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    console.log(`✓ Generated (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
    results.pdf = true;
    return pdfBuffer;
  } catch (error: any) {
    console.log('✗ PDF generation failed:', error.message);
    results.pdf = false;
    return null;
  }
}

async function testEmailSending(pdfBuffer: Buffer | null) {
  console.log('\n=== SendGrid Email ===');

  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
    const email = process.env.SENDGRID_FROM_EMAIL || '';

    await sgMail.send({
      to: email,
      from: { email, name: 'Research Assistant Test' },
      subject: 'Test Email',
      text: 'Email configuration is working correctly.',
      html: '<h1>Test Successful</h1><p>Email configuration is working.</p>',
      ...(pdfBuffer && {
        attachments: [{
          content: pdfBuffer.toString('base64'),
          filename: 'test.pdf',
          type: 'application/pdf',
          disposition: 'attachment',
        }],
      }),
    });

    console.log(`✓ Sent to ${email}`);
    results.email = true;
    return true;
  } catch (error: any) {
    console.log('✗ Email test failed:', error.message);
    results.email = false;
    return false;
  }
}

function printSummary() {
  console.log('\n=== Summary ===');

  const tests = [
    ['Environment Variables', results.envVars],
    ['OpenAI API', results.openai],
    ['Gemini API', results.gemini],
    ['PDF Generation', results.pdf],
    ['Email Sending', results.email],
  ];

  tests.forEach(([name, passed]) => {
    console.log(`${passed ? '✓' : '✗'} ${name}`);
  });

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log(`\n${passed}/${total} tests passed\n`);
}

async function main() {
  console.log('Backend Test Suite\n');

  const envOk = await testEnvironmentVariables();
  if (!envOk) {
    console.log('\nCannot proceed without environment variables');
    printSummary();
    process.exit(1);
  }

  await testOpenAI();
  await testGemini();
  const pdfBuffer = await testPDFGeneration();
  await testEmailSending(pdfBuffer);

  printSummary();

  const allPassed = Object.values(results).every(Boolean);
  process.exit(allPassed ? 0 : 1);
}

main();
