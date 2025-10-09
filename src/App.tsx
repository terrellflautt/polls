import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import './App.css';
import { Footer } from './components/Footer';

const API_URL = 'https://polls-api.snapitsoftware.com';

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
  visibility?: 'public' | 'private'; // Optional for backward compatibility
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
                      <span>{poll.options.length} options</span>
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
          expiresInHours,
          visibility: visibility
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

  useEffect(() => {
    if (pollId) {
      loadPoll(pollId);
      // Check if user has already voted
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

    if (hasVoted) {
      setError('You have already voted on this poll');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/polls/${currentPoll?.pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedOptions: [selectedOption] })
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
                  <span>{poll.options.length} options</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Main App Component with Routes
function App() {
  return (
    <div className="app-root">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreatePoll />} />
        <Route path="/discover" element={<DiscoverPolls />} />
        <Route path="/p/:pollId" element={<PollVote />} />
        <Route path="/p/:pollId/results" element={<PollResults />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;
