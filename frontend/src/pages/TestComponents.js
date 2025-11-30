// ============================================
// TEST COMPONENTS - Phase 3 Testing Only
// ============================================

import React, { useState, useEffect } from 'react';

import { RichTextEditor } from '../components/common/ui/RichTextEditor';

function TestComponents() {
  // State
const [testText, setTestText] = useState('*Bold* and _italic_ test');


  return (
    // Add this JSX where you want the test section
<div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', marginBottom: '2rem' }}>
  <h2>RichTextEditor Test</h2>
  <RichTextEditor
    value={testText}
    onChange={setTestText}
    label="Test Editor"
    placeholder="Try: *bold*, _italic_, ~strike~, ```code```"
    showPreview={true}
    showLineSpacing={true}
  />
</div>
  );
}



export default TestComponents;