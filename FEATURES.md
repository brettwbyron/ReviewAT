# UAT Board - Feature Documentation

A comprehensive Kanban-style UAT (User Acceptance Testing) board for tracking user feedback and development tasks with role-based access control and GitHub-based data persistence.

## Core Features

### Authentication & Access Control

**User Access**
- URL-based account identification (e.g., `/account-name`)
- Password-protected accounts with SHA-256 hashing
- Session persistence across page refreshes
- First-time access creates new account automatically
- "Forgot password?" helper message directing to admin

**Admin Access**
- Dedicated admin mode via `/admin` path
- Password-protected admin panel
- Session-based authentication
- Full access to all account boards
- Ability to view and edit any account's data

### Multi-User Management

**User Account Management** (Admin Only)
- List all accounts from data directory
- Select any account to view/manage their board
- Create new accounts with:
  - User ID (auto-formatted: lowercase, hyphenated)
  - Password
  - Display Name
  - UAT End Date
  - Dev Site URL
  - UAT Folder URL (optional)
  - Contact Emails (optional)
- Delete accounts
- Input validation for account creation
- Duplicate account detection

**Board Information**
- Display Name: User's friendly name
- UAT End Date: Deadline for UAT completion
  - Days remaining calculation
  - Visual warnings when UAT is ending soon (≤3 days)
  - Auto-disable task creation when UAT expired
- Dev Site URL: Link to account's development site
- UAT Folder URL: Link to shared UAT documentation/assets
- Contact Emails: Comma-separated email addresses for notifications

### Kanban Board System

**Columns** (6 total):
1. **To Do** - Initial task queue
2. **In Progress** - Work in progress
3. **Re-Test** - Items requiring retesting
4. **Feedback Needed** - Awaiting user/PM feedback
5. **Done** - Completed tasks
6. **Cancelled** - Cancelled/rejected items

**Column Visibility**
- Admins: See all columns
- Users: See To Do, Done only (plus current column of any task)
- Empty columns auto-hidden for accounts

### Task Management

**Task Properties**
- **Description*** (required): Detailed task description (500 char limit)
- **Type***: Change Request, Issue, Feature (admin only, required)
- **Device**: All, Desktop, Mobile
- **Owner***: PM, Developer, Account (admin only, required)
- **Section**: Page/section identifier (e.g., "Header", "Home Page")
- **Feedback**: Structured conversation thread with timestamps
- **Images**: Up to 5 images per task (10MB max, auto-compressed to 800x600)
- **Status**: Current column position
- **Locked**: Prevents editing once moved from To Do
- **Timestamps**: Created at, Updated at

**Task Creation**
- Modal-based creation interface
- Initial status selection (defaults to To Do)
- Real-time character count for description
- Required field validation
- Auto-locks when moved out of To Do column

**Task Editing**
- Click any task card to open edit modal
- Admin can edit any field at any time
- User restrictions:
  - Cannot edit locked tasks (work has started)
  - Can only change status and add feedback on locked tasks
  - Can only see/use To Do and Done columns
- Lock status indicator for users
- Unsaved changes warning on modal close

**Task Locking System**
- Tasks automatically lock when moved from "To Do"
- Locked tasks show 🔒 icon on card
- Admin bypass: Can edit/unlock any task
- User restriction: Cannot edit locked task details
- Lock toggle functionality (admin only)

**Drag & Drop**
- Drag tasks between columns to change status
- Visual feedback: Semi-transparent dragged item, column highlight
- Auto-save after drop
- Auto-lock when moved from To Do
- Read-only mode disables dragging
- Toast notifications on successful move

**Task Deletion**
- Delete button in task modal (if unlocked or admin)
- Confirmation modal before deletion
- Cannot delete locked tasks (user)
- Admin can delete any task

### Feedback System

**Conversation-Style Feedback**
- Structured feedback items (not plain text)
- Each item includes:
  - Author: account, pm, or developer
  - Text content
  - Created timestamp
  - Edited timestamp (if modified)
  - "(edited)" indicator when modified

**Author Types**
- **Account**: Feedback from the account (uses Display Name)
- **PM**: Project Manager feedback
- **Developer**: Developer feedback

**Chat-Style Layout**
- 75% width items with breathing room
- Admin view:
  - Account feedback: Left-aligned
  - PM/Developer feedback: Right-aligned
- Customer view (reversed):
  - Account feedback: Right-aligned
  - Admin feedback: Left-aligned

**Adding Feedback**
- Admin: Must select role (PM or Developer) via radio buttons
- Account: Automatically tagged as "account"
- No default role selection (forces intentional choice)
- Empty feedback prevented
- Auto-saves with modal save

