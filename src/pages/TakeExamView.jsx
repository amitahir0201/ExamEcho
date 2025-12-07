import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Clock, CheckCircle2, AlertCircle, ArrowLeft, Save, Image, Video, FileText, HelpCircle, CheckCircle, Award, ChevronRight, ChevronLeft, List } from 'lucide-react'
import { getExamSummary, fetchExamQuestions, submitExam } from '../services/api'
import { useCountdown } from '../hooks/useCountdown'

/**
 * TakeExamView - Page for students to take an exam
 */
export default function TakeExamView() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [examSummary, setExamSummary] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [startTime] = useState(new Date())
  const [attemptId] = useState(location.state?.attemptId || `ATT-${Date.now()}`)

  // Load exam data
  useEffect(() => {
    const loadExam = async () => {
      try {
        const [summary, questionsData] = await Promise.all([
          getExamSummary(examId),
          fetchExamQuestions(examId)
        ])
        setExamSummary(summary)
        const loadedQuestions = questionsData.questions || []
        console.log('Loaded questions:', loadedQuestions.length, 'questions')
        console.log('Question types:', loadedQuestions.map(q => ({ id: q.id, type: q.type, hasOptions: !!q.options })))
        
        // Ensure all questions are properly formatted
        const formattedQuestions = loadedQuestions.map((q, index) => ({
          id: q.id || `Q${index + 1}`,
          type: q.type || 'mcq',
          question: q.question || '',
          points: q.points || 1,
          options: q.options || [],
          media: q.media || null
        }))
        
        setQuestions(formattedQuestions)
      } catch (err) {
        console.error('Error loading exam:', err)
        setError(err?.message || 'Failed to load exam')
      } finally {
        setLoading(false)
      }
    }
    loadExam()
  }, [examId])

  // Timer for exam duration
  const examEndTime = examSummary 
    ? new Date(new Date(startTime).getTime() + (examSummary.durationMin * 60 * 1000))
    : null

  const { formatted: timeRemaining, expired: timeExpired } = useCountdown(
    examEndTime?.toISOString(),
    () => {
      // Auto-submit when time expires
      if (!submitting) {
        handleSubmit()
      }
    }
  )

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleSubmit = async () => {
    if (submitting) return

    const unanswered = questions.filter(q => {
      const answer = answers[q.id]
      return !answer && (typeof answer !== 'string' || !answer.trim())
    })
    if (unanswered.length > 0 && !confirm(`You have ${unanswered.length} unanswered questions. Submit anyway?`)) {
      return
    }

    setSubmitting(true)
    try {
      const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000 / 60) // minutes
      const result = await submitExam(examId, {
        answers,
        attemptId,
        startedAt: startTime.toISOString(),
        timeSpent,
        studentId: 'STU001' // In real app, get from auth
      })

      // Navigate to results
      navigate(`/student/exams/${examId}/results`, {
        state: {
          score: result.score,
          maxScore: result.maxScore,
          percentage: result.percentage,
          submissionId: result.submissionId
        }
      })
    } catch (err) {
      setError(err?.message || 'Failed to submit exam')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading exam...</div>
      </div>
    )
  }

  if (error || !examSummary) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error || 'Exam not found'}</p>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const answeredCount = Object.keys(answers).filter(key => {
    const answer = answers[key]
    return answer !== '' && answer != null && (typeof answer !== 'string' || answer.trim().length > 0)
  }).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/student/available')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Go back to available exams"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{examSummary.title}</h1>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Time Remaining</div>
                <div className={`flex items-center gap-2 text-lg font-bold ${timeExpired ? 'text-red-600' : 'text-gray-900'}`}>
                  <Clock className={`w-5 h-5 ${timeExpired ? 'text-red-600 animate-pulse' : 'text-blue-600'}`} />
                  <span>{timeExpired ? 'Time Up!' : timeRemaining}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Progress</div>
                <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <CheckCircle className={`w-5 h-5 ${answeredCount === questions.length ? 'text-green-600' : 'text-blue-600'}`} />
                  <span>{answeredCount}/{questions.length}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Points</div>
                <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <Award className="w-5 h-5 text-yellow-600" />
                  <span>{questions.reduce((sum, q) => sum + (q.points || 1), 0)} pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {questions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No questions available for this exam.</p>
          </div>
        ) : currentQuestion ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            {/* Question Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-3 py-1 text-sm font-semibold rounded flex items-center gap-1 ${
                    currentQuestion.type === 'mcq' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {currentQuestion.type === 'mcq' ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        MCQ
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        Descriptive
                      </>
                    )}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-semibold rounded flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    {currentQuestion.points || 1} point{currentQuestion.points !== 1 ? 's' : ''}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </h2>
                <div className="bg-gray-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-4">
                  <p className="text-base text-gray-800 leading-relaxed">
                    {currentQuestion.question}
                  </p>
                </div>
              </div>
            </div>

            {/* Media Attachments */}
            {(currentQuestion.media?.image || currentQuestion.media?.video || currentQuestion.media?.graph) && (
              <div className="mb-6 space-y-3">
                {currentQuestion.media.image && (
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Image className="w-5 h-5 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Image</span>
                    </div>
                    <img 
                      src={currentQuestion.media.image.url} 
                      alt="Question image" 
                      className="max-w-full h-auto rounded"
                    />
                  </div>
                )}
                {currentQuestion.media.video && (
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Video className="w-5 h-5 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Video</span>
                    </div>
                    <video 
                      src={currentQuestion.media.video.url} 
                      controls 
                      className="max-w-full rounded"
                    />
                  </div>
                )}
                {currentQuestion.media.graph && (
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Graph/Chart</span>
                    </div>
                    <img 
                      src={currentQuestion.media.graph.url} 
                      alt="Question graph" 
                      className="max-w-full h-auto rounded"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Answer Section */}
            <div className="mb-6">
              {currentQuestion.type === 'mcq' && currentQuestion.options && currentQuestion.options.length > 0 ? (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    Select your answer:
                  </label>
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = answers[currentQuestion.id] === index
                    return (
                      <label
                        key={index}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value={index}
                          checked={isSelected}
                          onChange={() => handleAnswerChange(currentQuestion.id, index)}
                          className="w-5 h-5 text-blue-600"
                        />
                        <span className={`flex-1 ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                          {option}
                        </span>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </label>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    Write your detailed answer:
                  </label>
                  <div className="border-2 border-purple-200 rounded-lg p-1 bg-purple-50/30">
                    <textarea
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      rows={12}
                      className="w-full px-4 py-3 border-2 border-transparent rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-y min-h-[250px] font-sans text-base leading-relaxed bg-white"
                      placeholder="Type your detailed answer here. Be thorough and clear in your response..."
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 p-2 rounded">
                    <HelpCircle className="w-3 h-3 text-blue-600 flex-shrink-0" />
                    <span>Your answer will be reviewed and graded by faculty. Make sure to provide a complete and well-structured response.</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <span className="font-medium">Character count: <span className="text-blue-600">{(answers[currentQuestion.id] || '').length}</span></span>
                    <span className="text-gray-500">Minimum recommended: 50 characters</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Question not found.</p>
          </div>
        )}

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {/* Question Navigation Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                <List className="w-3 h-3" />
                Question Navigator
              </span>
              <span className="text-xs text-gray-500">
                {answeredCount} of {questions.length} answered
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center p-2 bg-gray-50 rounded-lg">
              {questions.map((q, index) => {
                const questionId = q.id
                const isAnswered = answers[questionId] !== undefined && answers[questionId] !== '' && answers[questionId] != null
                const questionType = q.type || 'mcq'
                const isCurrent = index === currentQuestionIndex
                return (
                  <button
                    key={questionId || index}
                    onClick={() => setCurrentQuestionIndex(index)}
                    title={`Question ${index + 1}: ${questionType.toUpperCase()}${isAnswered ? ' (Answered)' : ' (Not answered)'}`}
                    className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all flex items-center justify-center relative ${
                      isCurrent
                        ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-md scale-110'
                        : isAnswered
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-white text-gray-600 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    {index + 1}
                    {isAnswered && !isCurrent && (
                      <CheckCircle className="absolute -top-1 -right-1 w-4 h-4 text-green-600 bg-white rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>

            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={submitting || timeExpired}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
              >
                <Save className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit Exam'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

