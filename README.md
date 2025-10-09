# SnapIT Polls

A modern, real-time polling application built with React and AWS serverless architecture.

**Live Site:** https://polls.snapitsoftware.com

## Features

- ✅ Create polls with multiple options (2-10 options)
- ✅ Real-time voting and results
- ✅ Shareable poll links with short URLs
- ✅ Beautiful pink/cream gradient UI
- ✅ Mobile responsive design
- ✅ Poll expiration settings (1 hour to 1 week, or never)
- ✅ Anonymous and authenticated voting
- ✅ Embedded poll support (iframe)

## Tech Stack

### Frontend
- **Framework:** React 19 with TypeScript
- **Routing:** React Router v7
- **Styling:** Custom CSS with gradient themes
- **Build:** Create React App
- **Hosting:** AWS S3 + CloudFront

### Backend (AWS Serverless)
- **API:** AWS API Gateway (REST)
- **Compute:** AWS Lambda (Node.js 18.x)
- **Database:** DynamoDB with GSI for fast short-link lookups
- **Authentication:** Custom JWT authorizer (optional)

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   React     │─────▶│  CloudFront  │─────▶│     S3      │
│   Frontend  │      │  Distribution │      │   Bucket    │
└─────────────┘      └──────────────┘      └─────────────┘
       │
       │ API Calls
       ▼
┌──────────────┐      ┌─────────────┐      ┌─────────────┐
│ API Gateway  │─────▶│   Lambda    │─────▶│  DynamoDB   │
│  (REST API)  │      │  Functions  │      │   Tables    │
└──────────────┘      └─────────────┘      └─────────────┘
```

## Recent Improvements

### Fixed Issues
1. **API Response Mismatch** - Updated frontend to handle nested `poll` object from API
2. **URL Routing** - Implemented React Router for proper `/p/:pollId` routes
3. **Short Link Support** - Added DynamoDB GSI for fast short-link lookups
4. **Mobile UI** - Fixed footer positioning and container padding

### Added Features
1. **Professional Footer** - Links to all SnapIT products
2. **Proper Branding** - Updated page title and favicon
3. **Better UX** - Added "View Results" button, improved navigation

## Local Development

### Prerequisites
- Node.js 16+ and npm
- AWS CLI configured (for deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/terrellflautt/polls.git
cd polls

# Install dependencies
npm install

# Start development server
npm start
```

The app will open at http://localhost:3000

### Build for Production

```bash
npm run build
```

## Deployment

### Frontend Deployment

The frontend is deployed to AWS S3 with CloudFront CDN.

```bash
# Build the app
npm run build

# Sync to S3 (replace with your bucket)
aws s3 sync build/ s3://your-bucket-name --delete

# Invalidate CloudFront cache (replace with your distribution ID)
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### Backend Deployment

The backend uses Serverless Framework. Backend code is in a separate repository.

**DynamoDB Tables:**
- `polls` - Stores poll data with GSI on `shortLink`
- `votes` - Stores individual votes with GSI on `userId`

**Lambda Functions:**
- `createPoll` - POST /polls
- `getPoll` - GET /polls/{pollId}
- `vote` - POST /polls/{pollId}/vote
- `getResults` - GET /polls/{pollId}/results
- `listPolls` - GET /polls (authenticated)
- `deletePoll` - DELETE /polls/{pollId} (authenticated)

**Environment Variables Required:**
- `POLLS_TABLE` - DynamoDB polls table name
- `VOTES_TABLE` - DynamoDB votes table name
- `JWT_SECRET` - Secret for JWT validation (if using auth)

### CloudFront Configuration

For SPA routing to work, configure custom error responses:

```
Error Code: 404
Response Page Path: /index.html
Response Code: 200
Error Caching Min TTL: 300
```

## API Documentation

### Base URL
```
https://7nbqiasg8i.execute-api.us-east-1.amazonaws.com/prod
```

### Endpoints

#### Create Poll
```http
POST /polls
Content-Type: application/json

{
  "question": "What's your favorite color?",
  "options": ["Red", "Blue", "Green"],
  "expiresInHours": 24
}

Response: {
  "pollId": "uuid",
  "shortLink": "abcd1234",
  "shareUrl": "https://polls.snapitsoftware.com/p/abcd1234",
  "poll": { ... }
}
```

#### Get Poll
```http
GET /polls/{pollId}

Response: {
  "pollId": "uuid",
  "title": "What's your favorite color?",
  "options": [
    {"id": "opt1", "text": "Red", "votes": 5},
    {"id": "opt2", "text": "Blue", "votes": 3}
  ],
  "totalVotes": 8,
  ...
}
```

#### Submit Vote
```http
POST /polls/{pollId}/vote
Content-Type: application/json

{
  "optionId": "opt1"
}
```

## Known Issues & TODO

### In Progress
- [ ] Lambda GSI update deployment (GSI is created, code update pending)
- [ ] Route 53 redirect for statuscodecheck.com → urlstatuschecker.com

### Future Enhancements
- [ ] User authentication integration
- [ ] Poll analytics dashboard
- [ ] Export poll results (CSV, PDF)
- [ ] Poll templates
- [ ] Custom branding for premium users
- [ ] Real-time updates with WebSockets

## Project Structure

```
polls/
├── public/
│   ├── index.html          # HTML template with updated title
│   ├── favicon.ico         # SnapIT branding
│   ├── logo192.png         # App icon
│   └── manifest.json       # PWA manifest
├── src/
│   ├── App.tsx            # Main app with routing and components
│   ├── App.css            # Styles with pink/cream theme
│   ├── index.tsx          # React entry point with Router
│   └── index.css          # Global styles
├── build/                 # Production build (gitignored)
├── package.json           # Dependencies
└── README.md             # This file
```

## Contributing

This is a private SnapIT Software project. For internal team members:

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request
5. Get review from team lead

## Security Notes

- **No secrets in repo** - All AWS credentials and API keys use AWS SSM Parameter Store
- **CORS enabled** - API allows all origins for public polls
- **Rate limiting** - Implemented at API Gateway level
- **Input validation** - All user inputs are sanitized

## Support

For issues or questions, contact the SnapIT Software development team.

## License

© 2025 SnapIT Software. All rights reserved.

---

**Part of the SnapIT Software Ecosystem:**
- [SnapIT Software](https://snapitsoftware.com)
- [SnapIT Analytics](https://snapitanalytics.com)
- [Burn](https://burn.snapitsoftware.com)
- [Forum Builder](https://forums.snapitsoftware.com)
- And more at https://snapitsoftware.com
