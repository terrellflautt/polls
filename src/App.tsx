import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import './App.css';
import { Footer } from './components/Footer';
import { Pricing } from './components/Pricing';
import { authService, UserProfile } from './utils/auth';

declare global {
  interface Window {
    SNAPIT_CONFIG: any;
  }
}

const API_URL = window.SNAPIT_CONFIG?.API_BASE_URL || 'https://polls-api.snapitsoftware.com';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  pollId: string;
  title: string;
  options?: PollOption[]; // Optional - only present in full poll details
  optionCount?: number; // Present in list view instead of full options array
  createdAt: number;
  expiresAt?: number | null;
  totalVotes: number;
  shortLink?: string;
  visibility?: 'public' | 'private';
  pollType?: 'simple' | 'survey'; // Simple poll vs survey with form submission
  creatorEmail?: string; // For sending results
  collectEmail?: boolean; // Whether to collect voter email
  collectName?: boolean; // Whether to collect voter name
  collectPhone?: boolean; // Whether to collect voter phone
}

interface CreatePollResponse {
  pollId: string;
  shareUrl: string;
  embedCode: string;
  shortLink: string;
  createdAt: string;
  poll: Poll;
}

// Header Component with Authentication
function Header() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe((state) => {
      setUser(state.user);
    });

    // Initialize Google OAuth
    const initAuth = () => {
      if (window.google?.accounts?.id) {
        authService.initGoogleAuth(() => {
          setShowAuthModal(false);
        });
      } else {
        setTimeout(initAuth, 500);
      }
    };
    initAuth();

    // Get initial state
    setUser(authService.getUser());

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (showAuthModal) {
      setTimeout(() => {
        authService.renderGoogleButton('google-signin-button');
      }, 100);
    }
  }, [showAuthModal]);

  const handleSignOut = () => {
    authService.signOut();
    setShowUserMenu(false);
  };

  return (
    <>
      <div style={{
        background: '#000000',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        position: 'relative',
        borderBottom: '1px solid rgba(255, 20, 147, 0.3)'
      }}>
        <div style={{
          color: '#FF1493',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          textShadow: '0 0 20px rgba(255, 20, 147, 0.5)',
          letterSpacing: '0.5px'
        }}>
          SnapIT Polls
        </div>

        <div style={{
          display: 'flex',
          gap: '2rem',
          alignItems: 'center'
        }}>
          <a
            href="https://snapitforms.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontWeight: '500',
              transition: 'color 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#FF1493'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
          >
            Forms
          </a>
          <a
            href="https://snapitqr.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontWeight: '500',
              transition: 'color 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#FF1493'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
          >
            QR
          </a>
          <a
            href="https://snapiturl.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontWeight: '500',
              transition: 'color 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#FF1493'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
          >
            URL
          </a>
        </div>

        <div style={{ position: 'relative' }}>
          {user ? (
            <div>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  background: 'white',
                  border: '2px solid #FF1493',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  color: '#FF1493',
                  transition: 'all 0.3s ease'
                }}
              >
                {user.picture ? (
                  <img src={user.picture} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                ) : (
                  user.name?.charAt(0).toUpperCase()
                )}
              </button>

              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '50px',
                  background: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  padding: '0.5rem',
                  minWidth: '200px',
                  zIndex: 1000
                }}>
                  <div style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{user.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>{user.email}</div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: '#dc3545',
                      fontWeight: '500'
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                background: '#FF1493',
                color: 'white',
                border: '2px solid #FF1493',
                padding: '0.5rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 0 15px rgba(255, 20, 147, 0.4)'
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }} onClick={() => setShowAuthModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Sign In to SnapIT Polls</h2>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              Sign in to create polls with form submission, get email notifications, and access all SnapIT ecosystem features.
            </p>
            <div id="google-signin-button" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}></div>
            <button
              onClick={() => setShowAuthModal(false)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                background: 'white',
                borderRadius: '8px',
                cursor: 'pointer',
                marginTop: '1rem'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Home Component
function Home() {
  const navigate = useNavigate();
  const [pollId, setPollId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [topPolls, setTopPolls] = useState<Poll[]>([]);

  useEffect(() => {
    loadTopPolls();
  }, []);

  const loadTopPolls = async () => {
    try {
      const response = await fetch(`${API_URL}/polls?visibility=public&limit=6`);
      if (response.ok) {
        const data = await response.json();
        const sortedPolls = (data.polls || []).sort((a: Poll, b: Poll) => b.totalVotes - a.totalVotes);
        setTopPolls(sortedPolls.slice(0, 6));
      }
    } catch (err) {
      console.error('Failed to load top polls:', err);
    }
  };

  const loadPoll = async (id: string) => {
    if (!id.trim()) {
      setError('Please enter a poll ID');
      return;
    }
    setLoading(true);
    setError('');
    // Navigate to the poll page
    navigate(`/p/${id}`);
  };

  return (
    <div className="App">
      <div className="container">
        <h1>SnapIT Polls</h1>
        <p className="subtitle">Create anonymous polls and gather instant feedback</p>

        <div className="button-group">
          <button className="btn btn-primary" onClick={() => navigate('/create')}>
            Create New Poll
          </button>

          <button className="btn btn-secondary" onClick={() => navigate('/discover')}>
            Discover Public Polls
          </button>

          <div className="poll-lookup">
            <input
              type="text"
              placeholder="Enter poll ID"
              value={pollId}
              onChange={(e) => setPollId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && loadPoll(pollId)}
            />
            <button className="btn btn-secondary" onClick={() => loadPoll(pollId)} disabled={loading}>
              View Poll
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        {topPolls.length > 0 && (
          <div className="top-polls-section">
            <h2>Top Active Polls</h2>
            <div className="polls-list">
              {topPolls.map((poll, index) => (
                <div
                  key={poll.pollId}
                  className="poll-card"
                  onClick={() => navigate(`/p/${poll.pollId}`)}
                >
                  <div className="poll-rank">#{index + 1}</div>
                  <div className="poll-info">
                    <h3>{poll.title}</h3>
                    <div className="poll-stats">
                      <span>{poll.totalVotes} votes</span>
                      <span>•</span>
                      <span>{poll.optionCount || 0} options</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Create Poll Component
function CreatePoll() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [pollType, setPollType] = useState<'simple' | 'survey'>('simple');
  const [collectEmail, setCollectEmail] = useState(false);
  const [collectName, setCollectName] = useState(false);
  const [collectPhone, setCollectPhone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const user = authService.getUser();
  const isAuthenticated = authService.isAuthenticated();

  const createPoll = async () => {
    if (!question.trim()) {
      setError('Question is required');
      return;
    }
    const validOptions = options.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      setError('At least 2 options are required');
      return;
    }

    // Check if user needs to be authenticated for survey polls
    if (pollType === 'survey' && !isAuthenticated) {
      setShowAuthPrompt(true);
      setError('Please sign in to create polls with form submission');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const headers: any = {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders()
      };

      const response = await fetch(`${API_URL}/polls`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question: question.trim(),
          options: validOptions,
          expiresInHours,
          visibility: visibility,
          pollType: pollType,
          collectEmail: pollType === 'survey' ? collectEmail : false,
          collectName: pollType === 'survey' ? collectName : false,
          collectPhone: pollType === 'survey' ? collectPhone : false,
          creatorEmail: user?.email || null
        })
      });

      if (response.ok) {
        const data: CreatePollResponse = await response.json();
        // Navigate to results page with the full poll ID (API doesn't accept short links)
        navigate(`/p/${data.pollId}/results`, {
          state: { shareUrl: data.shareUrl, pollData: data.poll }
        });
      } else {
        setError('Failed to create poll');
      }
    } catch (err) {
      setError('Failed to create poll');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  return (
    <div className="App">
      <div className="container">
        <button className="btn-back" onClick={() => navigate('/')}>← Back</button>

        <h1>Create a Poll</h1>

        <div className="form-group">
          <label>Question</label>
          <input
            type="text"
            placeholder="What's your question?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="form-group">
          <label>Options</label>
          {options.map((option, index) => (
            <div key={index} className="option-input">
              <input
                type="text"
                placeholder={`Option ${index + 1}`}
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                maxLength={100}
              />
              {options.length > 2 && (
                <button
                  className="btn-remove"
                  onClick={() => removeOption(index)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {options.length < 10 && (
            <button className="btn-add" onClick={addOption}>
              + Add Option
            </button>
          )}
        </div>

        <div className="form-group">
          <label>Expires In</label>
          <select
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(Number(e.target.value))}
          >
            <option value={1}>1 hour</option>
            <option value={6}>6 hours</option>
            <option value={24}>24 hours</option>
            <option value={72}>3 days</option>
            <option value={168}>1 week</option>
            <option value={0}>Never</option>
          </select>
        </div>

        <div className="form-group">
          <label>Visibility</label>
          <div className="visibility-toggle">
            <label className="visibility-option">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === 'private'}
                onChange={(e) => setVisibility(e.target.value as 'private')}
              />
              <span>Private (Unlisted)</span>
              <small>Only people with the link can access</small>
            </label>
            <label className="visibility-option">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === 'public'}
                onChange={(e) => setVisibility(e.target.value as 'public')}
              />
              <span>Public (Discoverable)</span>
              <small>Appears in public polls listing</small>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>Poll Type</label>
          <div className="visibility-toggle">
            <label className="visibility-option">
              <input
                type="radio"
                name="pollType"
                value="simple"
                checked={pollType === 'simple'}
                onChange={(e) => setPollType(e.target.value as 'simple')}
              />
              <span>Simple Poll</span>
              <small>Anonymous voting, no personal information collected</small>
            </label>
            <label className="visibility-option">
              <input
                type="radio"
                name="pollType"
                value="survey"
                checked={pollType === 'survey'}
                onChange={(e) => setPollType(e.target.value as 'survey')}
                disabled={!isAuthenticated}
              />
              <span>Survey with Form Submission {!isAuthenticated && '🔒'}</span>
              <small>Collect respondent info & get email notifications {!isAuthenticated && '(Sign in required)'}</small>
            </label>
          </div>
        </div>

        {pollType === 'survey' && isAuthenticated && (
          <div className="form-group">
            <label>Collect Respondent Information</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={collectEmail}
                  onChange={(e) => setCollectEmail(e.target.checked)}
                />
                <span>Email Address</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={collectName}
                  onChange={(e) => setCollectName(e.target.checked)}
                />
                <span>Name</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={collectPhone}
                  onChange={(e) => setCollectPhone(e.target.checked)}
                />
                <span>Phone Number</span>
              </label>
            </div>
            <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
              Responses will be sent to: {user?.email}
            </small>
          </div>
        )}

        {showAuthPrompt && (
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <strong>Sign in required</strong>
            <p style={{ margin: '0.5rem 0 0 0' }}>
              Survey polls with form submission require you to sign in so we can send results to your email.
            </p>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        <button
          className="btn btn-primary"
          onClick={createPoll}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Poll'}
        </button>
      </div>
    </div>
  );
}

// Poll Voting Component
function PollVote() {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const [currentPoll, setCurrentPoll] = useState<Poll | null>(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasVoted, setHasVoted] = useState(false);

  // Form submission data for survey polls
  const [respondentEmail, setRespondentEmail] = useState('');
  const [respondentName, setRespondentName] = useState('');
  const [respondentPhone, setRespondentPhone] = useState('');

  useEffect(() => {
    if (pollId) {
      loadPoll(pollId);
      // Check localStorage first (client-side check)
      const votedPolls = JSON.parse(localStorage.getItem('votedPolls') || '[]');
      if (votedPolls.includes(pollId)) {
        setHasVoted(true);
      }
    }
  }, [pollId]);

  const loadPoll = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/polls/${id}`);
      if (response.ok) {
        const data = await response.json();
        const poll = data.poll || data;
        setCurrentPoll(poll);

        // Check server-side hasVoted status (more reliable than localStorage)
        if (poll.hasVoted) {
          setHasVoted(true);
          // Sync with localStorage
          const votedPolls = JSON.parse(localStorage.getItem('votedPolls') || '[]');
          if (!votedPolls.includes(id)) {
            votedPolls.push(id);
            localStorage.setItem('votedPolls', JSON.stringify(votedPolls));
          }
        }
      } else {
        setError('Poll not found');
      }
    } catch (err) {
      setError('Failed to load poll');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitVote = async () => {
    if (!selectedOption) {
      setError('Please select an option');
      return;
    }

    if (hasVoted) {
      setError('You have already voted on this poll');
      return;
    }

    // Validate form submission fields for survey polls
    if (currentPoll?.pollType === 'survey') {
      if (currentPoll.collectEmail && !respondentEmail) {
        setError('Email is required');
        return;
      }
      if (currentPoll.collectName && !respondentName) {
        setError('Name is required');
        return;
      }
      if (currentPoll.collectPhone && !respondentPhone) {
        setError('Phone number is required');
        return;
      }
      // Basic email validation
      if (currentPoll.collectEmail && respondentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(respondentEmail)) {
        setError('Please enter a valid email address');
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      const voteData: any = {
        selectedOptions: [selectedOption]
      };

      // Add form submission data for survey polls
      if (currentPoll?.pollType === 'survey') {
        voteData.respondentData = {
          email: respondentEmail || null,
          name: respondentName || null,
          phone: respondentPhone || null
        };
      }

      const response = await fetch(`${API_URL}/polls/${currentPoll?.pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voteData)
      });

      if (response.ok) {
        await response.json();
        // Mark poll as voted in localStorage
        const votedPolls = JSON.parse(localStorage.getItem('votedPolls') || '[]');
        votedPolls.push(pollId);
        localStorage.setItem('votedPolls', JSON.stringify(votedPolls));
        setHasVoted(true);
        // Navigate to results page
        navigate(`/p/${pollId}/results`);
      } else {
        // Try to get error message from API response
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to submit vote';

        // If already voted, mark in localStorage to prevent future attempts
        if (errorMessage.includes('already voted')) {
          const votedPolls = JSON.parse(localStorage.getItem('votedPolls') || '[]');
          if (!votedPolls.includes(pollId)) {
            votedPolls.push(pollId);
            localStorage.setItem('votedPolls', JSON.stringify(votedPolls));
          }
          setHasVoted(true);
        }

        setError(errorMessage);
      }
    } catch (err) {
      setError('Failed to submit vote');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !currentPoll) {
    return (
      <div className="App">
        <div className="container">
          <p>Loading poll...</p>
        </div>
      </div>
    );
  }

  if (error && !currentPoll) {
    return (
      <div className="App">
        <div className="container">
          <button className="btn-back" onClick={() => navigate('/')}>← Back</button>
          <div className="error">{error}</div>
        </div>
      </div>
    );
  }

  if (!currentPoll) {
    return null;
  }

  return (
    <div className="App">
      <div className="container">
        <button className="btn-back" onClick={() => navigate('/')}>← Back</button>

        <h1>{currentPoll.title}</h1>

        {hasVoted && (
          <div className="info-message">
            You've already voted on this poll. <button className="link-button" onClick={() => navigate(`/p/${pollId}/results`)}>View results</button>
          </div>
        )}

        <div className="options-list">
          {currentPoll.options?.map((option, index) => (
            <label key={index} className={`option-card ${hasVoted ? 'disabled' : ''}`}>
              <input
                type="radio"
                name="poll-option"
                value={option.id}
                checked={selectedOption === option.id}
                onChange={(e) => setSelectedOption(e.target.value)}
                disabled={hasVoted}
              />
              <span>{option.text}</span>
            </label>
          ))}
        </div>

        {/* Form submission fields for survey polls */}
        {currentPoll.pollType === 'survey' && !hasVoted && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1.5rem',
            background: 'rgba(102, 126, 234, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(102, 126, 234, 0.2)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Your Information</h3>

            {currentPoll.collectEmail && (
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={respondentEmail}
                  onChange={(e) => setRespondentEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem'
                  }}
                />
              </div>
            )}

            {currentPoll.collectName && (
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={respondentName}
                  onChange={(e) => setRespondentName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem'
                  }}
                />
              </div>
            )}

            {currentPoll.collectPhone && (
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={respondentPhone}
                  onChange={(e) => setRespondentPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem'
                  }}
                />
              </div>
            )}

            <small style={{ color: '#666', display: 'block', marginTop: '0.5rem' }}>
              * Required fields. Your response will be sent to the poll creator.
            </small>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        {!hasVoted && (
          <button
            className="btn btn-primary"
            onClick={submitVote}
            disabled={loading || !selectedOption}
          >
            {loading ? 'Submitting...' : 'Submit Vote'}
          </button>
        )}

        <button
          className="btn btn-secondary"
          onClick={() => navigate(`/p/${pollId}/results`)}
          style={{ marginTop: '10px' }}
        >
          View Results
        </button>
      </div>
    </div>
  );
}

// Poll Results Component
function PollResults() {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const [currentPoll, setCurrentPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [creatingShortUrl, setCreatingShortUrl] = useState(false);

  useEffect(() => {
    if (pollId) {
      loadPoll(pollId);
    }
  }, [pollId]);

  const loadPoll = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/polls/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentPoll(data.poll || data);
        // Check if poll already has a short URL
        if (data.poll?.shortLink || data.shortLink) {
          setShortUrl(data.poll?.shortLink || data.shortLink);
        }
      } else {
        setError('Poll not found');
      }
    } catch (err) {
      setError('Failed to load poll');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createShortUrl = async () => {
    if (shortUrl || !pollId) return; // Already have a short URL

    setCreatingShortUrl(true);
    try {
      const pollUrl = `https://polls.snapitsoftware.com/p/${pollId}`;
      const apiUrl = window.SNAPIT_CONFIG?.API_BASE_URL_SNAPITURL || 'https://api.snapiturl.com';

      console.log('Creating short URL for:', pollUrl);
      console.log('Using API:', apiUrl);

      const response = await fetch(`${apiUrl}/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders()
        },
        body: JSON.stringify({
          originalUrl: pollUrl,
          title: currentPoll?.title || 'Poll',
          source: 'polls.snapitsoftware.com'
        })
      });

      console.log('Short URL API Response Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Short URL API Response Data:', data);

        // Construct the short URL from the response
        let createdShortUrl = '';
        if (data.shortUrl) {
          createdShortUrl = data.shortUrl;
        } else if (data.shortCode) {
          createdShortUrl = `https://snapiturl.com/${data.shortCode}`;
        } else if (data.code) {
          createdShortUrl = `https://snapiturl.com/${data.code}`;
        } else if (data.link) {
          createdShortUrl = data.link;
        } else {
          throw new Error('Invalid API response - no short URL found');
        }

        console.log('Created short URL:', createdShortUrl);
        setShortUrl(createdShortUrl);

        // Update the poll with the short URL
        try {
          await fetch(`${API_URL}/polls/${pollId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...authService.getAuthHeaders()
            },
            body: JSON.stringify({
              shortLink: createdShortUrl
            })
          });
        } catch (err) {
          console.error('Failed to save short URL to poll:', err);
        }
      } else {
        const errorText = await response.text();
        console.error('Short URL API Error:', errorText);
        throw new Error(`Failed to create short URL: ${response.status}`);
      }
    } catch (err) {
      console.error('Error creating short URL:', err);
      alert('Failed to create short URL. Please try again or use the full poll URL.');
    } finally {
      setCreatingShortUrl(false);
    }
  };

  const getPercentage = (votes: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  if (loading && !currentPoll) {
    return (
      <div className="App">
        <div className="container">
          <p>Loading results...</p>
        </div>
      </div>
    );
  }

  if (error && !currentPoll) {
    return (
      <div className="App">
        <div className="container">
          <button className="btn-back" onClick={() => navigate('/')}>← Back</button>
          <div className="error">{error}</div>
        </div>
      </div>
    );
  }

  if (!currentPoll) {
    return null;
  }

  return (
    <div className="App">
      <div className="container">
        <button className="btn-back" onClick={() => navigate('/')}>← Back</button>

        <h1>{currentPoll.title}</h1>
        <p className="total-votes">{currentPoll.totalVotes} total votes</p>

        <div className="results-list">
          {currentPoll.options?.map((option, index) => {
            const voteCount = option.votes;
            const percentage = getPercentage(voteCount, currentPoll.totalVotes);

            return (
              <div key={index} className="result-item">
                <div className="result-header">
                  <span className="result-option">{option.text}</span>
                  <span className="result-stats">
                    {voteCount} votes ({percentage}%)
                  </span>
                </div>
                <div className="result-bar">
                  <div
                    className="result-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Share & Generate Links Section */}
        <div className="share-section" style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'rgba(102, 126, 234, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(102, 126, 234, 0.2)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>📤 Share This Poll</h3>

          <div className="share-url" style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}>
            <input
              type="text"
              value={`https://polls.snapitsoftware.com/p/${pollId}`}
              readOnly
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #ddd',
                minWidth: '200px'
              }}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              className="btn btn-secondary"
              onClick={() => {
                navigator.clipboard.writeText(`https://polls.snapitsoftware.com/p/${pollId}`);
                alert('Poll URL copied!');
              }}
            >
              📋 Copy Link
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginTop: '1rem'
          }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                const pollUrl = `https://polls.snapitsoftware.com/p/${pollId}`;
                window.open(`https://snapitqr.com?url=${encodeURIComponent(pollUrl)}&title=${encodeURIComponent(currentPoll.title)}`, '_blank');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              📱 Generate QR Code
            </button>

            <button
              className="btn btn-primary"
              onClick={createShortUrl}
              disabled={creatingShortUrl || !!shortUrl}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {creatingShortUrl ? '⏳ Creating...' : shortUrl ? '✅ Short URL Created' : '🔗 Create Short URL'}
            </button>

            {shortUrl && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'rgba(40, 167, 69, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(40, 167, 69, 0.3)'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#28a745' }}>✓ Short URL Created!</div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={shortUrl}
                    readOnly
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      fontSize: '0.9rem'
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(shortUrl);
                      alert('Short URL copied!');
                    }}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            <button
              className="btn btn-secondary"
              onClick={() => {
                const pollUrl = `https://polls.snapitsoftware.com/p/${pollId}`;
                const text = `Vote on my poll: ${currentPoll.title}`;
                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pollUrl)}`;
                window.open(twitterUrl, '_blank');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                width: 'auto'
              }}
            >
              🐦 Share on Twitter
            </button>
          </div>

          <p style={{
            marginTop: '1rem',
            marginBottom: 0,
            fontSize: '0.85rem',
            color: '#666',
            textAlign: 'center'
          }}>
            💡 Tip: Generate a QR code to print on posters or create a short URL for easy sharing!
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => loadPoll(pollId!)}
          style={{ marginTop: '1rem' }}
        >
          Refresh Results
        </button>
      </div>
    </div>
  );
}

// Discover Public Polls Component
function DiscoverPolls() {
  const navigate = useNavigate();
  const [publicPolls, setPublicPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPublicPolls();
  }, []);

  const loadPublicPolls = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/polls?visibility=public&limit=100`);
      if (response.ok) {
        const data = await response.json();
        // Sort by totalVotes descending
        const sortedPolls = (data.polls || []).sort((a: Poll, b: Poll) => b.totalVotes - a.totalVotes);
        setPublicPolls(sortedPolls);
      } else {
        setError('Failed to load public polls');
      }
    } catch (err) {
      setError('Failed to load public polls');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="container discover-container">
        <button className="btn-back" onClick={() => navigate('/')}>← Back</button>

        <h1>Discover Public Polls</h1>
        <p className="subtitle">Top 100 most popular polls</p>

        {loading && <p>Loading polls...</p>}
        {error && <div className="error">{error}</div>}

        {!loading && publicPolls.length === 0 && (
          <p className="no-polls">No public polls yet. Be the first to create one!</p>
        )}

        <div className="polls-list">
          {publicPolls.map((poll, index) => (
            <div
              key={poll.pollId}
              className="poll-card"
              onClick={() => navigate(`/p/${poll.pollId}`)}
            >
              <div className="poll-rank">#{index + 1}</div>
              <div className="poll-info">
                <h3>{poll.title}</h3>
                <div className="poll-stats">
                  <span>{poll.totalVotes} votes</span>
                  <span>•</span>
                  <span>{poll.optionCount || 0} options</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Account Component
function Account() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getUser();
    setUser(currentUser);

    if (!currentUser) {
      navigate('/');
      return;
    }

    loadSubscription();
  }, [navigate]);

  const loadSubscription = async () => {
    try {
      const response = await fetch(`${API_URL}/billing/subscription`, {
        headers: authService.getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="App">
      <div className="container" style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <h1>My Account</h1>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Profile Information</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            {user.picture && (
              <img
                src={user.picture}
                alt={user.name}
                style={{ width: '60px', height: '60px', borderRadius: '50%' }}
              />
            )}
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{user.name}</div>
              <div style={{ color: '#666' }}>{user.email}</div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Subscription</h2>
          {loading ? (
            <p>Loading subscription information...</p>
          ) : subscription ? (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Current Plan:</strong> {subscription.plan || 'Free'}
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Status:</strong> {subscription.status || 'Active'}
              </div>
              {subscription.nextBillingDate && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Next Billing:</strong> {new Date(subscription.nextBillingDate).toLocaleDateString()}
                </div>
              )}
              <button
                className="btn btn-primary"
                onClick={() => navigate('/pricing')}
                style={{ marginTop: '1rem' }}
              >
                Upgrade Plan
              </button>
            </div>
          ) : (
            <div>
              <p>You are currently on the <strong>Free Plan</strong></p>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/pricing')}
                style={{ marginTop: '1rem' }}
              >
                View Plans
              </button>
            </div>
          )}
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Usage Across SnapIT Apps</h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Your subscription unlocks features across all SnapIT applications:
          </p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
              <strong>SnapIT QR:</strong> Create dynamic QR codes
            </li>
            <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
              <strong>SnapIT URL:</strong> Shorten and track URLs
            </li>
            <li style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
              <strong>SnapIT Forms:</strong> Collect form submissions
            </li>
            <li style={{ padding: '0.5rem 0' }}>
              <strong>SnapIT Polls:</strong> Create polls and surveys
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Main App Component with Routes
function App() {
  return (
    <div className="app-root">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreatePoll />} />
        <Route path="/discover" element={<DiscoverPolls />} />
        <Route path="/p/:pollId" element={<PollVote />} />
        <Route path="/p/:pollId/results" element={<PollResults />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/account" element={<Account />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;
