import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Phone, 
  PhoneOff, 
  MicOff, 
  Mic, 
  Pause, 
  Play, 
  RefreshCw,
  Volume2,
  Volume,
  X
} from 'lucide-react';
import { createCallLog, updateCallLog, getCallLogs } from '@/lib/api';

export interface CallOverlayProps {
  isVisible: boolean;
  phoneNumber: string;
  callSid?: string;
  service?: string;
  duration: number;
  onHangup: () => void;
  onMute?: (muted: boolean) => void;
  onHold?: (held: boolean) => void;
  onRedial?: () => void;
  onSpeaker?: (speakerOn: boolean) => void;
  onClose?: () => void;
}

// Possible call states
type CallState = 'dialing' | 'connecting' | 'connected' | 'ended' | 'failed';

const CallOverlay: React.FC<CallOverlayProps> = ({
  isVisible,
  phoneNumber,
  callSid,
  service,
  duration,
  onHangup,
  onMute,
  onHold,
  onRedial,
  onSpeaker,
  onClose
}) => {
  // State management
  const [callState, setCallState] = useState<CallState>('dialing');
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isRecording, setIsRecording] = useState(true);

  // Format number for display
  const formatPhoneNumber = (number: string) => {
    // Keep E.164 format but make it more readable
    if (number.startsWith('+')) {
      const country = number.substring(1, 3);
      const area = number.substring(3, 6);
      const first = number.substring(6, 9);
      const last = number.substring(9);
      return `+${country} (${area}) ${first}-${last}`;
    }
    return number;
  };

  // Format seconds to MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Handle mute toggle
  const handleMuteToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (onMute) onMute(newMutedState);
  };

  // Handle hold toggle
  const handleHoldToggle = () => {
    const newHoldState = !isOnHold;
    setIsOnHold(newHoldState);
    if (onHold) onHold(newHoldState);
  };

  // Handle speaker toggle
  const handleSpeakerToggle = () => {
    const newSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(newSpeakerState);
    if (onSpeaker) onSpeaker(newSpeakerState);
  };

  // Handle hangup
  const handleHangup = () => {
    setCallState('ended');
    if (onHangup) onHangup();
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
      if (onClose) onClose();
    }, 3000);
  };

  // Handle redial
  const handleRedial = () => {
    if (onRedial) {
      setCallState('dialing');
      onRedial();
    }
  };

  // Effect to handle call connection and db logging
  useEffect(() => {
    if (isVisible && callState === 'dialing') {
      // Store the initial call log in the database
      if (phoneNumber && callSid) {
        // Create a call log entry when the call starts
        createCallLog({
          phoneNumber,
          status: 'initiating',
          timestamp: new Date().toISOString(),
          callSid: callSid,
          service: service || 'unknown'
        }).catch(err => console.error('Failed to create call log:', err));
      }
      
      // Real connection - we transition from dialing to connecting
      const connectingTimeout = setTimeout(() => {
        setCallState('connecting');
        
        // Update call log to 'connecting' status
        if (phoneNumber && callSid) {
          // Use the latest known callLogs to find our call
          getCallLogs(5).then(logs => {
            const ourCall = logs.find(log => log.callSid === callSid);
            if (ourCall) {
              updateCallLog(ourCall.id, {
                status: 'connecting'
              }).catch(err => console.error('Failed to update call log:', err));
            }
          }).catch(err => console.error('Failed to fetch call logs:', err));
        }
      }, 1500);
      
      // Then to connected status
      const connectedTimeout = setTimeout(() => {
        setCallState('connected');
        
        // Update call log to 'connected' status
        if (phoneNumber && callSid) {
          getCallLogs(5).then(logs => {
            const ourCall = logs.find(log => log.callSid === callSid);
            if (ourCall) {
              updateCallLog(ourCall.id, {
                status: 'connected',
                transcript: 'Call in progress...'
              }).catch(err => console.error('Failed to update call log:', err));
            }
          }).catch(err => console.error('Failed to fetch call logs:', err));
        }
      }, 3000);
      
      return () => {
        clearTimeout(connectingTimeout);
        clearTimeout(connectedTimeout);
      };
    }
  }, [isVisible, callState, phoneNumber, callSid, service]);

  // Handle any side effects when call state changes
  useEffect(() => {
    // This effect can be used to handle any side effects when call state changes
  }, [callState]);

  // Don't render anything if not visible
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="bg-gray-900 rounded-3xl w-full max-w-md p-8 text-white shadow-xl"
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Close button */}
            {callState === 'ended' && (
              <button 
                onClick={onClose} 
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            )}
            
            {/* Call status and info */}
            <div className="text-center mb-8">
              <div className="text-xl font-semibold mb-1">{formatPhoneNumber(phoneNumber)}</div>
              
              <div className="text-gray-400 mb-2">
                {service && <span className="text-sm">via {service}</span>}
              </div>
              
              <div className="text-lg font-medium">
                {callState === 'dialing' && 'Dialing...'}
                {callState === 'connecting' && 'Connecting...'}
                {callState === 'connected' && 'In Call'}
                {callState === 'ended' && 'Call Ended'}
                {callState === 'failed' && 'Call Failed'}
              </div>
              
              {/* Call duration */}
              {(callState === 'connected' || callState === 'ended') && (
                <div className="text-xl font-mono mt-2">{formatDuration(duration)}</div>
              )}
              
              {/* Recording indicator */}
              {callState === 'connected' && isRecording && (
                <div className="mt-4 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-2"></div>
                  <span className="text-sm">Recording</span>
                </div>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Mute button */}
              <button 
                className={`flex flex-col items-center justify-center p-4 rounded-xl transition-colors ${
                  isMuted ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-700'
                }`}
                onClick={handleMuteToggle}
                disabled={callState !== 'connected'}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isMuted ? 'bg-red-600' : 'bg-gray-700'
                }`}>
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </div>
                <span className="mt-2 text-sm">{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
              
              {/* Hold button */}
              <button 
                className={`flex flex-col items-center justify-center p-4 rounded-xl transition-colors ${
                  isOnHold ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-700'
                }`}
                onClick={handleHoldToggle}
                disabled={callState !== 'connected'}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isOnHold ? 'bg-amber-600' : 'bg-gray-700'
                }`}>
                  {isOnHold ? <Play size={24} /> : <Pause size={24} />}
                </div>
                <span className="mt-2 text-sm">{isOnHold ? 'Resume' : 'Hold'}</span>
              </button>
              
              {/* Speaker button */}
              <button 
                className={`flex flex-col items-center justify-center p-4 rounded-xl transition-colors ${
                  isSpeakerOn ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-700'
                }`}
                onClick={handleSpeakerToggle}
                disabled={callState !== 'connected'}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isSpeakerOn ? 'bg-blue-600' : 'bg-gray-700'
                }`}>
                  {isSpeakerOn ? <Volume2 size={24} /> : <Volume size={24} />}
                </div>
                <span className="mt-2 text-sm">Speaker</span>
              </button>
            </div>
            
            {/* Primary action button */}
            <div className="flex justify-center">
              {callState === 'connected' || callState === 'connecting' || callState === 'dialing' ? (
                <button 
                  className="w-20 h-20 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                  onClick={handleHangup}
                >
                  <PhoneOff size={32} />
                </button>
              ) : (
                <button 
                  className="w-20 h-20 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                  onClick={handleRedial}
                >
                  <RefreshCw size={32} />
                </button>
              )}
            </div>
            
            {/* Call status */}
            {callState === 'ended' && (
              <div className="mt-6 text-center text-gray-400">
                Call ended after {formatDuration(duration)}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CallOverlay;