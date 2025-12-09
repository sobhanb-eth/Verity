import React from 'react';
import { AppSettings } from '../types';
import { XCircleIcon } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdate: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdate }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">Voice Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          
          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Speaker Voice</label>
            <div className="grid grid-cols-3 gap-2">
              {['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].map((voice) => (
                <button
                  key={voice}
                  onClick={() => onUpdate({ ...settings, voiceName: voice as any })}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                    settings.voiceName === voice
                      ? 'bg-verity-primary text-white border-verity-primary shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {voice}
                </button>
              ))}
            </div>
          </div>

          {/* Speech Rate */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Speech Rate</label>
              <span className="text-xs text-gray-500 font-mono">{settings.speechRate}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.speechRate}
              onChange={(e) => onUpdate({ ...settings, speechRate: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-verity-primary"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Slow</span>
              <span>Normal</span>
              <span>Fast</span>
            </div>
          </div>

          {/* Verbosity */}
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Response Style</label>
            <div className="flex gap-2">
              <button
                onClick={() => onUpdate({ ...settings, verbosity: 'brief' })}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all ${
                  settings.verbosity === 'brief'
                     ? 'bg-verity-primary text-white border-verity-primary'
                     : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                Brief
              </button>
              <button
                onClick={() => onUpdate({ ...settings, verbosity: 'detailed' })}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all ${
                  settings.verbosity === 'detailed'
                     ? 'bg-verity-primary text-white border-verity-primary'
                     : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                Detailed
              </button>
            </div>
          </div>

          {/* Auto Read Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-sm font-medium text-gray-700">Auto-read summary</span>
            <button
              onClick={() => onUpdate({ ...settings, autoRead: !settings.autoRead })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.autoRead ? 'bg-verity-success' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoRead ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

        </div>

        <div className="p-4 bg-gray-50 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
