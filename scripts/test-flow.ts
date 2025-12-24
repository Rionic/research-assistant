#!/usr/bin/env tsx
/**
 * Test Script for Multi-API Deep Research Assistant
 *
 * This script tests the entire backend flow:
 * 1. OpenAI Deep Research API
 * 2. Google Gemini API
 * 3. PDF Generation
 * 4. Email Sending
 * 5. Full end-to-end flow
 *
 * Usage: npm run test:flow
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sgMail from '@sendgrid/mail';
import { jsPDF } from 'jspdf';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'cyan');
}

// Test results tracking
const results = {
  envVars: false,
  openai: false,
  gemini: false,
  pdf: false,
  email: false,
  fullFlow: false,
};

async function testEnvironmentVariables() {
  logSection('Testing Environment Variables');

  const requiredVars = [
    'OPENAI_API_KEY',
    'GOOGLE_GEMINI_API_KEY',
    'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL',
  ];

  let allPresent = true;

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      logSuccess(`${varName} is set`);
    } else {
      logError(`${varName} is missing`);
      allPresent = false;
    }
  }

  results.envVars = allPresent;

  if (!allPresent) {
    logWarning('Please set all required environment variables in .env.local');
    return false;
  }

  return true;
}

async function testOpenAI() {
  logSection('Testing OpenAI API');

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    logInfo('Testing basic GPT-4 model first...');

    // First test with a known working model
    const basicTest = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'user', content: 'Say "API test successful" and nothing else.' }
      ],
      max_tokens: 10,
    });

    logSuccess('Basic OpenAI API connection works');
    logInfo(`Response: ${basicTest.choices[0].message.content}`);

    // Now test the deep research model
    logInfo('\nTesting o3-deep-research model...');

    try {
      const deepResearchTest = await openai.chat.completions.create({
        model: 'o3-deep-research',
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant. Ask clarifying questions before conducting research.',
          },
          {
            role: 'user',
            content: 'I want to research the impact of artificial intelligence on healthcare.',
          },
        ],
        max_tokens: 200,
      });

      logSuccess('o3-deep-research model is accessible!');
      logInfo(`Response preview: ${deepResearchTest.choices[0].message.content?.substring(0, 200)}...`);

      results.openai = true;
      return true;
    } catch (modelError: any) {
      if (modelError.status === 404 || modelError.message?.includes('does not exist')) {
        logError('o3-deep-research model not found');
        logWarning('This model might require beta access or might not exist yet');
        logInfo('Trying o4-mini-deep-research as alternative...');

        try {
          const miniTest = await openai.chat.completions.create({
            model: 'o4-mini-deep-research',
            messages: [
              { role: 'user', content: 'Test message' }
            ],
            max_tokens: 50,
          });

          logSuccess('o4-mini-deep-research works!');
          logWarning('Consider using o4-mini-deep-research or gpt-4 for now');
          results.openai = true;
          return true;
        } catch {
          logError('o4-mini-deep-research also not accessible');
          logInfo('Available alternatives: gpt-4-turbo, gpt-4, gpt-3.5-turbo');
          results.openai = false;
          return false;
        }
      }
      throw modelError;
    }
  } catch (error: any) {
    logError(`OpenAI API test failed: ${error.message}`);
    if (error.status === 401) {
      logWarning('Check your OPENAI_API_KEY in .env.local');
    }
    results.openai = false;
    return false;
  }
}

async function testGemini() {
  logSection('Testing Google Gemini API');

  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    logInfo('Sending test prompt to Gemini...');

    const result = await model.generateContent(
      'What is artificial intelligence? Answer in one sentence.'
    );
    const response = await result.response;
    const text = response.text();

    logSuccess('Gemini API is working!');
    logInfo(`Response: ${text}`);

    results.gemini = true;
    return true;
  } catch (error: any) {
    logError(`Gemini API test failed: ${error.message}`);

    if (error.message?.includes('API_KEY_INVALID')) {
      logWarning('Check your GOOGLE_GEMINI_API_KEY in .env.local');
      logInfo('Get your key from: https://makersuite.google.com/app/apikey');
    }

    results.gemini = false;
    return false;
  }
}

async function testPDFGeneration() {
  logSection('Testing PDF Generation');

  try {
    logInfo('Generating test PDF...');

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Test Research Report', 20, 20);
    doc.setFontSize(12);
    doc.text('This is a test PDF generated by the Multi-API Research Assistant.', 20, 40);
    doc.text('If you can see this, PDF generation is working correctly.', 20, 50);

    // Add some content to test multi-line
    const testContent = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20);
    const lines = doc.splitTextToSize(testContent, 170);
    doc.text(lines, 20, 70);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    logSuccess('PDF generated successfully!');
    logInfo(`PDF size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    results.pdf = true;
    return pdfBuffer;
  } catch (error: any) {
    logError(`PDF generation failed: ${error.message}`);
    results.pdf = false;
    return null;
  }
}

async function testEmailSending(pdfBuffer: Buffer | null) {
  logSection('Testing SendGrid Email');

  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

    const testEmail = process.env.SENDGRID_FROM_EMAIL || '';

    if (!testEmail) {
      logError('SENDGRID_FROM_EMAIL not set');
      results.email = false;
      return false;
    }

    logInfo(`Sending test email to: ${testEmail}`);
    logWarning('Note: Email will be sent to the FROM address (yourself)');

    const msg: any = {
      to: testEmail,
      from: {
        email: testEmail,
        name: 'Research Assistant Test',
      },
      subject: 'Test Email - Multi-API Research Assistant',
      text: 'This is a test email from your Multi-API Deep Research Assistant.\n\nIf you received this, email sending is configured correctly!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { background: #667eea; color: white; padding: 20px; border-radius: 8px; }
            .content { padding: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✅ Test Email Successful!</h1>
          </div>
          <div class="content">
            <p>This is a test email from your <strong>Multi-API Deep Research Assistant</strong>.</p>
            <p>If you received this, email sending is configured correctly!</p>
            <p><small>Generated by test script at ${new Date().toLocaleString()}</small></p>
          </div>
        </body>
        </html>
      `,
    };

    // Add PDF attachment if available
    if (pdfBuffer) {
      msg.attachments = [
        {
          content: pdfBuffer.toString('base64'),
          filename: 'test-report.pdf',
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ];
      logInfo('PDF attachment included');
    }

    await sgMail.send(msg);

    logSuccess('Email sent successfully!');
    logInfo(`Check your inbox: ${testEmail}`);

    results.email = true;
    return true;
  } catch (error: any) {
    logError(`Email sending failed: ${error.message}`);

    if (error.code === 403) {
      logWarning('SendGrid API key might not have send permissions');
      logInfo('Check your API key at: https://app.sendgrid.com/settings/api_keys');
    } else if (error.response?.body?.errors) {
      error.response.body.errors.forEach((err: any) => {
        logError(`  - ${err.message}`);
      });
    }

    results.email = false;
    return false;
  }
}

async function testFullFlow() {
  logSection('Testing Full End-to-End Flow');

  try {
    logInfo('Simulating complete research flow...');

    // 1. Initial research request
    const initialPrompt = 'What are the latest developments in quantum computing?';
    logInfo(`1. Initial prompt: "${initialPrompt}"`);

    // 2. Get refinement questions (using basic GPT-4 for reliability)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    logInfo('2. Requesting refinement questions from OpenAI...');
    const refinementResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a research assistant. Ask 2 clarifying questions to refine the research scope.',
        },
        {
          role: 'user',
          content: `I want to research: ${initialPrompt}\n\nWhat clarifying questions do you have?`,
        },
      ],
    });

    const questions = refinementResponse.choices[0].message.content;
    logSuccess('Refinement questions generated');
    logInfo(`Questions:\n${questions}`);

    // 3. Simulate answers and create refined prompt
    const refinedPrompt = `${initialPrompt}\n\nAdditional context:\nQ: Time period?\nA: Last 2 years\nQ: Specific focus?\nA: Hardware developments`;

    logInfo(`3. Refined prompt created`);

    // 4. Run parallel research
    logInfo('4. Running parallel research (OpenAI + Gemini)...');

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

    const [openaiResult, geminiResult] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a thorough research assistant. Provide comprehensive findings.',
          },
          {
            role: 'user',
            content: refinedPrompt,
          },
        ],
        max_tokens: 300,
      }),
      genAI.getGenerativeModel({ model: 'gemini-pro' })
        .generateContent(refinedPrompt)
        .then(r => r.response.text()),
    ]);

    logSuccess('Both research tasks completed!');
    logInfo(`OpenAI result length: ${openaiResult.choices[0].message.content?.length || 0} chars`);
    logInfo(`Gemini result length: ${geminiResult.length} chars`);

    // 5. Generate PDF
    logInfo('5. Generating PDF report...');
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Research Report', 20, 20);
    doc.setFontSize(10);
    doc.text('OpenAI Results:', 20, 40);
    doc.text(doc.splitTextToSize(openaiResult.choices[0].message.content || '', 170), 20, 50);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    logSuccess('PDF generated');

    // 6. Send email
    logInfo('6. Sending email with PDF...');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

    await sgMail.send({
      to: process.env.SENDGRID_FROM_EMAIL || '',
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || '',
        name: 'Research Assistant',
      },
      subject: 'Full Flow Test - Research Report',
      text: 'Full end-to-end test completed successfully!',
      html: '<h1>✅ Full Flow Test Complete!</h1><p>Check the attached PDF for research results.</p>',
      attachments: [
        {
          content: pdfBuffer.toString('base64'),
          filename: 'full-flow-test-report.pdf',
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ],
    });

    logSuccess('Email sent with PDF attachment!');
    logSuccess('🎉 FULL END-TO-END FLOW SUCCESSFUL!');

    results.fullFlow = true;
    return true;
  } catch (error: any) {
    logError(`Full flow test failed: ${error.message}`);
    results.fullFlow = false;
    return false;
  }
}

function printSummary() {
  logSection('Test Summary');

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log('');
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const testName = test.replace(/([A-Z])/g, ' $1').trim();
    console.log(`${icon} ${testName.charAt(0).toUpperCase() + testName.slice(1)}`);
  });

  console.log('\n' + '='.repeat(60));

  if (passed === total) {
    log(`\n🎉 ALL TESTS PASSED! (${passed}/${total})`, 'green');
    log('\nYour backend is fully configured and ready to go!', 'green');
    log('\nNext steps:', 'bright');
    log('  1. Build the frontend UI', 'cyan');
    log('  2. Add authentication middleware', 'cyan');
    log('  3. Deploy to Vercel', 'cyan');
  } else {
    log(`\n⚠️  SOME TESTS FAILED (${passed}/${total} passed)`, 'yellow');
    log('\nPlease fix the failed tests before proceeding.', 'yellow');
    log('\nCommon fixes:', 'bright');
    log('  - Check .env.local has all required API keys', 'cyan');
    log('  - Verify API keys have correct permissions', 'cyan');
    log('  - Check SendGrid sender email is verified', 'cyan');
    log('  - Verify o3-deep-research model access', 'cyan');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

// Main execution
async function main() {
  log('\n🔬 Multi-API Deep Research Assistant - Backend Test', 'bright');
  log('Testing all backend components...\n', 'cyan');

  try {
    // Run tests in sequence
    const envOk = await testEnvironmentVariables();

    if (!envOk) {
      logError('Cannot proceed without environment variables');
      printSummary();
      process.exit(1);
    }

    await testOpenAI();
    await testGemini();
    const pdfBuffer = await testPDFGeneration();
    await testEmailSending(pdfBuffer);

    // Only run full flow if all components work
    if (results.openai && results.gemini && results.pdf && results.email) {
      await testFullFlow();
    } else {
      logWarning('\nSkipping full flow test due to component failures');
    }

    printSummary();

    // Exit with appropriate code
    const allPassed = Object.values(results).every(Boolean);
    process.exit(allPassed ? 0 : 1);
  } catch (error: any) {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

main();
