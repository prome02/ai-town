import { Messages } from './Messages';
import { Id } from '../../convex/_generated/dataModel';
import { useRef } from 'react';

interface ConversationPanelProps {
  worldId: Id<'worlds'>;
  engineId: Id<'engines'>;
  conversation: any;
  inConversationWithMe: boolean;
  humanPlayer?: any;
  onClose: () => void;
}

export function ConversationPanel({
  worldId,
  engineId,
  conversation,
  inConversationWithMe,
  humanPlayer,
  onClose,
}: ConversationPanelProps) {
  const scrollViewRef = useRef<HTMLDivElement>(null);

  return (
    <div
      style={{
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        width: '400px',
        maxHeight: '500px',
        backgroundColor: '#1a1a1a',
        border: '2px solid #0f0',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,255,0,0.3)',
        fontFamily: 'monospace',
        zIndex: 100,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 15px',
          backgroundColor: '#000',
          color: '#0f0',
          fontSize: '12px',
          borderBottom: '1px solid #0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>📡 CONVERSATION MONITOR</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: '1px solid #0f0',
            color: '#0f0',
            cursor: 'pointer',
            padding: '2px 8px',
            fontSize: '11px',
          }}
        >
          ✕ CLOSE
        </button>
      </div>

      {/* Messages Container */}
      <div
        ref={scrollViewRef}
        style={{
          padding: '15px',
          maxHeight: '400px',
          overflowY: 'auto',
          color: '#fff',
          fontSize: '13px',
        }}
      >
        <Messages
          worldId={worldId}
          engineId={engineId}
          conversation={conversation}
          inConversationWithMe={inConversationWithMe}
          humanPlayer={humanPlayer}
          scrollViewRef={scrollViewRef}
        />
      </div>
    </div>
  );
}
