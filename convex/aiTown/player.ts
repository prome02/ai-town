import { Infer, ObjectType, v } from 'convex/values';
import { Point, Vector, point, vector } from '../util/types';
import { GameId, parseGameId } from './ids';
import { playerId } from './ids';
import {
  HUMAN_IDLE_TOO_LONG,
  MAX_HUMAN_PLAYERS,
} from '../constants';
import { Game } from './game';
import { inputHandler } from './inputHandler';
import { characters } from '../../data/characters';
import { PlayerDescription } from './playerDescription';

export const activity = v.object({
  description: v.string(),
  emoji: v.optional(v.string()),
  until: v.number(),
});
export type Activity = Infer<typeof activity>;

export const serializedPlayer = {
  id: playerId,
  human: v.optional(v.string()),
  activity: v.optional(activity),

  // The last time they did something.
  lastInput: v.number(),

  // Discrete location system
  currentLocationId: v.optional(v.string()),

  // Keep position and facing for display purposes
  position: point,
  facing: vector,
  speed: v.number(),
};
export type SerializedPlayer = ObjectType<typeof serializedPlayer>;

export class Player {
  id: GameId<'players'>;
  human?: string;
  activity?: Activity;

  lastInput: number;

  // Discrete location system
  currentLocationId?: string;

  position: Point;
  facing: Vector;
  speed: number;

  constructor(serialized: SerializedPlayer) {
    const { id, human, activity, lastInput, currentLocationId, position, facing, speed } = serialized;
    this.id = parseGameId('players', id);
    this.human = human;
    this.activity = activity;
    this.lastInput = lastInput;
    this.currentLocationId = currentLocationId;
    this.position = position;
    this.facing = facing;
    this.speed = speed;
  }

  tick(game: Game, now: number) {
    if (this.human && this.lastInput < now - HUMAN_IDLE_TOO_LONG) {
      this.leave(game, now);
    }
  }

  // Simplified: No pathfinding needed in discrete location system
  // Players are simply "at" a location, no continuous movement

  static join(
    game: Game,
    now: number,
    name: string,
    character: string,
    description: string,
    tokenIdentifier?: string,
  ) {
    if (tokenIdentifier) {
      let numHumans = 0;
      for (const player of game.world.players.values()) {
        if (player.human) {
          numHumans++;
        }
        if (player.human === tokenIdentifier) {
          throw new Error(`You are already in this game!`);
        }
      }
      if (numHumans >= MAX_HUMAN_PLAYERS) {
        throw new Error(`Only ${MAX_HUMAN_PLAYERS} human players allowed at once.`);
      }
    }

    // In discrete location system, new players start at town square
    const defaultLocationId = 'town_square';

    // Position is used for display only - set to center of map
    const position = {
      x: Math.floor(game.worldMap.width / 2),
      y: Math.floor(game.worldMap.height / 2),
    };

    const facingOptions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    const facing = facingOptions[Math.floor(Math.random() * facingOptions.length)];

    if (!characters.find((c) => c.name === character)) {
      throw new Error(`Invalid character: ${character}`);
    }

    const playerId = game.allocId('players');
    game.world.players.set(
      playerId,
      new Player({
        id: playerId,
        human: tokenIdentifier,
        lastInput: now,
        currentLocationId: defaultLocationId,
        position,
        facing,
        speed: 0,
      }),
    );
    game.playerDescriptions.set(
      playerId,
      new PlayerDescription({
        playerId,
        character,
        description,
        name,
      }),
    );
    game.descriptionsModified = true;
    return playerId;
  }

  leave(game: Game, now: number) {
    // Stop our conversation if we're leaving the game.
    const conversation = [...game.world.conversations.values()].find((c) =>
      c.participants.has(this.id),
    );
    if (conversation) {
      conversation.stop(game, now);
    }
    game.world.players.delete(this.id);
  }

  serialize(): SerializedPlayer {
    const { id, human, activity, lastInput, currentLocationId, position, facing, speed } = this;
    return {
      id,
      human,
      activity,
      lastInput,
      currentLocationId,
      position,
      facing,
      speed,
    };
  }
}

export const playerInputs = {
  join: inputHandler({
    args: {
      name: v.string(),
      character: v.string(),
      description: v.string(),
      tokenIdentifier: v.optional(v.string()),
    },
    handler: (game, now, args) => {
      Player.join(game, now, args.name, args.character, args.description, args.tokenIdentifier);
      return null;
    },
  }),
  leave: inputHandler({
    args: { playerId },
    handler: (game, now, args) => {
      const playerId = parseGameId('players', args.playerId);
      const player = game.world.players.get(playerId);
      if (!player) {
        throw new Error(`Invalid player ID ${playerId}`);
      }
      player.leave(game, now);
      return null;
    },
  }),
  moveToLocation: inputHandler({
    args: {
      playerId,
      locationId: v.string(),
    },
    handler: (game, now, args) => {
      const playerId = parseGameId('players', args.playerId);
      const player = game.world.players.get(playerId);
      if (!player) {
        throw new Error(`Invalid player ID ${playerId}`);
      }

      // Simplified: Just update the current location
      // In the future, could add validation to check if location exists
      player.currentLocationId = args.locationId;
      player.lastInput = now;

      return null;
    },
  }),
};