**Editing Feedback**
- Edit/Delete buttons on each feedback item
- Permission rules:
  - **Admin**: Can edit/delete only PM and Developer feedback, NOT account feedback
  - **Account**: Can edit (but not delete) only their own feedback
- Edit mode shows:
  - Role selector (admin only)
  - Text area
  - Save/Cancel buttons
- Changes tracked with editedAt timestamp

**Display Features**
- Formatted timestamps (e.g., "Jan 15, 2026, 3:30 PM")
- Author labels: "PM", "Developer", or account's Display Name
- "(edited)" indicator for modified feedback
- Chronological ordering (oldest to newest)

### Search & Filtering

**Search Bar**
- Real-time search across:
  - Task descriptions
  - Section names
  - Feedback text content
- Case-insensitive matching
- Instant results as you type
- Search persists across page refreshes

**Type Filter** (Admin Only)
- Filter by task type:
  - All (default)
  - Change Request
  - Issue
  - Feature
- Dropdown selector
- Works in combination with search and owner filter

**Owner Filter** (Admin Only)
- Filter by owner:
  - All (default)
  - PM
  - Developer
  - Account
- Dropdown selector
- Works in combination with search and type filter

**Combined Filtering**
- All three filters work together
- Results update instantly
- Empty state message when no matches
- Filter state persists in session

### Data Persistence

**GitHub-Based Storage**
- Data stored as JSON files in `/data/` directory on GitHub
- One file per account: `account-id.json`
- Branch-based storage (separate data branch)
- Octokit API for GitHub operations

**Auto-Save**
- Debounced auto-save (1 second after last change)
- Saves triggered by:
  - Task creation/editing/deletion
  - Status changes (drag & drop)
  - Lock toggle
  - Account info updates
- Loading and success/error toast notifications

**Version Control**
- Version number incremented on each save
- Used for conflict detection
- Stored in BoardData structure

**Conflict Detection**
- Detects concurrent edits by multiple users
- Compares local vs remote versions
- Shows conflict modal with:
  - Your changes (local)
  - Remote changes
  - Option to review remote data
  - Option to force save (overwrite)
  - Option to cancel and refresh
- Change types tracked: added, modified, moved, deleted
- Detailed change descriptions (task, column, field changes)

**Session Management**
- SessionStorage-based session persistence
- Separate sessions for admin and users
- Auto-clear session when switching contexts (account ↔ admin)
- Session includes: account ID, isAdmin flag, timestamp

### Image Management

**Image Upload**
- Max 5 images per task
- Max 10MB per image (before compression)
- Supported formats: JPG, PNG, GIF, WebP
- Drag & drop or click to upload
- Base64 encoding for storage

**Image Processing**
- Automatic compression to 800x600px (preserves aspect ratio)
- Smart fit: scales to fit within bounds
- Reduces file size for faster loading
- Maintains image quality

**Image Display**
- Thumbnail grid in task modal
- Click to view full size in lightbox
- Delete button on each image (if not locked/view-only)
- Visual counter showing image count

**Permissions**
- Cannot add images to locked tasks (user)
- Admin can add/remove images anytime
- View-only mode: No add/delete options

### Notifications

**Email Notifications**
- "Notify Team" button in navigation (when contactEmails configured)
- Opens default email client with pre-filled:
  - **To**: Contact email addresses
  - **Subject**: "UAT Alert! - {DisplayName} needs attention"
  - **Body**: Alert message with direct link to UAT page
- URL automatically points to account-specific page (not admin)
- Uses mailto: protocol

**Toast Notifications**
- Success, Error, and Info message types
- Color-coded: Green (success), Red (error), Blue (info)
- Auto-dismiss after 3 seconds
- Slide-in animation from top
- Multiple toasts stack vertically
- Used for:
  - Login success/failure
  - Save success/failure
  - Task operations (add, delete, move)
  - Lock/unlock actions
  - Conflict warnings
  - Validation errors

### UI/UX Features

**Responsive Design**
- Desktop-optimized layout
- Mobile-friendly responsive behavior
- Touch-friendly tap targets
- Optimized modal sizing for all screens

**Keyboard Navigation**
- Tab navigation through interactive elements
- Enter/Space to activate task cards
- Escape to close modals
- Focus management in modals
- Focus trap while modal open

**Accessibility**
- ARIA labels and roles
- Screen reader friendly
- Semantic HTML
- Keyboard-accessible actions
- Proper form associations
- Focus indicators

**Loading States**
- Loading indicator during authentication
- Loading during save operations
- Loading during account list fetch
- Disabled state for buttons during operations
- Visual feedback for all async operations

**Empty States**
- "No tasks" message in empty columns
- "No results" message for filtered/searched views
- "No accounts" message in admin panel
- Helpful, friendly messaging

