interface LocationSidebarProps {
  locations: any[];
  players: any[];
  conversations: any[];
  onLocationClick: (locationId: string) => void;
  focusedLocation: string | null;
}

export function LocationSidebar({
  locations,
  players,
  conversations = [],
  onLocationClick,
  focusedLocation,
}: LocationSidebarProps) {
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: '250px',
        backgroundColor: '#0a0a0a',
        borderRight: '2px solid #0f0',
        padding: '20px',
        overflowY: 'auto',
        fontFamily: 'monospace',
        color: '#0f0',
        zIndex: 10,
      }}
    >
      <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 'bold' }}>
        📍 HOTEL LOCATIONS
      </h3>

      {locations.map((loc: any) => {
        const playersHere = players.filter((p: any) => p.currentLocation === loc.locationId);
        const hasConversation = conversations.some((c: any) =>
          c.participants?.some((pid: string) => playersHere.find((p: any) => p.id === pid))
        );

        const isFocused = focusedLocation === loc.locationId;

        return (
          <div
            key={loc.locationId}
            onClick={() => onLocationClick(loc.locationId)}
            style={{
              padding: '12px',
              margin: '8px 0',
              backgroundColor: isFocused ? '#1a3a1a' : '#1a1a1a',
              border: `1px solid ${isFocused ? '#0f0' : '#0a0'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!isFocused) {
                e.currentTarget.style.backgroundColor = '#151515';
              }
            }}
            onMouseLeave={(e) => {
              if (!isFocused) {
                e.currentTarget.style.backgroundColor = '#1a1a1a';
              }
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
              {loc.name}
              {hasConversation && ' 💬'}
              {isFocused && ' 👁️'}
            </div>

            <div style={{ fontSize: '11px', color: '#0a0', marginBottom: '4px' }}>
              Type: {loc.type === 'room' ? '🏠 Room' : '🏛️ Public'}
            </div>

            <div style={{ fontSize: '11px', color: '#0a0' }}>
              {playersHere.length > 0 ? (
                <>
                  👥 {playersHere.length} guest{playersHere.length > 1 ? 's' : ''}
                  <div style={{ marginTop: '4px', fontSize: '10px' }}>
                    {playersHere.map((p: any) => p.name).join(', ')}
                  </div>
                </>
              ) : (
                '⚪ Empty'
              )}
            </div>
          </div>
        );
      })}

      <div
        style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #0a0',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#0a0',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>📊 STATS</div>
        <div>Total Locations: {locations.length}</div>
        <div>Total Guests: {players.length}</div>
        <div>Active Conversations: {conversations.length}</div>
      </div>
    </div>
  );
}
