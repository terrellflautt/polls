import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'https://7nbqiasg8i.execute-api.us-east-1.amazonaws.com/prod';

interface Poll {
  pollId: string;
  question: string;
  options: string[];
  createdAt: number;
  expiresAt?: number;
  totalVotes: number;
  votes?: { [option: string]: number };
}

interface VoteData {
  pollId: string;
  votes: { [option: string]: number };
  totalVotes: number;
}

function App() {
  const [view, setView] = useState<'home' | 'create' | 'poll' | 'results'>('home');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [currentPoll, setCurrentPoll] = useState<Poll | null>(null);
  const [pollId, setPollId] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasVoted, setHasVoted] = useState(false);

  // Check if poll ID in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      setPollId(id);
      loadPoll(id);
    }
  }, []);

  const loadPoll = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/polls/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentPoll(data);
        setView('poll');
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
        const data = await response.json();
        const link = `${window.location.origin}?id=${data.pollId}`;
        setShareLink(link);
        setCurrentPoll(data);
        setView('results');
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
        body: JSON.stringify({ option: selectedOption })
      });

      if (response.ok) {
        const data: VoteData = await response.json();
        setCurrentPoll(prev => prev ? {
          ...prev,
          votes: data.votes,
          totalVotes: data.totalVotes
        } : null);
        setHasVoted(true);
        setView('results');
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    alert('Link copied to clipboard!');
  };

  const getPercentage = (votes: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  // Home View
  if (view === 'home') {
    return (
      <div className="App">
        <div className="container">
          <h1>SnapIT Polls</h1>
          <p className="subtitle">Create anonymous polls and gather instant feedback</p>

          <div className="button-group">
            <button className="btn btn-primary" onClick={() => setView('create')}>
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
              <button className="btn btn-secondary" onClick={() => loadPoll(pollId)}>
                View Poll
              </button>
            </div>
          </div>

          {error && <div className="error">{error}</div>}
        </div>
      </div>
    );
  }

  // Create Poll View
  if (view === 'create') {
    return (
      <div className="App">
        <div className="container">
          <button className="btn-back" onClick={() => setView('home')}>← Back</button>

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

  // Poll Voting View
  if (view === 'poll' && currentPoll && !hasVoted) {
    return (
      <div className="App">
        <div className="container">
          <button className="btn-back" onClick={() => setView('home')}>← Back</button>

          <h1>{currentPoll.question}</h1>

          <div className="options-list">
            {currentPoll.options.map((option, index) => (
              <label key={index} className="option-card">
                <input
                  type="radio"
                  name="poll-option"
                  value={option}
                  checked={selectedOption === option}
                  onChange={(e) => setSelectedOption(e.target.value)}
                />
                <span>{option}</span>
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
        </div>
      </div>
    );
  }

  // Results View
  if (view === 'results' && currentPoll) {
    const votes = currentPoll.votes || {};

    return (
      <div className="App">
        <div className="container">
          <button className="btn-back" onClick={() => setView('home')}>← Back</button>

          <h1>{currentPoll.question}</h1>
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
            {currentPoll.options.map((option, index) => {
              const voteCount = votes[option] || 0;
              const percentage = getPercentage(voteCount, currentPoll.totalVotes);

              return (
                <div key={index} className="result-item">
                  <div className="result-header">
                    <span className="result-option">{option}</span>
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
            onClick={() => loadPoll(currentPoll.pollId)}
          >
            Refresh Results
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="container">
        {loading && <p>Loading...</p>}
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}

export default App;
