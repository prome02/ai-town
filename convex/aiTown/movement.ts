// Simplified movement system for discrete locations
// Players no longer use pathfinding - they simply "are at" a location

import { Point } from '../util/types';
import { Game } from './game';
import { Player } from './player';

/**
 * In the discrete location system, "stopping" a player is a no-op
 * since players don't continuously move.
 */
export function stopPlayer(player: Player) {
  // No-op in discrete location system
  player.speed = 0;
}

/**
 * Legacy function kept for backwards compatibility with agent code.
 * In discrete system, this is essentially a no-op as agents should use
 * the location system instead.
 * @deprecated Use player.currentLocationId instead
 */
export function movePlayer(
  game: Game,
  now: number,
  player: Player,
  destination: Point,
  allowInConversation?: boolean,
) {
  // In discrete location system, point-based movement is deprecated
  // This is kept for backwards compatibility but does nothing meaningful
  console.warn(`movePlayer() is deprecated in discrete location system. Use moveToLocation instead.`);

  // Don't allow players in a conversation to move.
  const inConversation = [...game.world.conversations.values()].some(
    (c) => c.participants.get(player.id)?.status.kind === 'participating',
  );
  if (inConversation && !allowInConversation) {
    throw new Error(`Can't move when in a conversation. Leave the conversation first!`);
  }

  // Update position for display purposes only
  player.position = destination;
  player.lastInput = now;
}
