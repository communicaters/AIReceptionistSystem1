import React, { createContext, useContext, ReactNode } from 'react';
import { useCallState } from '@/hooks/use-call-state';
import CallOverlay from '@/components/voice/call-overlay';

// Create context
type CallContextType = ReturnType<typeof useCallState>;

const CallContext = createContext<CallContextType | undefined>(undefined);

// Provider component
interface CallProviderProps {
  children: ReactNode;
}

export const CallProvider: React.FC<CallProviderProps> = ({ children }) => {
  const callState = useCallState();
  
  return (
    <CallContext.Provider value={callState}>
      {children}
      
      {/* Render the call overlay */}
      <CallOverlay 
        isVisible={callState.showCallUI}
        phoneNumber={callState.callState.phoneNumber}
        callSid={callState.callState.callSid}
        service={callState.callState.service}
        onHangup={callState.hangupCall}
        onMute={callState.toggleMute}
        onHold={callState.toggleHold}
        onRedial={callState.redial}
        onSpeaker={callState.toggleSpeaker}
        onClose={callState.closeCallUI}
      />
    </CallContext.Provider>
  );
};

// Hook for consuming the context
export function useCall(): CallContextType {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}