const jwt = require('jsonwebtoken');
const { DynamoDB } = require('aws-sdk');
const { OAuth2Client } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new DynamoDB.DocumentClient();
const JWT_SECRET = process.env.JWT_SECRET;
const USERS_TABLE = process.env.USERS_TABLE;
const GOOGLE_CLIENT_ID = '242648112266-pkub2fo21h5o9edm19921ul6hed20tb4.apps.googleusercontent.com';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Shared authorizer with forum - validates JWT tokens
exports.authorizer = async (event) => {
  try {
    const token = event.authorizationToken.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);

    return {
      principalId: decoded.userId,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn.split('/').slice(0, 2).join('/') + '/*'
          }
        ]
      },
      context: {
        userId: decoded.userId,
        email: decoded.email
      }
    };
  } catch (error) {
    console.error('Authorization failed:', error);
    throw new Error('Unauthorized');
  }
};

/**
 * Google OAuth sign-in
 * POST /auth/google
 * Verifies Google token and creates/updates user
 */
exports.googleAuth = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { credential } = body;

    if (!credential) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': 'false' },
        body: JSON.stringify({ error: 'Google credential required' })
      };
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const googleId = payload['sub'];
    const email = payload['email'];
    const name = payload['name'];
    const picture = payload['picture'];

    // Check if user exists
    let user;
    const existingUserResult = await dynamodb.scan({
      TableName: USERS_TABLE,
      FilterExpression: 'googleId = :googleId OR email = :email',
      ExpressionAttributeValues: {
        ':googleId': googleId,
        ':email': email
      },
      Limit: 1
    }).promise();

    if (existingUserResult.Items && existingUserResult.Items.length > 0) {
      // User exists, update last login
      user = existingUserResult.Items[0];

      await dynamodb.update({
        TableName: USERS_TABLE,
        Key: { userId: user.userId },
        UpdateExpression: 'SET lastLoginAt = :now, profilePicture = :picture, #name = :name',
        ExpressionAttributeNames: {
          '#name': 'name'
        },
        ExpressionAttributeValues: {
          ':now': Date.now(),
          ':picture': picture,
          ':name': name
        }
      }).promise();
    } else {
      // Create new user
      const userId = uuidv4();
      user = {
        userId,
        googleId,
        email,
        name,
        profilePicture: picture,
        plan: 'free',
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
        usageLimits: {
          dynamicQRs: { used: 0, limit: 1 },
          shortURLs: { used: 0, limit: 3 },
          polls: { used: 0, limit: -1 } // Unlimited for all tiers
        }
      };

      await dynamodb.put({
        TableName: USERS_TABLE,
        Item: user
      }).promise();
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        plan: user.plan
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': 'false' },
      body: JSON.stringify({
        token,
        user: {
          userId: user.userId,
          email: user.email,
          name: user.name,
          picture: user.profilePicture,
          plan: user.plan
        }
      })
    };
  } catch (error) {
    console.error('Google auth error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': 'false' },
      body: JSON.stringify({ error: 'Authentication failed' })
    };
  }
};
