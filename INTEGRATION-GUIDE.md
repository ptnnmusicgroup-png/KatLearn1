# AI Vocabulary Integration Guide

## Setup Instructions

### 1. Backend Integration

Add to your `server.js`:

```javascript
const aiEndpoints = require('./server-ai-endpoints');
aiEndpoints(app);
```

### 2. Frontend Integration

Add to `index.html` before closing `</body>`:

```html
<script src="ai-vocabulary.js"></script>
<script src="ai-vocabulary-ui.js"></script>
```

### 3. Initialize Modal

In `app.js`, after DOM is ready:

```javascript
window.aiVocabularyUI.init();
```

### 4. Trigger Modal

Add button to UI:

```javascript
document.getElementById('createPackWithAiBtn').addEventListener('click', () => {
  window.aiVocabularyUI.open();
});
```

### 5. Listen for Generated Vocabulary

```javascript
window.addEventListener('ai-vocab-saved', (e) => {
  const vocabulary = e.detail;
  // Add to your pack
  console.log('Generated vocabulary:', vocabulary);
  // vocab = vocab.concat(vocabulary);
});
```

## API Endpoints

### POST /api/ai/vocabulary

Generate vocabulary for a single word.

**Request:**
```json
{
  "word": "abandon",
  "context": "Unit 7 - Environmental",
  "level": "intermediate"
}
```

**Response:**
```json
{
  "word": "abandon",
  "meaning_vi": "bỏ rơi; từ bỏ",
  "part_of_speech": "verb",
  "ipa": "/əˈbændən/",
  "example": "He abandoned his plan to study abroad.",
  "example_vi": "Anh ấy đã từ bỏ kế hoạch du học.",
  "synonyms": ["leave", "desert", "forsake"],
  "antonyms": ["keep", "retain"],
  "notes": "Usually used when someone leaves something or gives up an idea."
}
```

### POST /api/ai/vocabulary/regenerate-field

Regenerate a specific field for a word.

**Request:**
```json
{
  "word": "abandon",
  "field": "example",
  "level": "intermediate"
}
```

**Response:**
```json
{
  "example": "The company decided to abandon the old system."
}
```

## Error Handling

The system includes error handling for:
- Invalid JSON from AI
- Missing required fields
- API rate limiting
- Network errors

Errors are displayed as toasts to the user.

## Levels Supported

- `beginner`
- `elementary`
- `intermediate` (default)
- `upper-intermediate`
- `advanced`
- `ielts` (IELTS Academic)

## Features

✅ Single word generation
✅ Bulk word generation (up to 50 words)
✅ Field regeneration
✅ Editable form fields
✅ Preview before saving
✅ Multi-tab interface
✅ Error recovery
✅ Loading states
✅ Toast notifications

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 12+)
- IE 11: Not supported

## Performance Notes

- Bulk generation includes 500ms delay between requests to avoid rate limiting
- Each API call takes ~2-5 seconds
- IndexedDB stores generated vocabulary locally
- Modal supports up to 1000 entries in the list
