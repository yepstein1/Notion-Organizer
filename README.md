# Notion AI Organizer

A React app with a secure backend (AWS Lambda + API Gateway) that organizes learning notes with AI and syncs them to Notion.

## 📁 File Structure

```
notion-organizer/
├── src/
│   ├── App.js                      # Main application component
│   ├── components/
│   │   ├── SetupView.js            # Database ID input + setup instructions
│   │   ├── Header.js               # Top header with sync status
│   │   ├── Scratchpad.js           # Note entry textarea and sync button
│   │   └── Sidebar.js              # Activity log and feature info
│   ├── utils/
│   │   ├── storage.js              # Persistent storage helpers
│   │   └── ai-service.js           # Backend API client
│   └── hooks/
│       └── useScheduledSync.js     # 6 PM auto-sync scheduler
└── backend/
    ├── template.yaml               # SAM template (Lambda + API)
    ├── samconfig.toml              # SAM deploy settings
    └── src/handler.js              # Lambda handler

```

## 🔧 Component Responsibilities

### **App.js** (Main Orchestrator)
- Manages global state (config, scratchpad, logs)
- Coordinates between all components and services
- Handles data persistence via storage utils

### **Components**

#### SetupView.js
- Database ID input
- Connection testing
- Setup instructions

#### Header.js
- Displays app title
- Shows last sync time and next scheduled sync
- Auto-sync toggle checkbox
- Settings button

#### Scratchpad.js
- Text area for note entry
- Character counter
- Manual sync button
- Processing status display

#### Sidebar.js
- "How It Works" guide
- Activity log with timestamps
- Feature list

### **Utils**

#### storage.js
- `loadConfig()` - Load all saved settings
- `saveConfig()` - Persist configuration
- Abstraction over `window.storage` API

#### ai-service.js
- `syncNotesWithBackend()` - Send notes to backend for AI + Notion sync
- `testNotionConnection()` - Test Notion via backend

### **Hooks**

#### useScheduledSync.js
- Calculates next 6 PM sync time
- Checks every minute if it's time to sync
- Only syncs once per day
- Respects auto-sync toggle

## 🔄 Data Flow

1. **User writes notes** → Scratchpad component → App state
2. **Manual sync clicked** → App.processAndOrganize()
3. **AI processing** → Backend Lambda (Anthropic)
4. **Notion sync** → Backend Lambda (Notion API)
5. **Update UI** → Activity log + last sync time
6. **Persist state** → storage.saveConfig()

## 🕐 Scheduled Sync Flow

1. **useScheduledSync hook** checks time every minute
2. If past 6 PM and not synced today → trigger sync
3. Calls App.processAndOrganize()
4. Updates lastSync state to prevent duplicate syncs

## 💾 Storage Keys

- `notion-database-id` - Target database ID
- `notion-activity-log` - Array of log entries
- `notion-last-sync` - ISO timestamp of last sync
- `notion-auto-sync-enabled` - Boolean for auto-sync

## 🎯 Why This Structure?

**Separation of Concerns:**
- UI components are presentation-only
- Backend handles API keys and external calls
- State management in App.js
- Side effects in hooks

**Reusability:**
- Backend API can be used by other clients
- Storage abstraction makes it easy to switch backends
- Components are independent and testable

**Maintainability:**
- Each file has a single, clear purpose
- Easy to locate and fix bugs
- Simple to add new features

## 🚀 How to Use

## 🚀 How to Run (Local)

1. Set frontend API base URL:

```bash
copy .env.example .env
```

Then edit `.env` to set `REACT_APP_API_BASE` to your API Gateway URL (or local SAM URL).

2. Start the React app:

```bash
npm start
```

## ☁️ Deploy Backend (AWS SAM)

1. Set Lambda env vars in AWS (or via SAM):
    - `NOTION_TOKEN`
    - `ANTHROPIC_API_KEY`
    - Optional: `NOTION_DATABASE_ID`, `ANTHROPIC_MODEL`
1. Set Lambda env vars manually in the AWS Console:
    - Open Lambda → your function → Configuration → Environment variables → Edit
    - Add:
        - `NOTION_TOKEN`
        - `ANTHROPIC_API_KEY`
        - Optional: `NOTION_DATABASE_ID`, `ANTHROPIC_MODEL`

2. Deploy:

```bash
cd backend
sam build
sam deploy --guided
```

3. Copy the API Gateway URL from the deploy output and set `REACT_APP_API_BASE` in `.env`.
