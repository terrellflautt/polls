const { DynamoDB, SES } = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamodb = new DynamoDB.DocumentClient();
const ses = new SES({ region: 'us-east-1' });

const POLLS_TABLE = process.env.POLLS_TABLE;
const VOTES_TABLE = process.env.VOTES_TABLE;

/**
 * Cast a vote on a poll
 * POST /polls/{pollId}/vote
 * Requires authentication
 */
exports.cast = async (event) => {
  try {
    // Support both authenticated and anonymous users
    const userId = event.requestContext.authorizer?.userId || `anon-${require('uuid').v4()}`;
    const email = event.requestContext.authorizer?.email || null;
    const { pollId } = event.pathParameters;
    const body = JSON.parse(event.body);

    // Validate request
    const { selectedOptions } = body;
    if (!selectedOptions || !Array.isArray(selectedOptions) || selectedOptions.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'Invalid vote data. selectedOptions array required.'
        })
      };
    }

    // Get the poll
    const pollResult = await dynamodb.get({
      TableName: POLLS_TABLE,
      Key: { pollId }
    }).promise();

    if (!pollResult.Item) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Poll not found' })
      };
    }

    const poll = pollResult.Item;

    // Check if poll is expired
    if (poll.expiresAt && poll.expiresAt < Date.now()) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'This poll has expired' })
      };
    }

    // Validate multiple choice setting
    if (!poll.allowMultipleChoice && selectedOptions.length > 1) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'This poll only allows selecting one option'
        })
      };
    }

    // Validate that selected options exist in the poll
    const validOptionIds = poll.options.map(opt => opt.id);
    const invalidOptions = selectedOptions.filter(opt => !validOptionIds.includes(opt));
    if (invalidOptions.length > 0) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: `Invalid option(s): ${invalidOptions.join(', ')}`
        })
      };
    }

    // Check if user has already voted (using UserPollIndex)
    const existingVote = await dynamodb.query({
      TableName: VOTES_TABLE,
      IndexName: 'UserPollIndex',
      KeyConditionExpression: 'userId = :userId AND pollId = :pollId',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':pollId': pollId
      },
      Limit: 1
    }).promise();

    let previousVote = null;
    if (existingVote.Items && existingVote.Items.length > 0) {
      previousVote = existingVote.Items[0];

      // For now, prevent duplicate votes
      // TODO: Add allowRevote setting to polls
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'You have already voted on this poll',
          existingVote: {
            votedAt: new Date(previousVote.votedAt).toISOString(),
            selectedOptions: previousVote.selectedOptions
          }
        })
      };
    }

    // Create the vote record
    const voteId = uuidv4();
    const timestamp = Date.now();

    // Extract respondent data for survey polls
    const respondentData = body.respondentData || {};

    const vote = {
      voteId,
      pollId,
      userId,
      voterEmail: email,
      selectedOptions,
      votedAt: timestamp,
      voterIp: event.requestContext.identity?.sourceIp || 'unknown',
      userAgent: event.requestContext.identity?.userAgent || 'unknown',
      // Add respondent data for survey polls
      respondentEmail: respondentData.email || null,
      respondentName: respondentData.name || null,
      respondentPhone: respondentData.phone || null
    };

    // Use a transaction to ensure atomicity
    // 1. Create vote record
    // 2. Update poll totalVotes and option votes

    // Build update expression for poll
    let updateExpression = 'SET totalVotes = totalVotes + :inc';
    const expressionAttributeValues = {
      ':inc': 1
    };

    // Update each selected option's vote count
    selectedOptions.forEach((optionId, index) => {
      const optionIndex = poll.options.findIndex(opt => opt.id === optionId);
      if (optionIndex !== -1) {
        updateExpression += `, options[${optionIndex}].votes = options[${optionIndex}].votes + :inc`;
      }
    });

    // Execute transaction
    await dynamodb.transactWrite({
      TransactItems: [
        {
          Put: {
            TableName: VOTES_TABLE,
            Item: vote,
            ConditionExpression: 'attribute_not_exists(voteId)'
          }
        },
        {
          Update: {
            TableName: POLLS_TABLE,
            Key: { pollId },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionAttributeValues
          }
        }
      ]
    }).promise();

    // Get updated poll data
    const updatedPollResult = await dynamodb.get({
      TableName: POLLS_TABLE,
      Key: { pollId }
    }).promise();

    const updatedPoll = updatedPollResult.Item;

    // Send email notification for survey and form-submission polls
    if ((poll.pollType === 'survey' || poll.pollType === 'form-submission') && poll.creatorEmail) {
      try {
        await sendSubmissionNotificationEmail(poll, vote, selectedOptions);
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the vote if email fails
      }
    }

    // Calculate updated results
    const updatedResults = {};
    updatedPoll.options.forEach(opt => {
      updatedResults[opt.id] = {
        votes: opt.votes,
        percentage: updatedPoll.totalVotes > 0
          ? Math.round((opt.votes / updatedPoll.totalVotes) * 100 * 10) / 10
          : 0
      };
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        voteId,
        votedAt: new Date(timestamp).toISOString(),
        updatedResults,
        totalVotes: updatedPoll.totalVotes,
        message: 'Vote recorded successfully'
      })
    };
  } catch (error) {
    console.error('Cast vote error:', error);

    // Handle duplicate vote transaction conflicts
    if (error.code === 'TransactionCanceledException') {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'Vote could not be recorded. Please try again.'
        })
      };
    }

    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to record vote' })
    };
  }
};

/**
 * Send email notification for survey or form submission response
 */
