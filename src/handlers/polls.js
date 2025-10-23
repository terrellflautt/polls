const { DynamoDB } = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamodb = new DynamoDB.DocumentClient();

const POLLS_TABLE = process.env.POLLS_TABLE;
const VOTES_TABLE = process.env.VOTES_TABLE;

/**
 * Create a new poll
 * POST /polls
 * Requires authentication
 */
exports.create = async (event) => {
  try {
    // Support both authenticated and anonymous users
    const userId = event.requestContext.authorizer?.userId || `anon-${uuidv4()}`;
    const email = event.requestContext.authorizer?.email || null;

    // Parse body with error handling
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': 'false' },
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    // Validate required fields
    // Support both 'title' and 'question' for backwards compatibility
    const title = body.title || body.question;
    const { options } = body;

    console.log('Creating poll:', { title, question: body.question, bodyTitle: body.title, optionsCount: options?.length, userId });

    if (!title || !options || !Array.isArray(options) || options.length < 2) {
      console.error('Validation failed:', { title: !!title, bodyTitle: !!body.title, bodyQuestion: !!body.question, options: !!options, isArray: Array.isArray(options), length: options?.length });
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': 'false' },
        body: JSON.stringify({
          error: 'Invalid poll data. Question/title and at least 2 options required.'
        })
      };
    }

    // Validate options count (max 10 for free, 50 for pro)
    if (options.length > 10) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': 'false' },
        body: JSON.stringify({
          error: 'Free tier allows maximum 10 options. Upgrade to Pro for up to 50 options.'
        })
      };
    }

    // Validate title length
    if (title.length < 3 || title.length > 200) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': 'false' },
        body: JSON.stringify({
          error: 'Title must be between 3 and 200 characters.'
        })
      };
    }

    // Validate each option with better error handling
    let validatedOptions;
    try {
      validatedOptions = options.map((opt, index) => {
        const optionText = typeof opt === 'string' ? opt : (opt?.text || '');

        if (!optionText || optionText.trim().length < 1) {
          throw new Error(`Option ${index + 1} cannot be empty`);
        }

        if (optionText.length > 100) {
          throw new Error(`Option ${index + 1} must be 100 characters or less`);
        }

        return {
          id: `opt${index + 1}`,
          text: optionText.trim(),
          votes: 0
        };
      });
    } catch (validationError) {
      console.error('Option validation error:', validationError.message);
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': 'false' },
        body: JSON.stringify({
          error: validationError.message
        })
      };
    }

    const pollId = uuidv4();
    const timestamp = Date.now();

    // Generate short link (8 character alphanumeric)
    const shortLink = pollId.substring(0, 8).replace(/-/g, '');

    // Calculate expiration if expiresIn is provided (in seconds)
    let expiresAt = null;
    if (body.expiresIn && typeof body.expiresIn === 'number' && body.expiresIn > 0) {
      expiresAt = Math.floor(timestamp / 1000) + body.expiresIn; // DynamoDB TTL uses seconds
    }

    // Extract new fields for poll types and form submission
    const pollType = body.pollType || 'simple'; // 'simple' or 'survey'
    const visibility = body.visibility || 'private'; // 'public' or 'private'
    const collectEmail = body.collectEmail === true;
    const collectName = body.collectName === true;
    const collectPhone = body.collectPhone === true;

    const poll = {
      pollId,
      creatorUserId: userId,
      creatorEmail: email,
      title: title.trim(),
      description: body.description?.trim() || '',
      options: validatedOptions,
      allowMultipleChoice: body.allowMultipleChoice === true,
      requireAuth: body.requireAuth !== false, // Default to true
      allowAnonymous: false, // Pro feature
      expiresAt,
      createdAt: timestamp,
      totalVotes: 0,
      isPublic: visibility === 'public',
      visibility: visibility,
      shortLink,
      embedEnabled: true,
      tier: 'free', // TODO: Get from user record
      branding: null,
      // New fields for poll types
      pollType: pollType,
      collectEmail: pollType === 'survey' ? collectEmail : false,
      collectName: pollType === 'survey' ? collectName : false,
      collectPhone: pollType === 'survey' ? collectPhone : false
    };

    console.log('Saving poll to DynamoDB:', pollId);

    await dynamodb.put({
      TableName: POLLS_TABLE,
      Item: poll
    }).promise();

    console.log('Poll created successfully:', pollId);

    // Return poll with share URLs
    const baseUrl = 'https://polls.snapitsoftware.com'; // TODO: Get from environment
    const shareUrl = `${baseUrl}/p/${shortLink}`;
    const embedCode = `<iframe src="${baseUrl}/embed/${shortLink}" width="100%" height="400" frameborder="0"></iframe>`;

    return {
      statusCode: 201,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': 'false' },
      body: JSON.stringify({
        pollId,
        shareUrl,
        embedCode,
        shortLink,
        createdAt: new Date(timestamp).toISOString(),
        poll
      })
    };
  } catch (error) {
    console.error('Create poll error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': 'false' },
      body: JSON.stringify({ error: error.message || 'Failed to create poll' })
    };
  }
};

/**
 * Get poll by ID
 * GET /polls/{pollId}
 * Public endpoint
 */
