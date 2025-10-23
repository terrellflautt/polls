# Polls - Anonymous Polling Platform

Privacy-first polling with real-time results and no IP tracking.

## Setup

```bash
npm install
```

## Deploy

```bash
serverless deploy --stage prod
```

## Endpoints

- POST /polls - Create poll
- GET /polls/{pollId} - Get poll
- GET /polls - List polls
- DELETE /polls/{pollId} - Delete poll
- POST /polls/{pollId}/vote - Submit vote

## Tech Stack

- AWS Lambda + API Gateway
- DynamoDB
- Anonymous voting (no IP tracking)
