import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import InteractButton from './buttons/InteractButton';
import { useServerGame } from '../hooks/serverGame';

export function LocationPrototype() {
  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const game = useServerGame(worldId);
  const locations = useQuery(api.testing.getTestLocations);
  const players = useQuery(api.testing.getPlayersWithLocations);
  const humanTokenIdentifier = useQuery(api.world.userStatus, worldId ? { worldId } : 'skip');
  const userPlayerId =
    game && [...game.world.players.values()].find((p) => p.human === humanTokenIdentifier)?.id;
  const isPlaying = !!userPlayerId;

  if (!locations || !players) {
    return <div style={{ padding: '20px' }}>Loading prototype...</div>;
  }

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'monospace',
        backgroundColor: '#1a1a1a',
        minHeight: '100vh',
        color: '#fff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1>🎬 Location System Prototype</h1>
          <p style={{ color: '#888' }}>監視器UI原型 - 獨立於主遊戲</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isPlaying && (
            <span style={{ color: '#0f0', fontSize: '14px' }}>
              ✓ 已加入遊戲 (Player ID: {userPlayerId})
            </span>
          )}
          <InteractButton />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '20px',
          marginTop: '40px',
          flexWrap: 'wrap',
        }}
      >
        {locations.map((loc: any) => (
          <LocationBox
            key={loc.locationId}
            location={loc}
            players={players.filter((p: any) => p.currentLocation === loc.locationId)}
          />
        ))}
      </div>

      <div
        style={{
          marginTop: '60px',
          padding: '20px',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
        }}
      >
        <h3>🐛 Debug Info</h3>

        {/* 遊戲狀態 */}
        <details open>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
            遊戲狀態
          </summary>
          <div style={{ marginLeft: '20px', fontSize: '13px', color: '#ddd' }}>
            <p>World ID: {worldId || 'Loading...'}</p>
            <p>已加入遊戲: {isPlaying ? '是' : '否'}</p>
            {isPlaying && <p>Player ID: {userPlayerId}</p>}
            <p>地點數量: {locations.length}</p>
            <p>角色數量: {players.length}</p>
          </div>
        </details>

        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>
            Locations Data
          </summary>
          <pre style={{ fontSize: '11px', overflow: 'auto' }}>
            {JSON.stringify(locations, null, 2)}
          </pre>
        </details>
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>
            Players Data
          </summary>
          <pre style={{ fontSize: '11px', overflow: 'auto' }}>
            {JSON.stringify(players, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

function LocationBox({ location, players }: any) {
  return (
    <div
      style={{
        border: '2px solid #444',
        borderRadius: '8px',
        padding: '20px',
        minWidth: '250px',
        backgroundColor: '#2a2a2a',
        position: 'relative',
      }}
    >
      {/* 地點標題 */}
      <div
        style={{
          fontSize: '20px',
          fontWeight: 'bold',
          marginBottom: '10px',
        }}
      >
        {location.name}
      </div>

      {/* 地點ID */}
      <div
        style={{
          fontSize: '11px',
          color: '#666',
          marginBottom: '15px',
        }}
      >
        ID: {location.locationId} | Type: {location.type}
      </div>

      {/* 監視器指示 */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          fontSize: '20px',
        }}
      >
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
          Characters ({players.length}/{location.capacity || '∞'}):
        </div>
        {players.length === 0 ? (
          <div style={{ color: '#555', fontSize: '14px' }}>Empty room</div>
        ) : (
          players.map((p: any) => (
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
        🚪 Connected to: {location.connectedTo.join(', ')}
      </div>
    </div>
  );
}
