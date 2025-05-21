# LLM Data Platform

A web application that powers a data manipulation platform for LLM models, specifically targeting Google Gemini. This platform allows users to collect, process, and manipulate data through various input methods.

## Features

The platform consists of four main sections:

1. **File Upload**: Upload files (PDF, TXT, DOCX) to be stored in Firebase Storage and processed for LLM consumption.
2. **Text Input**: Manually input text data that can be used as a data source for the LLM.
3. **Website Parsing**: Extract text content from websites by providing a URL.
4. **Q&A Interface**: Interact directly with Google Gemini through a chat-like interface.

## Architecture

### Backend

- **Firebase Functions**: Node.js serverless functions handling all backend operations
- **Firebase Firestore**: NoSQL database for storing metadata and text content
- **Firebase Storage**: Object storage for uploaded files
- **Google Gemini API**: LLM integration for the Q&A interface

### Frontend

- **HTML/CSS/JavaScript**: Simple frontend interface
- **Bootstrap**: For styling and responsive design
- **Firebase SDK**: Client-side integration with Firebase services

## Project Structure

```
llm-data-platform/
├── functions/               # Firebase Cloud Functions
│   ├── index.js             # Main backend code
│   └── package.json         # Dependencies
├── public/                  # Frontend files
│   ├── js/
│   │   └── main.js          # Frontend JavaScript
│   └── main.html            # Main HTML interface
├── config/                  # Configuration files
│   ├── firebase-config.js   # Firebase configuration
│   └── gemini-config.js     # Google Gemini API configuration
└── README.md                # Project documentation
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or later)
- Firebase CLI
- A Firebase project
- A Google Gemini API key

### Installation

1. Clone the repository
2. Update the configuration files with your Firebase and Gemini API credentials:
   - `config/firebase-config.js`
   - `config/gemini-config.js`
   - `public/js/main.js` (Firebase config section)

3. Install dependencies:
   ```bash
   cd functions
   npm install
   ```

4. Deploy to Firebase:
   ```bash
   firebase deploy
   ```

### Local Development

1. Start the Firebase emulators:
   ```bash
   cd functions
   npm run serve
   ```

2. Open `public/main.html` in your browser or serve it using a local web server.

## API Endpoints

- **POST /api/upload**: Upload a file
- **POST /api/text**: Save text input
- **POST /api/parse-website**: Parse a website
- **POST /api/qa**: Ask a question to Gemini
- **GET /api/data-sources**: Retrieve all data sources

## Security Considerations

- This project uses Firebase Authentication (not fully implemented in this demo)
- API keys should be properly secured and not exposed in client-side code
- Consider implementing rate limiting for production use

## License

MIT
