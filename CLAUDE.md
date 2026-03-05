# Notion Organizer — Claude Code Context

## What This Project Is
A full-stack React app that takes raw learning notes, organizes them using Claude AI, and syncs structured pages into a Notion database. Features auto-sync at 6 PM and iterative AI refinement.

## Tech Stack
- **Frontend:** React 19 (Create React App), lucide-react icons, 6 color themes
- **Backend:** AWS Lambda (Node.js 18.x) + API Gateway via AWS SAM
- **APIs:** Notion API + Anthropic Claude (claude-opus-4-6 by default)
- **Local dev:** `backend/dev-server.js` runs Express on port 3001

## Key Files
```
src/
  App.js                  # Root state, processAndOrganize(), testConnection()
  components/
    Scratchpad.js         # Note input, formatting toolbar, sync/refine buttons
    Header.js             # Last sync time, auto-sync toggle
    Sidebar.js            # Activity log, how-it-works guide
    SetupView.js          # Onboarding, database ID config
  utils/
    ai-service.js         # Frontend API client (calls backend)
    storage.js            # localStorage abstraction
  hooks/
    useScheduledSync.js   # Triggers sync at 6 PM daily

backend/
  src/handler.js          # Lambda entry point (~800 lines), all AI + Notion logic
  template.yaml           # SAM CloudFormation (Lambda + API Gateway)
  samconfig.toml          # SAM deploy config
  dev-server.js           # Local Express server wrapping handler.js

.env                      # REACT_APP_API_BASE=http://localhost:3001
```

## API Endpoints
- `POST /api/sync` — Organize scratchpad + sync to Notion
- `POST /api/notion/test` — Test Notion database connection
- `ANY /api/{proxy+}` — Catch-all proxy on API Gateway

## Environment Variables
| Variable | Where |
|---|---|
| `NOTION_TOKEN` | Lambda env / backend/.env |
| `ANTHROPIC_API_KEY` | Lambda env / backend/.env |
| `NOTION_DATABASE_ID` | Lambda env / optional default |
| `ANTHROPIC_MODEL` | Lambda env (default: claude-opus-4-6) |
| `REACT_APP_API_BASE` | Frontend .env |

## SAM Deployment
```bash
cd backend
sam build
sam deploy  # uses samconfig.toml
```

### Common Permission Issues with `sam deploy`
SAM auto-creates an IAM execution role for Lambda — this often fails in restricted AWS accounts.

**Fix options:**
1. Run with `--capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND` (already in samconfig likely)
2. Pre-create the Lambda execution role and add `Role: arn:aws:iam::ACCOUNT:role/ROLE` to the function in template.yaml
3. Check deploying identity: `aws sts get-caller-identity`
4. Required permissions: CloudFormation CRUD, Lambda CRUD, API Gateway CRUD, IAM CreateRole/PassRole, S3 PutObject on deployment bucket

## Local Dev Workflow
```bash
# Frontend
npm start                  # React on port 3000

# Backend
cd backend && node dev-server.js    # Express on port 3001
```

## AI Organization Methods (handler.js)
1. **official-docs** — Groups like official documentation (React docs, Python docs)
2. **textbook** — Chronological/thematic structure
3. **fallback** — Simple categorization for niche/mixed topics

Claude outputs JSON → handler parses → creates/updates Notion pages with heading_2 + bulleted_list_item blocks. Fuzzy section matching (Jaccard similarity) merges similar sections on update.

## Sync Flow
1. Frontend sends scratchpad text + databaseId to `POST /api/sync`
2. Backend fetches existing Notion DB structure
3. Calls Anthropic API (with retry: 3 attempts, exponential backoff, handles 429/529)
4. Parses structured JSON from Claude response
5. Optionally runs review/refine iterations
6. Creates/updates Notion pages via Notion API
7. Returns pages created/updated counts

## Frontend State (App.js)
Key state: `currentView`, `databaseId`, `scratchpadContent`, `isProcessing`, `activityLog` (last 20 entries), `autoSyncEnabled`, `syncErrors`, `theme`

localStorage keys: `notion-database-id`, `notion-activity-log`, `notion-last-sync`, `notion-auto-sync-enabled`

## Notes & Known Issues
- `test/` directory is empty (placeholder)
- Root-level `components/`, `hooks/`, `utils/` are old duplicates of `src/` versions
- `#/test-harness` route loads `TestHarness.js` for dev testing
- `.env` files must NOT be committed — credentials should live only in Lambda env vars

