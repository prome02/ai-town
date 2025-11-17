import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { GameId } from '../../convex/aiTown/ids';

// Location icons mapping
const locationIcons: Record<string, string> = {
  'town_square': '🏛️',
  'cafe': '☕',
  'library': '📚',
  'park': '🌳',
  'office': '💼',
  'market': '🛒',
  'garden': '🌺',
  'community_center': '🏘️',
};

// Location type colors
const locationTypeColors: Record<string, string> = {
  'social': 'bg-blue-600',
  'work': 'bg-amber-600',
  'leisure': 'bg-green-600',
  'public': 'bg-purple-600',
};

interface LocationSelectorProps {
  worldId: Id<'worlds'>;
  engineId: Id<'engines'>;
  currentPlayerId?: GameId<'players'>;
  currentLocationId?: string;
}

export default function LocationSelector({
  worldId,
  engineId,
  currentPlayerId,
  currentLocationId,
}: LocationSelectorProps) {
  const locations = useQuery(api.world.worldLocations, { worldId });
  const sendInput = useMutation(api.world.sendWorldInput);

  const handleLocationClick = async (locationId: string) => {
    if (!currentPlayerId) {
      console.warn('No player selected');
      return;
    }

    if (locationId === currentLocationId) {
      return; // Already at this location
    }

    try {
      await sendInput({
        engineId,
        name: 'moveToLocation',
        args: {
          playerId: currentPlayerId,
          locationId,
        },
      });
    } catch (error) {
      console.error('Failed to move to location:', error);
    }
  };

  if (!locations || locations.length === 0) {
    return (
      <div className="p-4 text-brown-300">
        <p className="text-sm">位置加載中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      <h3 className="text-xl font-bold mb-2 text-brown-100">📍 可用位置</h3>

      <div className="space-y-1">
        {locations.map((location) => {
          const isCurrentLocation = location.locationId === currentLocationId;
          const icon = locationIcons[location.locationId] || '📍';
          const typeColor = locationTypeColors[location.type] || 'bg-gray-600';

          return (
            <button
              key={location._id}
              onClick={() => handleLocationClick(location.locationId)}
              disabled={!currentPlayerId || isCurrentLocation}
              className={`
                w-full p-3 rounded-lg text-left transition-all
                ${
                  isCurrentLocation
                    ? 'bg-brown-600 border-2 border-brown-400 cursor-default'
                    : 'bg-brown-700 hover:bg-brown-600 border-2 border-transparent cursor-pointer'
                }
                ${!currentPlayerId ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1">
                  <span className="text-2xl">{icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-brown-100 flex items-center gap-2">
                      {location.name}
                      {isCurrentLocation && (
                        <span className="text-xs bg-amber-500 text-brown-900 px-2 py-0.5 rounded-full font-bold">
                          當前
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-brown-300 mt-0.5">
                      {location.description}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-1 ml-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full text-white ${typeColor}`}
                  >
                    {location.type}
                  </span>
                  <span className="text-sm text-brown-300">
                    👥 {location.playerCount}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {!currentPlayerId && (
        <div className="mt-3 p-3 bg-brown-700 rounded-lg border border-brown-600">
          <p className="text-sm text-brown-300 text-center">
            💡 點擊「Interact」加入遊戲以使用位置系統
          </p>
        </div>
      )}
    </div>
  );
}
