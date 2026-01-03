'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { ResearchSession, RefinementQuestion } from '@/types';

interface NewResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewResearchModal({ isOpen, onClose }: NewResearchModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'prompt' | 'refinement' | 'processing'>('prompt');
  const [prompt, setPrompt] = useState('');
  const [refinementQuestions, setRefinementQuestions] = useState<RefinementQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmitPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !user) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
          'x-user-email': user.email || '',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to start research');
      }

      const data = await response.json();
      setSessionId(data.sessionId);

      if (data.refinementQuestions && data.refinementQuestions.length > 0) {
        setRefinementQuestions(data.refinementQuestions);
        setStep('refinement');
        setIsLoading(false);
      } else {
        setStep('processing');
        watchSession(data.sessionId);
      }
    } catch (error) {
      console.error('Error getting refinement questions:', error);
      alert('Failed to start research. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAnswer.trim() || !sessionId || !user) return;

    try {
      const response = await fetch('/api/refinement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          questionId: refinementQuestions[currentQuestionIndex].id,
          answer: currentAnswer,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      const data = await response.json();

      const updatedQuestions = [...refinementQuestions];
      updatedQuestions[currentQuestionIndex].answer = currentAnswer;
      setRefinementQuestions(updatedQuestions);
      setCurrentAnswer('');

      if (data.status === 'processing') {
        setStep('processing');
        watchSession(sessionId);
      } else if (data.nextQuestion) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer. Please try again.');
    }
  };

  const watchSession = (sessionId: string) => {
    const sessionRef = doc(db, 'research_sessions', sessionId);

    const unsubscribe = onSnapshot(sessionRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const session = docSnapshot.data() as ResearchSession;

        if (session.status === 'completed' || session.status === 'email_sent') {
          unsubscribe();
          resetModal();
          onClose();
        } else if (session.status === 'failed') {
          unsubscribe();
          alert(`Research failed: ${session.error || 'Unknown error'}`);
          resetModal();
          onClose();
        }
      }
    });

    return unsubscribe;
  };

  const resetModal = () => {
    setStep('prompt');
    setPrompt('');
    setRefinementQuestions([]);
    setCurrentQuestionIndex(0);
    setCurrentAnswer('');
    setIsLoading(false);
    setSessionId(null);
  };

  const handleClose = () => {
    if (!isLoading) {
      resetModal();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">New Research</h2>
          {!isLoading && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="p-6">
          {step === 'prompt' && (
            <form onSubmit={handleSubmitPrompt} className="space-y-4">
              <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                  What would you like to research?
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="E.g., Latest developments in quantum computing, Impact of AI on healthcare, Sustainable energy solutions..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder:text-gray-400"
                  rows={4}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading || !prompt.trim()}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Start Research'
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 'refinement' && refinementQuestions.length > 0 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Question {currentQuestionIndex + 1} of {refinementQuestions.length}
                  </span>
                  <span className="text-sm text-gray-500">
                    {Math.round(((currentQuestionIndex + 1) / refinementQuestions.length) * 100)}% complete
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex + 1) / refinementQuestions.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              <form onSubmit={handleSubmitAnswer} className="space-y-4">
                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg">
                  <p className="font-medium text-gray-900">
                    {refinementQuestions[currentQuestionIndex].question}
                  </p>
                </div>

                <div>
                  <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
                    Your answer:
                  </label>
                  <textarea
                    id="answer"
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Provide details to help refine your research..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder:text-gray-400"
                    rows={3}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50"
                  disabled={!currentAnswer.trim()}
                >
                  {currentQuestionIndex < refinementQuestions.length - 1 ? 'Next Question' : 'Start Research'}
                </button>
              </form>

              {currentQuestionIndex > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Previous answers:</h4>
                  <div className="space-y-2">
                    {refinementQuestions.slice(0, currentQuestionIndex).map((q, idx) => (
                      <div key={q.id} className="text-sm bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium text-gray-700">{idx + 1}. {q.question}</p>
                        <p className="text-gray-600 mt-1">{q.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
                <svg className="animate-spin h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Conducting Deep Research</h3>
              <p className="text-gray-600 mb-6">
                Running parallel analysis with OpenAI and Google Gemini...
              </p>
              <div className="max-w-md mx-auto space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>OpenAI Deep Research API</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Google Gemini API</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-6">
                This may take a few moments. We'll notify you when complete.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
