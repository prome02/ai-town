import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { LocationSidebar } from './LocationSidebar';
import { LocationPrototype } from './LocationPrototype';
import InteractButton from './buttons/InteractButton';
import { useServerGame } from '../hooks/serverGame';

/**
 * HotelGame - 完整的旅館監視器遊戲 UI (Day 10-11 MVP)
 *
 * 整合了:
 * - LocationSidebar: 地點導航
 * - LocationPrototype: 監視器網格 (重用現有組件)
 * - ConversationPanel: 對話面板 (可選)
 * - InteractButton: 加入/離開遊戲
 */
export function HotelGame() {
  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const game = useServerGame(worldId);
  const locations = useQuery(api.testing.getTestLocations);
  const players = useQuery(api.testing.getPlayersWithLocations);
  const humanTokenIdentifier = useQuery(api.world.userStatus, worldId ? { worldId } : 'skip');
  const userPlayerId =
    game && [...game.world.players.values()].find((p) => p.human === humanTokenIdentifier)?.id;

  const [focusedLocation, setFocusedLocation] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const isPlaying = !!userPlayerId;

  if (!locations || !players) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#0a0a0a',
          color: '#0f0',
          fontFamily: 'monospace',
          fontSize: '18px',
        }}
      >
        ⏳ Loading Hotel Surveillance System...
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#0a0a0a',
        fontFamily: 'monospace',
      }}
    >
      {/* 左側：地點導航 (可隱藏) */}
      {showSidebar && (
        <LocationSidebar
          locations={locations}
          players={players}
          conversations={[]}
          onLocationClick={setFocusedLocation}
          focusedLocation={focusedLocation}
        />
      )}

      {/* 主要內容區 */}
      <div
        style={{
          flex: 1,
          marginLeft: showSidebar ? '250px' : '0',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* 頂部控制欄 */}
        <div
          style={{
            padding: '15px 20px',
            backgroundColor: '#000',
            borderBottom: '2px solid #0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#0f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* 側邊欄切換按鈕 */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              style={{
                background: 'none',
                border: '1px solid #0f0',
                color: '#0f0',
                cursor: 'pointer',
                padding: '5px 10px',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            >
              {showSidebar ? '◀ Hide' : '▶ Show'} Sidebar
            </button>

            <div>
              <h1 style={{ fontSize: '24px', margin: 0 }}>
                🎬 HOTEL SURVEILLANCE SYSTEM
              </h1>
              <p style={{ fontSize: '12px', margin: '5px 0 0', color: '#0a0' }}>
                監視器風格旅館觀察遊戲
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {isPlaying && (
              <span style={{ color: '#0f0', fontSize: '13px' }}>
                ✓ 已加入 (ID: {userPlayerId})
              </span>
            )}
            <InteractButton />
          </div>
        </div>

        {/* 監視器網格區域 */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0',
          }}
        >
          {/* 重用 LocationPrototype 組件的內容 */}
          <div
            style={{
              padding: '20px',
              fontFamily: 'monospace',
              backgroundColor: '#1a1a1a',
              minHeight: '100%',
              color: '#fff',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px',
                marginTop: '20px',
              }}
            >
              {locations.map((loc: any) => {
                const playersHere = players.filter((p: any) => p.currentLocation === loc.locationId);
                const isFocused = focusedLocation === loc.locationId;

                return (
                  <div
                    key={loc.locationId}
                    style={{
                      border: `2px solid ${isFocused ? '#0f0' : '#444'}`,
                      borderRadius: '8px',
                      padding: '20px',
                      minWidth: '300px',
                      backgroundColor: isFocused ? '#2a3a2a' : '#2a2a2a',
                      position: 'relative',
                      transition: 'all 0.3s',
                    }}
                  >
                    {/* 地點標題 */}
                    <div
                      style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        marginBottom: '10px',
                        color: isFocused ? '#0f0' : '#fff',
                      }}
                    >
                      {loc.name}
                    </div>

                    {/* 地點ID */}
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '15px' }}>
                      ID: {loc.locationId} | Type: {loc.type}
                    </div>

                    {/* 監視器指示 */}
                    <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '20px' }}>
                      📷
                    </div>

                    {/* 角色列表 */}
                    <div
                      style={{
                        marginTop: '20px',
                        padding: '10px',
                        backgroundColor: '#1a1a1a',
                        borderRadius: '4px',
                        minHeight: '60px',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                        Characters ({playersHere.length}/{loc.capacity || '∞'}):
                      </div>
                      {playersHere.length === 0 ? (
                        <div style={{ color: '#555', fontSize: '14px' }}>Empty room</div>
                      ) : (
                        playersHere.map((p: any) => (
                          <div
                            key={p.id}
                            style={{
                              margin: '5px 0',
                              padding: '8px',
                              backgroundColor: '#333',
                              borderRadius: '4px',
                              fontSize: '14px',
                            }}
                          >
                            👤 {p.name}
                            {p.targetLocation && (
                              <span style={{ color: '#888', fontSize: '11px' }}>
                                {' '}
                                → {p.targetLocation}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* 連接信息 */}
                    <div
                      style={{
                        marginTop: '15px',
                        fontSize: '11px',
                        color: '#666',
                        borderTop: '1px solid #444',
                        paddingTop: '10px',
                      }}
                    >
                      🚪 Connected to: {loc.connectedTo?.join(', ') || 'None'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 底部狀態欄 */}
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: '#000',
            borderTop: '1px solid #0f0',
            color: '#0a0',
            fontSize: '11px',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <div>
            📡 System Online | Locations: {locations.length} | Guests: {players.length}
          </div>
          <div>{new Date().toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
