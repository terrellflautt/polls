import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import './App.css';

const API_URL = 'https://7nbqiasg8i.execute-api.us-east-1.amazonaws.com/prod';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  pollId: string;
  title: string;
  options: PollOption[];
  createdAt: number;
  expiresAt?: number | null;
  totalVotes: number;
  shortLink?: string;
}

interface CreatePollResponse {
  pollId: string;
  shareUrl: string;
  embedCode: string;
  shortLink: string;
  createdAt: string;
  poll: Poll;
}

// Home Component
function Home() {
  const navigate = useNavigate();
  const [pollId, setPollId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          options: validOptions,
          expiresInHours
        })
      });

      if (response.ok) {
        const data: CreatePollResponse = await response.json();
        // Navigate to results page with the short link
        navigate(`/p/${data.shortLink}/results`, {
          state: { shareUrl: data.shareUrl }
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

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/polls/${currentPoll?.pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId: selectedOption })
      });

      if (response.ok) {
        await response.json();
        // Navigate to results page
        navigate(`/p/${pollId}/results`);
      } else {
        setError('Failed to submit vote');
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

        <div className="options-list">
          {currentPoll.options?.map((option, index) => (
            <label key={index} className="option-card">
              <input
                type="radio"
                name="poll-option"
                value={option.id}
                checked={selectedOption === option.id}
                onChange={(e) => setSelectedOption(e.target.value)}
              />
              <span>{option.text}</span>
            </label>
          ))}
        </div>

        {error && <div className="error">{error}</div>}

        <button
          className="btn btn-primary"
          onClick={submitVote}
          disabled={loading || !selectedOption}
        >
          {loading ? 'Submitting...' : 'Submit Vote'}
        </button>

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
  const [shareLink, setShareLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (pollId) {
      loadPoll(pollId);
      // Set the share link based on current URL
      setShareLink(`${window.location.origin}/p/${pollId}`);
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    alert('Link copied to clipboard!');
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

        {shareLink && (
          <div className="share-section">
            <p>Share this poll:</p>
            <div className="share-link">
              <input type="text" value={shareLink} readOnly />
              <button className="btn btn-secondary" onClick={copyToClipboard}>
                Copy
              </button>
            </div>
          </div>
        )}

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

        <button
          className="btn btn-secondary"
          onClick={() => loadPoll(pollId!)}
        >
          Refresh Results
        </button>
      </div>
    </div>
  );
}

// Main App Component with Routes
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreatePoll />} />
      <Route path="/p/:pollId" element={<PollVote />} />
      <Route path="/p/:pollId/results" element={<PollResults />} />
    </Routes>
  );
}

export default App;
