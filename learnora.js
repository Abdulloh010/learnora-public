import React, { useState } from 'react';
import { Bell, Book, BookOpen, Home, LogIn, LogOut, Menu, Monitor, User, X } from 'lucide-react';
import HomePage from './HomePage';
import RegistrationPage from './RegistrationPage';
import QuizPage from './QuizPage';
import FlashcardsPage from './FlashcardsPage';
import NotesPage from './NotesPage';

// Main App Component
const LearningPlatform = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Sample data
  const [courses, setCourses] = useState([
    { 
      id: 1, 
      title: 'Introduction to React', 
      description: 'Learn the basics of React and build your first app',
      level: 'Beginner',
      duration: '4 weeks',
      enrolled: 1248
    },
    { 
      id: 2, 
      title: 'JavaScript Fundamentals', 
      description: 'Master the core concepts of JavaScript programming',
      level: 'Beginner',
      duration: '6 weeks',
      enrolled: 2354
    },
    { 
      id: 3, 
      title: 'Data Structures & Algorithms', 
      description: 'Explore essential computer science concepts',
      level: 'Intermediate',
      duration: '8 weeks',
      enrolled: 1876
    }
  ]);

  // Navigation handler
  const navigateTo = (page) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
  };

  // Handle login
  const handleLogin = (user) => {
    setIsLoggedIn(true);
    setUsername(user);
  };

  // Handle logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    navigateTo('home');
  };

  // Render the current page
  const renderPage = () => {
    switch(currentPage) {
      case 'home':
        return <HomePage navigateTo={navigateTo} courses={courses} isLoggedIn={isLoggedIn} username={username} />;
      case 'register':
        return <RegistrationPage navigateTo={navigateTo} onLogin={handleLogin} />;
      case 'quiz':
        return <QuizPage navigateTo={navigateTo} />;
      case 'flashcards':
        return <FlashcardsPage navigateTo={navigateTo} />;
      case 'notes':
        return <NotesPage navigateTo={navigateTo} />;
      default:
        return <HomePage navigateTo={navigateTo} courses={courses} isLoggedIn={isLoggedIn} username={username} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar 
        navigateTo={navigateTo} 
        isLoggedIn={isLoggedIn} 
        username={username} 
        onLogout={handleLogout}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
      <main className="flex-grow container mx-auto px-4 py-8">
        {renderPage()}
      </main>
      <Footer />
    </div>
  );
};

