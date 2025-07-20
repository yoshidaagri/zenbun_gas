// Debug script to validate chat content format for Gemini API
// This helps verify that our file reference structure matches Gemini's expectations

function debugChatContentFormat() {
  console.log('=== Gemini Chat API Format Validation ===\n');
  
  // Expected format for Gemini Chat API with file references
  const expectedFormat = {
    "systemInstruction": {
      "parts": [{"text": "システム指示文"}]
    },
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "fileData": {
              "mimeType": "image/jpeg",
              "fileUri": "files/xyz123"
            }
          },
          {
            "text": "この画像について教えてください"
          }
        ]
      }
    ],
    "generationConfig": {
      "temperature": 0.2,
      "topK": 40,
      "topP": 0.95,
      "maxOutputTokens": 2048
    }
  };
  
  console.log('Expected Gemini Chat API Format:');
  console.log(JSON.stringify(expectedFormat, null, 2));
  
  // Common issues to check
  console.log('\n=== Common Issues to Check ===');
  console.log('1. File URI format: Should be "files/..." not full URL');
  console.log('2. MIME type: Must match the uploaded file\'s actual MIME type');
  console.log('3. File state: File must be ACTIVE before using in chat');
  console.log('4. Parts order: fileData should come before text in parts array');
  console.log('5. Role: Must be "user" for user messages, "model" for AI responses');
  
  // Validation functions
  console.log('\n=== Validation Checklist ===');
  console.log('✓ Check file upload response for correct URI format');
  console.log('✓ Verify file state is ACTIVE before chat');
  console.log('✓ Ensure MIME type matches uploaded file');
  console.log('✓ Validate chat content structure');
  console.log('✓ Check for proper error handling');
  
  return expectedFormat;
}

// Simulate our current implementation
function simulateOurChatContent() {
  const mockSession = {
    fileUri: "files/mock-test-file-123",
    originalMimeType: "image/jpeg",
    systemInstruction: "テスト用システム指示",
    history: []
  };
  
  const question = "この画像について教えてください";
  
  // This mimics our buildChatContents method
  const contents = [];
  
  if (mockSession.history.length === 0) {
    const fileRef = {
      fileData: {
        mimeType: mockSession.originalMimeType || "application/pdf",
        fileUri: mockSession.fileUri
      }
    };
    
    contents.push({
      role: "user",
      parts: [
        fileRef,
        { text: question }
      ]
    });
  }
  
  const payload = {
    systemInstruction: {
      parts: [{ text: mockSession.systemInstruction }]
    },
    contents: contents,
    generationConfig: {
      temperature: 0.2,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048
    }
  };
  
  console.log('\n=== Our Implementation Output ===');
  console.log(JSON.stringify(payload, null, 2));
  
  return payload;
}

// Run validation
debugChatContentFormat();
simulateOurChatContent();

console.log('\n=== Key Improvements Made ===');
console.log('1. Store original MIME type in chat session');
console.log('2. Use stored MIME type in file references');
console.log('3. Add comprehensive file readiness verification');
console.log('4. Enhanced error logging for debugging');
console.log('5. Proper file state checking before chat usage');