**Visual Feedback**
- Hover effects on interactive elements
- Column highlighting during drag operations
- Semi-transparent dragged items
- Different card styles based on status
- Lock icon on locked tasks
- Badge for task type (admin view)
- Badge for task owner (admin view)

**Task Cards**
- Compact card design with key information
- Type badge (admin only)
- Owner badge (if assigned)
- Description preview
- Feedback count indicator
- Image count indicator (if images present)
- Lock icon (if locked)
- Hover effects
- Drag handle (when draggable)

**Modals**
- Backdrop overlay with blur
- Click outside to close
- Clean, modern design
- Smooth animations (fade in, slide up)
- Form validation with error display
- Footer with action buttons
- Scrollable content area for long forms

**Account Information Modal** (Admin Only)
- Edit account account settings
- Fields:
  - Display Name
  - UAT End Date (date picker)
  - Dev URL
  - UAT Folder URL
  - Contact Emails
  - New Password (optional, leave blank to keep current)
- Save/Cancel actions
- Accessible from Board header

**Navigation Bar**
- Logo (left)
- Action buttons (right):
  - "Notify Team" (if contactEmails configured)
  - "Open Dev Site" (if devSiteUrl configured)
- Responsive layout
- Fixed position

**Help System**
- "?" help button in board header
- Help modal with usage instructions
- Keyboard shortcut reference (if applicable)

### Role-Based Features

**Admin Capabilities**
- Access all account boards
- Create/delete account accounts
- Edit all task properties
- See all 6 columns
- Use all search/filter options
- Lock/unlock any task
- Override all restrictions
- Add/remove images on any task
- Delete any task (even locked)
- Edit own (PM/Developer) feedback only

**Customer Capabilities**
- Access only their board
- Create new tasks in To Do
- Edit unlocked tasks fully
- Edit locked tasks: status and feedback only
- See To Do + Done columns (+ current column)
- Add feedback to tasks
- Edit own feedback (cannot delete)
- Cannot see Type/Owner filters
- Cannot see admin fields (Type, Owner)
- Cannot add tasks when UAT expired

## Technical Details

### Architecture
- **Framework**: SvelteKit (Svelte 5)
- **Language**: TypeScript
- **State Management**: Svelte 5 runes (`$state`, `$effect`, `$derived`, `$bindable`)
- **API Integration**: Octokit (GitHub REST API)
- **Storage**: GitHub repository (JSON files)
- **Deployment**: Static site (GitHub Pages compatible)

### Security
- **Password Hashing**: SHA-256 (client-side)
- **Token Exposure**: GitHub token visible in client code (acceptable for non-sensitive UAT data)
- **Access Control**: Password-based, not foolproof but sufficient for trusted accounts
- **Session**: SessionStorage for persistence (client-side only)

### Performance
- Efficient filtering with derived state
- Debounced auto-save
- Minimal re-renders
- Image compression to reduce bandwidth
- Lazy loading for large boards

### Code Quality
- Full TypeScript type safety
- Comprehensive type definitions in `types.ts`
- Clean component architecture
- Reusable utility functions
- Proper event handling
- Error handling with user feedback

## Usage Tips

### For Customers
1. Navigate to your unique URL (e.g., `/acme-corp`)
2. Enter your password
3. Create new tasks using "+ Add Task" button
4. Drag tasks to "Done" when reviewed/approved
5. Add feedback to communicate with the dev team
6. Click "Notify Team" to send alerts via email

### For Admins
1. Navigate to `/admin`
2. Enter admin password
3. Select account from list or create new account
4. View/edit account's board with full permissions
5. Manage task types, owners, and statuses
6. Move tasks through full workflow (all 6 columns)
7. Lock/unlock tasks as needed

### Best Practices
- Keep descriptions clear and concise (500 char limit)
- Use Section field to identify location (e.g., "Header", "Footer")
- Add feedback regularly to maintain communication
- Use images to illustrate issues
- Lock tasks once work begins (automatic on status change)
- Admin: Select appropriate Type and Owner for all tasks

## Changelog

### Recent Major Features
- Structured feedback system with author roles (PM, Developer, Account)
- Chat-style feedback alignment
- Edit/delete feedback with role-based permissions
- Conflict detection for concurrent edits
- Image upload with compression (5 per task, 10MB max)
- Task locking system to prevent edits after work starts
- Admin account management (create/delete accounts)
- Email notifications with "Notify Team" button
- UAT end date tracking with expiration warnings
- Contact emails field for team notifications
- Owner field for task assignment (PM, Developer, Account)
- Type field requirement for admin (Change Request, Issue, Feature)
- Display name support (shown in feedback instead of "Account")
- Session-based persistence across page refreshes
- Conflict resolution modal with detailed change tracking