async function sendSubmissionNotificationEmail(poll, vote, selectedOptions) {
  const selectedOptionTexts = selectedOptions.map(optId => {
    const option = poll.options.find(opt => opt.id === optId);
    return option ? option.text : optId;
  });

  const respondentInfo = [];
  if (vote.respondentEmail) respondentInfo.push(`Email: ${vote.respondentEmail}`);
  if (vote.respondentName) respondentInfo.push(`Name: ${vote.respondentName}`);
  if (vote.respondentPhone) respondentInfo.push(`Phone: ${vote.respondentPhone}`);

  // Determine the type of notification
  const notificationType = poll.pollType === 'form-submission' ? 'Form Submission' : 'Survey Response';

  const emailBody = `
New ${notificationType} for: ${poll.title}

Poll Question: ${poll.title}

Selected Answer(s):
${selectedOptionTexts.map(text => `- ${text}`).join('\n')}

Respondent Information:
${respondentInfo.length > 0 ? respondentInfo.join('\n') : 'No information collected'}

Submitted at: ${new Date(vote.votedAt).toLocaleString()}

View full results: https://polls.snapitsoftware.com/p/${poll.pollId}

---
SnapIT Polls
https://polls.snapitsoftware.com
  `.trim();

  const params = {
    Source: 'noreply@snapitsoftware.com',
    Destination: {
      ToAddresses: [poll.creatorEmail]
    },
    Message: {
      Subject: {
        Data: `New ${notificationType}: ${poll.title}`
      },
      Body: {
        Text: {
          Data: emailBody
        }
      }
    }
  };

  return ses.sendEmail(params).promise();
}

/**
 * Get poll results
 * GET /polls/{pollId}/results
 * Public endpoint
 */
exports.results = async (event) => {
  try {
    const { pollId } = event.pathParameters;

    // Get the poll
    let poll;

    // Try to get by pollId first
    const result = await dynamodb.get({
      TableName: POLLS_TABLE,
      Key: { pollId }
    }).promise();

    if (result.Item) {
      poll = result.Item;
    } else {
      // Try to find by shortLink
      const scanResult = await dynamodb.scan({
        TableName: POLLS_TABLE,
        FilterExpression: 'shortLink = :shortLink',
        ExpressionAttributeValues: {
          ':shortLink': pollId
        },
        Limit: 1
      }).promise();

      if (scanResult.Items && scanResult.Items.length > 0) {
        poll = scanResult.Items[0];
      }
    }

    if (!poll) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Poll not found' })
      };
    }

    // Check if poll is expired
    const isExpired = poll.expiresAt && poll.expiresAt < Date.now();

    // Calculate results with percentages
    const results = poll.options.map(opt => ({
      id: opt.id,
      text: opt.text,
      votes: opt.votes,
      percentage: poll.totalVotes > 0
        ? Math.round((opt.votes / poll.totalVotes) * 100 * 10) / 10
        : 0
    }));

    // Sort by votes (highest first)
    results.sort((a, b) => b.votes - a.votes);

    // Get vote count by time (Pro feature - basic implementation)
    // For free tier, just return current snapshot
    const timeSeriesData = [];

    // Optional: Get all votes for this poll for time-series analysis (Pro feature)
    // For now, we'll skip this for performance

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        pollId: poll.pollId,
        title: poll.title,
        description: poll.description,
        results,
        totalVotes: poll.totalVotes,
        isExpired,
        createdAt: new Date(poll.createdAt).toISOString(),
        expiresAt: poll.expiresAt ? new Date(poll.expiresAt).toISOString() : null,
        timeSeriesData, // Empty for free tier
        allowMultipleChoice: poll.allowMultipleChoice
      })
    };
  } catch (error) {
    console.error('Get results error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to get results' })
    };
  }
};

/**
 * Get detailed analytics for a poll (Pro feature)
 * GET /polls/{pollId}/analytics
 * Requires authentication and Pro tier
 */
exports.analytics = async (event) => {
  try {
    const userId = event.requestContext.authorizer.userId;
    const { pollId } = event.pathParameters;

    // Get the poll and verify ownership
    const pollResult = await dynamodb.get({
      TableName: POLLS_TABLE,
      Key: { pollId }
    }).promise();

    if (!pollResult.Item) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Poll not found' })
      };
    }

    const poll = pollResult.Item;

    // Verify ownership
    if (poll.creatorUserId !== userId) {
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'You can only view analytics for your own polls' })
      };
    }

    // TODO: Check if user has Pro tier
    // For now, return basic analytics

    // Get all votes for this poll
    const votesResult = await dynamodb.query({
      TableName: VOTES_TABLE,
      IndexName: 'PollIndex',
      KeyConditionExpression: 'pollId = :pollId',
      ExpressionAttributeValues: {
        ':pollId': pollId
      }
    }).promise();

    const votes = votesResult.Items || [];

    // Build time-series data (votes over time)
    const timeSeriesData = votes.map(vote => ({
      timestamp: new Date(vote.votedAt).toISOString(),
      selectedOptions: vote.selectedOptions
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Build demographics data (basic)
    const voterEmails = votes.map(v => v.voterEmail);
    const uniqueVoters = new Set(voterEmails).size;

    // IP-based location data (would require GeoIP lookup - placeholder)
    const locationData = {
      countries: {},
      cities: {}
    };

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        pollId: poll.pollId,
        title: poll.title,
        totalVotes: poll.totalVotes,
        uniqueVoters,
        timeSeriesData,
        locationData,
        createdAt: new Date(poll.createdAt).toISOString()
      })
    };
  } catch (error) {
    console.error('Get analytics error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to get analytics' })
    };
  }
};
