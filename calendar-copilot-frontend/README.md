# Calendar Copilot React Frontend

A modern, beautiful React frontend for the Calendar Copilot AI-powered calendar management system, built with shadcn/ui components and Tailwind CSS.

## ✨ Features

### 🎨 Modern UI Design
- **shadcn/ui Components**: Beautiful, accessible components with consistent design
- **Tailwind CSS**: Utility-first CSS framework for rapid styling
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Gradient Background**: Modern blue-to-indigo gradient design
- **Icons**: Lucide React icons for visual clarity

### 🤖 AI-Powered Calendar Management
- **Natural Language Processing**: Ask questions in plain English
- **Conflict Detection**: Automatic scheduling conflict detection with smart alternatives
- **Multiple Intent Support**: Query, schedule, update, cancel, and availability checking
- **Real-time Responses**: Instant feedback with success/error states

### 📅 Calendar Operations
- **Event Queries**: "What events do I have tomorrow?"
- **Smart Scheduling**: "Schedule a team meeting tomorrow at 3pm for 1 hour"
- **Availability Checking**: "Am I free at 2pm today?"
- **Event Updates**: "Update the working test meeting to be 2 hours long"
- **Event Cancellation**: "Cancel the test meeting"
- **Conflict Resolution**: Automatic alternative time suggestions

### 📊 User Experience
- **Request History**: Track your last 10 calendar interactions
- **Type Badges**: Visual indicators for different operation types
- **Example Queries**: Quick-start buttons with common requests
- **Loading States**: Clear feedback during processing
- **Error Handling**: Helpful error messages and guidance

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Calendar API server running on `http://localhost:3000`

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm start
   ```

3. **Open your browser**:
   Navigate to `http://localhost:3001` to see the app

### Dependencies

#### Core React
- `react` ^19.1.0
- `react-dom` ^19.1.0
- `typescript` ^4.9.5

#### UI Framework
- `@radix-ui/react-dialog` - Modal components
- `@radix-ui/react-slot` - Composition utilities
- `@radix-ui/react-toast` - Toast notifications
- `class-variance-authority` - Component variants
- `clsx` - Conditional classnames
- `tailwind-merge` - Tailwind class merging
- `lucide-react` - Beautiful icons

#### Styling
- `tailwindcss` - Utility-first CSS
- `postcss` - CSS processing
- `autoprefixer` - CSS vendor prefixes

## 🎨 Design System

### Color Palette
- **Primary**: Blue (`hsl(221.2 83.2% 53.3%)`)
- **Secondary**: Light gray (`hsl(210 40% 96%)`)
- **Success**: Green tones for successful operations
- **Error**: Red tones for errors and conflicts
- **Warning**: Yellow/orange for conflicts with alternatives

### Component Structure
```
src/
├── components/
│   └── ui/
│       ├── button.tsx      # Styled button component
│       ├── input.tsx       # Form input component
│       ├── card.tsx        # Card layout components
│       └── badge.tsx       # Status badges
├── lib/
│   └── utils.ts           # Utility functions
└── App.tsx                # Main application
```

## 🔧 API Integration

### Endpoint
- **URL**: `http://localhost:3000/api/calendar-query`
- **Method**: POST
- **Content-Type**: `application/json`

### Request Format
```json
{
  "query": "What events do I have tomorrow?"
}
```

### Response Format
```json
{
  "success": true,
  "message": "Found 3 event(s):\n1. morning standup at 9:00 AM\n2. conflict test meeting at 2:00 PM\n3. coffee chat at 3:30 PM",
  "data": {
    "originalQuery": "What events do I have tomorrow?",
    "parsedIntent": "query",
    "confidence": 0.95,
    "mcpResult": { ... }
  }
}
```

## 🎯 Usage Examples

### Basic Queries
```
"What events do I have tomorrow?"
"Show me my schedule for next week"
"Do I have any meetings today?"
```

### Scheduling with Conflict Detection
```
"Schedule a team meeting tomorrow at 3pm for 1 hour"
→ ✅ Event created successfully! (if no conflicts)
→ ⚠️ CONFLICT DETECTED! Alternative: 4:00 PM (if conflicts found)
```

### Availability Checking
```
"Am I free at 2pm today?"
→ ✅ YES, you are completely free during this time!
→ ⚠️ PARTIALLY FREE - You have conflicts, but here are available slots
→ ❌ NO, you are completely booked during this time
```

### Event Management
```
"Update the working test meeting to be 2 hours long"
"Cancel the test meeting"
"Move the team standup to 10am"
```

## 🔍 Features in Detail

### Request History
- **Visual Indicators**: Color-coded success/failure states
- **Type Badges**: Schedule, Update, Cancel, Query, Availability
- **Timestamps**: When each request was made
- **Response Preview**: Truncated response text

### Conflict Detection
- **Smart Analysis**: Checks existing calendar events
- **Alternative Suggestions**: Finds next available time slot
- **Business Hours**: Respects 9 AM - 6 PM scheduling
- **Duration Awareness**: Ensures full meeting duration fits

### Error Handling
- **Connection Errors**: Clear message when API is unavailable
- **Parsing Errors**: Helpful feedback for malformed requests
- **Calendar Errors**: Google Calendar API error handling

## 🎨 Customization

### Theming
The app uses CSS custom properties for theming. You can customize colors in `src/index.css`:

```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96%;
  /* ... other colors */
}
```

### Adding New Components
Follow the shadcn/ui pattern:

1. Create component in `src/components/ui/`
2. Use `cn()` utility for className merging
3. Export with proper TypeScript types
4. Follow Radix UI patterns for accessibility

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Serve Static Files
```bash
# Using serve
npm install -g serve
serve -s build

# Using any static file server
python -m http.server 3000 -d build
```

## 🔧 Development

### Available Scripts
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

### Code Structure
- **App.tsx**: Main application logic and state management
- **components/ui/**: Reusable UI components
- **lib/utils.ts**: Utility functions for styling

## 🎯 Roadmap

- [ ] **Dark Mode**: Toggle between light and dark themes
- [ ] **Event Details Modal**: Detailed view of calendar events
- [ ] **Recurring Events**: Support for recurring meeting patterns
- [ ] **Multiple Calendars**: Support for multiple Google Calendar accounts
- [ ] **Offline Support**: Cache recent requests for offline viewing
- [ ] **Export Features**: Export calendar data to various formats

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the Calendar Copilot system. See the main project for licensing information.

---

**Built with ❤️ using React, shadcn/ui, and Tailwind CSS**
