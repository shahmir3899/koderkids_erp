// Test file to identify import issue
import React, { useState } from 'react';

// Test if 'import' is causing issue in our context
const TestImport = () => {
  console.log('Testing imports');
  return <div>Test</div>;
};

export default TestImport;