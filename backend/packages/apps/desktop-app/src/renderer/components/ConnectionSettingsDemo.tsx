import React from 'react';
import { ConnectionSettings } from './ConnectionSettings';

/**
 * Demo component to showcase the ConnectionSettings component
 * This demonstrates the Figma design implementation
 */
export const ConnectionSettingsDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Connection Settings - Figma Design Implementation
          </h1>
          <p className="text-gray-600">
            This component implements the device registration UI based on the Figma design specifications.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Features Implemented:</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
            <li>Clean white background with rounded corners matching Figma design</li>
            <li>Success state showing device registration status with green success indicator</li>
            <li>Device information display with copy functionality for Device ID and Reward Address</li>
            <li>Registration form with proper validation and error handling</li>
            <li>Action buttons (Cancel/Register) with proper styling and states</li>
            <li>Note section with important information and warning styling</li>
            <li>Responsive layout and proper spacing</li>
            <li>Copy to clipboard functionality using Electron API</li>
          </ul>
        </div>

        {/* The actual component */}
        <ConnectionSettings />
      </div>
    </div>
  );
};

export default ConnectionSettingsDemo;
