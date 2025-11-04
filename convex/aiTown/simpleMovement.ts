import { Player } from './player';

// 檢查兩個地點是否連通
export function isConnected(
  fromLocationId: string,
  toLocationId: string,
  locations: Map<string, any>,
): boolean {
  // 如果是同一個地點,視為連通
  if (fromLocationId === toLocationId) return true;

  const fromLoc = locations.get(fromLocationId);
  if (!fromLoc) return false;

  return fromLoc.connectedTo.includes(toLocationId);
}

// 計算移動時間（可以根據地點類型調整）
export function calculateTravelTime(fromLocationId: string, toLocationId: string): number {
  // 簡單實現：固定5秒
  if (fromLocationId === toLocationId) return 0;
  return 5000;

  // 進階版可以根據地點距離調整
  // return Math.random() * 3000 + 3000; // 3-6秒
}

// Tick 函數：檢查移動是否完成
export function tickTravel(player: Player, now: number): boolean {
  if (!player.targetLocation) return false;
  if (!player.travelStarted) return false;
  if (!player.travelDuration) return false;

  const elapsed = now - player.travelStarted;

  if (elapsed >= player.travelDuration) {
    // 到達目的地
    console.log(
      `Player ${player.id} arrived at ${player.targetLocation} (from ${player.currentLocation})`,
    );
    player.currentLocation = player.targetLocation;
    player.targetLocation = undefined;
    player.travelStarted = undefined;
    player.travelDuration = undefined;
    return true; // 表示完成移動
  }

  return false; // 還在移動中
}

// 開始移動到新地點
export function startTravel(
  player: Player,
  toLocationId: string,
  locations: Map<string, any>,
  now: number,
): { success: boolean; reason?: string } {
  // 檢查是否已經在該地點
  if (player.currentLocation === toLocationId) {
    return { success: false, reason: 'Already at this location' };
  }

  // 檢查連通性
  const fromLocation = player.currentLocation || 'lobby'; // 默認從大廳開始
  if (!isConnected(fromLocation, toLocationId, locations)) {
    return { success: false, reason: 'Location not connected' };
  }

  // 開始移動
  player.targetLocation = toLocationId;
  player.travelStarted = now;
  player.travelDuration = calculateTravelTime(fromLocation, toLocationId);

  console.log(
    `Player ${player.id} starting travel from ${fromLocation} to ${toLocationId} (${player.travelDuration}ms)`,
  );

  return { success: true };
}