// Navigation Bar Component
const Navbar = ({ navigateTo, isLoggedIn, username, onLogout, mobileMenuOpen, setMobileMenuOpen }) => {
  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="container mx-auto px-6 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <span 
              className="font-bold text-xl text-blue-600 cursor-pointer flex items-center" 
              onClick={() => navigateTo('home')}
            >
              <BookOpen className="mr-2" size={24} />
              LearnHub
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-1">
            <NavButton icon={<Home size={18} />} label="Home" onClick={() => navigateTo('home')} />
            <NavButton icon={<Monitor size={18} />} label="Quizzes" onClick={() => navigateTo('quiz')} />
            <NavButton icon={<Book size={18} />} label="Flashcards" onClick={() => navigateTo('flashcards')} />
            <NavButton icon={<Bell size={18} />} label="Notes" onClick={() => navigateTo('notes')} />
            
            {!isLoggedIn ? (
              <button 
                className="ml-2 flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => navigateTo('register')}
              >
                <LogIn size={18} className="mr-1" />
                <span>Sign In</span>
              </button>
            ) : (
              <div className="flex items-center ml-4">
                <div className="bg-blue-100 text-blue-800 p-2 rounded-full">
                  <User size={20} />
                </div>
                <span className="ml-2 mr-3 font-medium">{username}</span>
                <button 
                  className="text-gray-600 hover:text-red-600"
                  onClick={onLogout}
                >
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              className="text-gray-600 hover:text-blue-600 focus:outline-none"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 py-2">
          <div className="container mx-auto px-6">
            <div className="flex flex-col space-y-2">
              <MobileNavButton label="Home" onClick={() => navigateTo('home')} />
              <MobileNavButton label="Quizzes" onClick={() => navigateTo('quiz')} />
              <MobileNavButton label="Flashcards" onClick={() => navigateTo('flashcards')} />
              <MobileNavButton label="Notes" onClick={() => navigateTo('notes')} />
              
              {!isLoggedIn ? (
                <button 
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors w-full text-left"
                  onClick={() => navigateTo('register')}
                >
                  Sign In / Register
                </button>
              ) : (
                <div className="flex justify-between items-center p-2 border-t border-gray-200 mt-2 pt-2">
                  <div className="flex items-center">
                    <div className="bg-blue-100 text-blue-800 p-2 rounded-full">
                      <User size={20} />
                    </div>
                    <span className="ml-2 font-medium">{username}</span>
                  </div>
                  <button 
                    className="text-gray-600 hover:text-red-600"
                    onClick={onLogout}
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

// Navigation Button for Desktop
const NavButton = ({ icon, label, onClick }) => {
  return (
    <button 
      className="flex items-center px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-colors"
      onClick={onClick}
    >
      {icon}
      <span className="ml-1">{label}</span>
    </button>
  );
};

// Navigation Button for Mobile
const MobileNavButton = ({ label, onClick }) => {
  return (
    <button 
      className="px-3 py-2 w-full text-left text-gray-600 hover:bg-gray-100 hover:text-blue-600 rounded transition-colors"
      onClick={onClick}
    >
      {label}
    </button>
  );
};

// Home Page Component
const HomePage = ({ navigateTo, courses, isLoggedIn, username }) => {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl text-white p-8 mb-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Unlock Your Learning Potential</h1>
          <p className="text-lg mb-8 opacity-90">Discover a better way to learn with our interactive platform that adapts to your needs</p>
          {!isLoggedIn ? (
            <button 
              className="bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
              onClick={() => navigateTo('register')}
            >
              Get Started for Free
            </button>
          ) : (
            <button 
              className="bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
              onClick={() => navigateTo('quiz')}
            >
              Continue Learning
            </button>
          )}
        </div>
      </section>
      
      {/* Featured Courses Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Featured Courses</h2>
          <button className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
            View All Courses
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <div key={course.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                    {course.level}
                  </span>
                  <span className="text-gray-500 text-sm">{course.duration}</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-800">{course.title}</h3>
                <p className="text-gray-600 mb-4">{course.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{course.enrolled.toLocaleString()} students</span>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Explore
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      {/* Features Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Learning Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard 
            title="Interactive Quizzes"
            description="Test your knowledge with our adaptive quizzes that help identify and strengthen weak areas"
            action="Try Quizzes"
            color="bg-gradient-to-br from-purple-500 to-indigo-600"
            onClick={() => navigateTo('quiz')}
          />
          
          <FeatureCard 
            title="Smart Flashcards"
            description="Memorize key concepts efficiently with our spaced repetition flashcard system"
            action="Study Flashcards"
            color="bg-gradient-to-br from-green-500 to-teal-600"
            onClick={() => navigateTo('flashcards')}
          />
          
          <FeatureCard 
            title="Organized Notes"
            description="Create and organize your study notes with our powerful editor and tagging system"
            action="Take Notes"
            color="bg-gradient-to-br from-orange-500 to-red-600"
            onClick={() => navigateTo('notes')}
          />
        </div>
      </section>
      
      {/* Testimonial Section */}
      <section className="bg-white rounded-xl shadow-md p-8 mb-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">What Our Students Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <TestimonialCard 
            name="Alex Johnson"
            role="Computer Science Student"
            testimonial="The interactive quizzes helped me understand complex programming concepts that I struggled with for months."
          />
          <TestimonialCard 
            name="Sarah Williams"
            role="Data Scientist"
            testimonial="I love how the flashcard system adapts to my learning pace. It's helped me prepare for certification exams effectively."
          />
          <TestimonialCard 
            name="Michael Chen"
            role="Web Developer"
            testimonial="The note-taking features are amazing. Being able to organize and access my notes from anywhere has been a game-changer."
          />
        </div>
      </section>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ title, description, action, color, onClick }) => {
  return (
    <div className={`${color} text-white rounded-xl shadow-md overflow-hidden`}>
      <div className="p-6">
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="opacity-90 mb-6">{description}</p>
        <button 
          className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          onClick={onClick}
        >
          {action}
        </button>
      </div>
    </div>
  );
};

// Testimonial Card Component
const TestimonialCard = ({ name, role, testimonial }) => {
  return (
    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
      <p className="text-gray-700 mb-4 italic">"{testimonial}"</p>
      <div className="flex items-center">
        <div className="bg-blue-100 text-blue-800 p-2 rounded-full">
          <User size={20} />
        </div>
        <div className="ml-3">
          <p className="font-semibold text-gray-800">{name}</p>
          <p className="text-sm text-gray-500">{role}</p>
        </div>
      </div>
    </div>
  );
};

// Registration Page Component
const RegistrationPage = ({ navigateTo, onLogin }) => {
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Clear error for this field
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: null
      });
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (activeTab === 'register') {
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
      
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (activeTab === 'login') {
      // Handle login
      onLogin(formData.username);
      navigateTo('home');
    } else {
      // Handle registration
      onLogin(formData.username);
      navigateTo('home');
    }
  };
  
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="flex">
          <button 
            className={`w-1/2 p-4 text-center font-medium ${activeTab === 'login' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setActiveTab('login')}
          >
            Sign In
          </button>
          <button 
            className={`w-1/2 p-4 text-center font-medium ${activeTab === 'register' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setActiveTab('register')}
          >
            Register
          </button>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="username">Username</label>
              <input 
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${errors.username ? 'border-red-500' : 'border-gray-300'}`}
                type="text" 
                id="username" 
                name="username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
              />
              {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
            </div>
            
            {activeTab === 'register' && (
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2" htmlFor="email">Email</label>
                <input 
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                  type="email" 
                  id="email" 
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="password">Password</label>
              <input 
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                type="password" 
                id="password" 
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>
            
            {activeTab === 'register' && (
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2" htmlFor="confirmPassword">Confirm Password</label>
                <input 
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                  type="password" 
                  id="confirmPassword" 
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>
            )}
            
            {activeTab === 'login' && (
              <div className="flex justify-end mb-6">
                <button type="button" className="text-blue-600 text-sm hover:underline">
                  Forgot password?
                </button>
              </div>
            )}
            
            <button 
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              type="submit"
            >
              {activeTab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Quiz Page Component
const QuizPage = ({ navigateTo }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  
  // Sample quiz data
  const questions = [
    {
      question: 'What is React primarily used for?',
      options: [
        'Server-side rendering',
        'Building user interfaces',
        'Database management',
        'Machine learning'
      ],
      correctAnswer: 1,
      explanation: 'React is a JavaScript library for building user interfaces, particularly for single-page applications where UI updates are frequent.'
    },
    {
      question: 'Which of the following is a React hook?',
      options: [
        'useEffect',
        'useReact',
        'useRender',
        'useDOM'
      ],
      correctAnswer: 0,
      explanation: 'useEffect is a built-in React Hook that allows you to perform side effects in function components, similar to lifecycle methods in class components.'
    },
    {
      question: 'What is JSX?',
      options: [
        'A JavaScript library',
        'A programming language',
        'A syntax extension for JavaScript',
        'A database query language'
      ],
      correctAnswer: 2,
      explanation: 'JSX is a syntax extension for JavaScript that looks similar to HTML and allows you to write HTML elements in JavaScript and place them in the DOM.'
    }
  ];
  
  const handleAnswerSelect = (answerIndex) => {
    setSelectedAnswer(answerIndex);
  };
  
  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    
    setAnswerSubmitted(true);
    if (selectedAnswer === questions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
  };
  
  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setAnswerSubmitted(false);
    
    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < questions.length) {
      setCurrentQuestion(nextQuestion);
    } else {
      setShowScore(true);
    }
  };
  
  const resetQuiz = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowScore(false);
    setSelectedAnswer(null);
    setAnswerSubmitted(false);
  };
  
  const getAnswerButtonClass = (index) => {
    if (!answerSubmitted) {
      return selectedAnswer === index 
        ? 'border-blue-500 bg-blue-50'
        : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50';
    }
    
    if (index === questions[currentQuestion].correctAnswer) {
      return 'border-green-500 bg-green-50';
    }
    
    if (selectedAnswer === index && selectedAnswer !== questions[currentQuestion].correctAnswer) {
      return 'border-red-500 bg-red-50';
    }
    
    return 'border-gray-300 opacity-70';
  };
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">React Knowledge Quiz</h1>
        
        {showScore ? (
          <div className="text-center">
            <div className="p-6 bg-blue-50 rounded-xl mb-6">
              <h2 className="text-xl font-semibold mb-2">Quiz Completed!</h2>
              <p className="text-3xl font-bold text-blue-600 mb-2">{score} out of {questions.length}</p>
              <p className="text-gray-600">
                {score === questions.length 
                  ? 'Perfect score! Excellent work!' 
                  : score >= questions.length / 2 
                    ? 'Good job! Keep practicing to improve your knowledge.' 
                    : 'Keep learning! Try again to improve your score.'}
              </p>
            </div>
            <div className="flex justify-center space-x-4">
              <button 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                onClick={resetQuiz}
              >
                Retry Quiz
              </button>
              <button 
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => navigateTo('home')}
              >
                Back to Home
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
                              <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${((currentQuestion) / questions.length) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">{questions[currentQuestion].question}</h2>
              <div className="space-y-3 mb-6">
                {questions[currentQuestion].options.map((option, index) => (
                  <button
                    key={index}
                    className={`w-full text-left p-4 border rounded-lg transition-colors ${getAnswerButtonClass(index)}`}
                    onClick={() => !answerSubmitted && handleAnswerSelect(index)}
                    disabled={answerSubmitted}
                  >
                    <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
                  </button>
                ))}
              </div>
              
              {answerSubmitted && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                  <p className="font-medium mb-1">Explanation:</p>
                  <p className="text-gray-700">{questions[currentQuestion].explanation}</p>
                </div>
              )}
              
              {!answerSubmitted ? (
                <button 
                  className={`w-full bg-blue-600 text-white px-4 py-3 rounded-lg ${selectedAnswer === null ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'} transition-colors`}
                  onClick={handleSubmitAnswer}
                  disabled={selectedAnswer === null}
                >
                  Submit Answer
                </button>
              ) : (
                <button 
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors"
                  onClick={handleNextQuestion}
                >
                  {currentQuestion < questions.length - 1 ? 'Next Question' : 'See Results'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Flashcards Page Component
const FlashcardsPage = ({ navigateTo }) => {
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [difficulty, setDifficulty] = useState('all');
  
  // Sample flashcard data
  const allFlashcards = [
    {
      question: 'What is React?',
      answer: 'React is a JavaScript library for building user interfaces, particularly single-page applications.',
      difficulty: 'easy'
    },
    {
      question: 'What is a component in React?',
      answer: 'A component is a reusable piece of code that returns a React element to be rendered to the page.'
    },
    {
      question: 'What is state in React?',
      answer: 'State is a JavaScript object that stores component data that may change over time.'
    },
    {
      question: 'What are props in React?',
      answer: 'Props are inputs to a React component that allow passing data from parent to child components.'
    }
  ];
  
  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };
  
  const nextCard = () => {
    if (currentCard < flashcards.length - 1) {
      setCurrentCard(currentCard + 1);
      setIsFlipped(false);
    }
  };
  
  const prevCard = () => {
    if (currentCard > 0) {
      setCurrentCard(currentCard - 1);
      setIsFlipped(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">React Concepts Flashcards</h1>
      
      <div className="mb-6 text-center">
        <p>Card {currentCard + 1} of {flashcards.length}</p>
      </div>
      
      <div 
        className="bg-white shadow-xl rounded-lg p-6 h-64 flex items-center justify-center cursor-pointer mb-6"
        onClick={flipCard}
      >
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">
            {isFlipped ? 'Answer:' : 'Question:'}
          </h2>
          <p className="text-lg">
            {isFlipped ? flashcards[currentCard].answer : flashcards[currentCard].question}
          </p>
        </div>
      </div>
      
      <div className="flex justify-between">
        <button 
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
          onClick={prevCard}
          disabled={currentCard === 0}
        >
          Previous
        </button>
        <button 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={flipCard}
        >
          Flip Card
        </button>
        <button 
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
          onClick={nextCard}
          disabled={currentCard === flashcards.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
};

// Notes Page Component
const NotesPage = ({ navigateTo }) => {
  const [notes, setNotes] = useState([
    { id: 1, title: 'React Components', content: 'Components are the building blocks of React applications...' },
    { id: 2, title: 'React Hooks', content: 'Hooks are a new addition in React 16.8...' }
  ]);
  const [activeNote, setActiveNote] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  
  const createNewNote = () => {
    setActiveNote(null);
    setNoteTitle('');
    setNoteContent('');
  };
  
  const selectNote = (note) => {
    setActiveNote(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
  };
  
  const saveNote = () => {
    if (!noteTitle.trim()) return;
    
    if (activeNote === null) {
      // Create new note
      const newNote = {
        id: Date.now(),
        title: noteTitle,
        content: noteContent
      };
      setNotes([...notes, newNote]);
      setActiveNote(newNote.id);
    } else {
      // Update existing note
      const updatedNotes = notes.map(note => 
        note.id === activeNote ? { ...note, title: noteTitle, content: noteContent } : note
      );
      setNotes(updatedNotes);
    }
  };
  
  const deleteNote = () => {
    if (activeNote !== null) {
      const updatedNotes = notes.filter(note => note.id !== activeNote);
      setNotes(updatedNotes);
      createNewNote();
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Your Notes</h2>
          <button 
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            onClick={createNewNote}
          >
            New Note
          </button>
        </div>
        <div className="space-y-2">
          {notes.map(note => (
            <div 
              key={note.id} 
              className={`p-3 border rounded cursor-pointer ${activeNote === note.id ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'}`}
              onClick={() => selectNote(note)}
            >
              <h3 className="font-bold truncate">{note.title}</h3>
              <p className="text-sm text-gray-600 truncate">{note.content}</p>
            </div>
          ))}
          {notes.length === 0 && (
            <p className="text-gray-500 text-center py-4">No notes yet. Create one!</p>
          )}
        </div>
      </div>
      
      <div className="md:col-span-2 bg-white rounded-lg shadow-md p-4">
        <div className="mb-4">
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Note Title"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
          />
          <textarea
            className="w-full px-3 py-2 border rounded-lg h-64 focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Write your note here..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
          ></textarea>
        </div>
        <div className="flex justify-between">
          {activeNote !== null && (
            <button 
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              onClick={deleteNote}
            >
              Delete
            </button>
          )}
          <button 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 ml-auto"
            onClick={saveNote}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Footer Component
const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-6">
      <div className="container mx-auto px-6 text-center">
        <p className="mb-2">© 2025 LearnHub - All Rights Reserved</p>
        <p className="text-gray-400 text-sm">Your premier platform for interactive learning</p>
      </div>
    </footer>
  );
};

export default LearningPlatform;