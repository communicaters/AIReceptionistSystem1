import { useState } from 'react';
import { makeTestCall } from '@/lib/api';

export type CallStatus = 'idle' | 'dialing' | 'connecting' | 'connected' | 'ended' | 'failed';

interface CallState {
  status: CallStatus;
  phoneNumber: string;
  callSid?: string;
  service?: 'twilio' | 'sip' | 'openphone' | null;
  message?: string;
  error?: string;
}

interface UseCallStateReturn {
  callState: CallState;
  isCallActive: boolean;
  showCallUI: boolean;
  initiateCall: (phoneNumber: string, message?: string, service?: 'twilio' | 'sip' | 'openphone' | null) => Promise<void>;
  hangupCall: () => void;
  toggleMute: (muted: boolean) => void;
  toggleHold: (held: boolean) => void;
  redial: () => Promise<void>;
  toggleSpeaker: (speakerOn: boolean) => void;
  closeCallUI: () => void;
}

export function useCallState(): UseCallStateReturn {
  const [callState, setCallState] = useState<CallState>({
    status: 'idle',
    phoneNumber: '',
  });
  
  const [showCallUI, setShowCallUI] = useState(false);
  
  const isCallActive = callState.status === 'dialing' || 
                       callState.status === 'connecting' || 
                       callState.status === 'connected';

  // Function to initiate a call
  const initiateCall = async (
    phoneNumber: string,
    message?: string,
    service?: 'twilio' | 'sip' | 'openphone' | null
  ) => {
    try {
      setCallState({
        status: 'dialing',
        phoneNumber,
        message,
        service
      });
      setShowCallUI(true);
      
      const result = await makeTestCall(phoneNumber, message, service);
      
      if (result.success) {
        setCallState(prev => ({
          ...prev,
          status: 'connecting',
          callSid: result.callSid,
          service: result.service || service
        }));
        
        // In a real implementation, we would listen for call events
        // and update the status accordingly
        
        // For demo purposes, simulate connecting
        setTimeout(() => {
          setCallState(prev => ({
            ...prev,
            status: 'connected'
          }));
        }, 3000);
      } else {
        setCallState(prev => ({
          ...prev,
          status: 'failed',
          error: result.error
        }));
      }
    } catch (error) {
      setCallState(prev => ({
        ...prev,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  // Function to hang up a call
  const hangupCall = () => {
    // In a real implementation, would call an API to terminate the call
    setCallState(prev => ({
      ...prev,
      status: 'ended'
    }));
    
    // Simulate a delay before closing the UI
    setTimeout(() => {
      setShowCallUI(false);
      setCallState({
        status: 'idle',
        phoneNumber: '',
      });
    }, 3000);
  };

  // Function to toggle mute
  const toggleMute = (muted: boolean) => {
    // In a real implementation, would call an API to mute/unmute
    console.log(`Call ${muted ? 'muted' : 'unmuted'}`);
  };

  // Function to toggle hold
  const toggleHold = (held: boolean) => {
    // In a real implementation, would call an API to hold/resume
    console.log(`Call ${held ? 'held' : 'resumed'}`);
  };

  // Function to redial
  const redial = async () => {
    // Reuse the previous call settings
    if (callState.phoneNumber) {
      await initiateCall(callState.phoneNumber, callState.message, 
        callState.service as 'twilio' | 'sip' | 'openphone' | null | undefined);
    }
  };

  // Function to toggle speaker
  const toggleSpeaker = (speakerOn: boolean) => {
    // In a real implementation, would toggle speaker mode
    console.log(`Speaker ${speakerOn ? 'on' : 'off'}`);
  };

  // Function to close the call UI
  const closeCallUI = () => {
    setShowCallUI(false);
    setCallState({
      status: 'idle',
      phoneNumber: '',
    });
  };

  return {
    callState,
    isCallActive,
    showCallUI,
    initiateCall,
    hangupCall,
    toggleMute,
    toggleHold,
    redial,
    toggleSpeaker,
    closeCallUI
  };
}