exports.get = async (event) => {
  try {
    const { pollId } = event.pathParameters;

    // Support both full UUID and short link
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

    // Calculate percentages for options
    const optionsWithPercentages = poll.options.map(opt => ({
      ...opt,
      percentage: poll.totalVotes > 0
        ? Math.round((opt.votes / poll.totalVotes) * 100 * 10) / 10
        : 0
    }));

    // Check if current user has voted (if authenticated)
    let hasVoted = false;
    if (event.requestContext.authorizer?.userId) {
      const userId = event.requestContext.authorizer.userId;

      const voteCheck = await dynamodb.query({
        TableName: VOTES_TABLE,
        IndexName: 'UserPollIndex',
        KeyConditionExpression: 'userId = :userId AND pollId = :pollId',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':pollId': poll.pollId
        },
        Limit: 1
      }).promise();

      hasVoted = voteCheck.Items && voteCheck.Items.length > 0;
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        pollId: poll.pollId,
        title: poll.title,
        description: poll.description,
        options: optionsWithPercentages,
        totalVotes: poll.totalVotes,
        allowMultipleChoice: poll.allowMultipleChoice,
        requireAuth: poll.requireAuth,
        hasVoted,
        expiresAt: poll.expiresAt ? new Date(poll.expiresAt).toISOString() : null,
        isExpired,
        createdAt: new Date(poll.createdAt).toISOString(),
        shortLink: poll.shortLink,
        branding: poll.branding,
        visibility: poll.visibility || (poll.isPublic ? 'public' : 'private'),
        pollType: poll.pollType || 'simple',
        collectEmail: poll.collectEmail || false,
        collectName: poll.collectName || false,
        collectPhone: poll.collectPhone || false
      })
    };
  } catch (error) {
    console.error('Get poll error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to get poll' })
    };
  }
};

/**
 * List polls - public or user polls
 * GET /polls
 * Optional authentication
 */
exports.list = async (event) => {
  try {
    const visibility = event.queryStringParameters?.visibility;
    const limit = parseInt(event.queryStringParameters?.limit || '50');

    // If visibility=public, return public polls (no auth required)
    if (visibility === 'public') {
      const result = await dynamodb.scan({
        TableName: POLLS_TABLE,
        FilterExpression: 'isPublic = :isPublic OR visibility = :visibility',
        ExpressionAttributeValues: {
          ':isPublic': true,
          ':visibility': 'public'
        },
        Limit: limit
      }).promise();

      // Add computed fields to each poll
      const polls = result.Items.map(poll => {
        const isExpired = poll.expiresAt && poll.expiresAt < Date.now();
        return {
          pollId: poll.pollId,
          title: poll.title,
          description: poll.description,
          totalVotes: poll.totalVotes,
          optionCount: poll.options.length,
          createdAt: new Date(poll.createdAt).toISOString(),
          expiresAt: poll.expiresAt ? new Date(poll.expiresAt).toISOString() : null,
          isExpired,
          shortLink: poll.shortLink,
          allowMultipleChoice: poll.allowMultipleChoice,
          requireAuth: poll.requireAuth
        };
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          polls,
          count: polls.length
        })
      };
    }

    // For private/user polls, require authentication
    const userId = event.requestContext.authorizer?.userId;
    if (!userId) {
      return {
        statusCode: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    const result = await dynamodb.query({
      TableName: POLLS_TABLE,
      IndexName: 'CreatorIndex',
      KeyConditionExpression: 'creatorUserId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit
    }).promise();

    // Add computed fields to each poll
    const polls = result.Items.map(poll => {
      const isExpired = poll.expiresAt && poll.expiresAt < Date.now();
      return {
        pollId: poll.pollId,
        title: poll.title,
        description: poll.description,
        totalVotes: poll.totalVotes,
        optionCount: poll.options.length,
        createdAt: new Date(poll.createdAt).toISOString(),
        expiresAt: poll.expiresAt ? new Date(poll.expiresAt).toISOString() : null,
        isExpired,
        shortLink: poll.shortLink,
        allowMultipleChoice: poll.allowMultipleChoice,
        requireAuth: poll.requireAuth
      };
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        polls,
        count: polls.length
      })
    };
  } catch (error) {
    console.error('List polls error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to list polls' })
    };
  }
};

/**
 * Delete a poll
 * DELETE /polls/{pollId}
 * Requires authentication and ownership
 */
exports.delete = async (event) => {
  try {
    const userId = event.requestContext.authorizer.userId;
    const { pollId } = event.pathParameters;

    // Get the poll first to verify ownership
    const result = await dynamodb.get({
      TableName: POLLS_TABLE,
      Key: { pollId }
    }).promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Poll not found' })
      };
    }

    // Verify the user is the creator
    if (result.Item.creatorUserId !== userId) {
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'You can only delete your own polls' })
      };
    }

    // Delete the poll
    await dynamodb.delete({
      TableName: POLLS_TABLE,
      Key: { pollId }
    }).promise();

    // TODO: Optionally delete all votes for this poll
    // For now, we'll leave votes in the database for analytics

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        message: 'Poll deleted successfully'
      })
    };
  } catch (error) {
    console.error('Delete poll error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to delete poll' })
    };
  }
};

/**
 * Update a poll (for adding short URL, etc.)
 * PATCH /polls/{pollId}
 * Public endpoint
 */
exports.update = async (event) => {
  try {
    const { pollId } = event.pathParameters;
    const body = JSON.parse(event.body);

    // Get the poll first
    const result = await dynamodb.get({
      TableName: POLLS_TABLE,
      Key: { pollId }
    }).promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Poll not found' })
      };
    }

    // Build update expression based on provided fields
    const updateFields = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    if (body.shortLink) {
      updateFields.push('shortLink = :shortLink');
      expressionAttributeValues[':shortLink'] = body.shortLink;
    }

    if (updateFields.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'No fields to update' })
      };
    }

    const updateExpression = 'SET ' + updateFields.join(', ');

    await dynamodb.update({
      TableName: POLLS_TABLE,
      Key: { pollId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ...(Object.keys(expressionAttributeNames).length > 0 && { ExpressionAttributeNames: expressionAttributeNames })
    }).promise();

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        message: 'Poll updated successfully'
      })
    };
  } catch (error) {
    console.error('Update poll error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to update poll' })
    };
  }
};
