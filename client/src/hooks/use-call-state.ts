import { useState, useRef, useEffect } from 'react';
import { makeTestCall, getCallLogs, updateCallLog } from '@/lib/api';

export type CallStatus = 'idle' | 'dialing' | 'connecting' | 'connected' | 'ended' | 'failed';

interface CallState {
  status: CallStatus;
  phoneNumber: string;
  callSid?: string;
  service?: 'twilio' | 'sip' | 'openphone' | undefined;
  message?: string;
  error?: string;
}

interface UseCallStateReturn {
  callState: CallState;
  isCallActive: boolean;
  showCallUI: boolean;
  duration: number;
  initiateCall: (phoneNumber: string, message?: string, service?: 'twilio' | 'sip' | 'openphone' | undefined) => Promise<void>;
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
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const isCallActive = callState.status === 'dialing' || 
                       callState.status === 'connecting' || 
                       callState.status === 'connected';
                       
  // Update timer when call is connected
  useEffect(() => {
    if (callState.status === 'connected') {
      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else if (callState.status === 'ended' || callState.status === 'failed') {
      // Stop timer when call ends
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    // Cleanup timer on component unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [callState.status]);

  // Function to initiate a call
  const initiateCall = async (
    phoneNumber: string,
    message?: string,
    service?: 'twilio' | 'sip' | 'openphone'
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
        // Cast the service type to ensure compatibility
        const resultService = result.service as 'twilio' | 'sip' | 'openphone' | undefined;
        
        setCallState(prev => ({
          ...prev,
          status: 'connecting',
          callSid: result.callSid,
          service: resultService || service
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
    // Update call state
    setCallState(prev => ({
      ...prev,
      status: 'ended'
    }));
    
    // Update call log in the database
    if (callState.phoneNumber && callState.callSid) {
      // Find the call log entry and update its status
      getCallLogs(5).then(logs => {
        const ourCall = logs.find(log => log.callSid === callState.callSid);
        if (ourCall) {
          updateCallLog(ourCall.id, {
            status: 'ended',
            duration: duration
          }).catch(error => console.error('Failed to update call log:', error));
        }
      }).catch(error => console.error('Failed to fetch call logs:', error));
    }
    
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
      await initiateCall(
        callState.phoneNumber, 
        callState.message, 
        callState.service as 'twilio' | 'sip' | 'openphone' | undefined
      );
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
    duration,
    initiateCall,
    hangupCall,
    toggleMute,
    toggleHold,
    redial,
    toggleSpeaker,
    closeCallUI
  };
}