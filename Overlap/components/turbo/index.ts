// components/turbo/index.ts
export { default as TurboModeScreen } from './TurboModeScreen';
export { default as TurboLobby } from './TurboLobby';
export { default as TurboBriefing } from './TurboBriefing';
export { default as TurboSprint } from './TurboSprint';
export { default as TurboDeathmatch } from './TurboDeathmatch';
export { default as TurboResults } from './TurboResults';

// Re-export storage functions for convenience
export {
  initializeTurboSession,
  joinTurboSession,
  startTurboBriefing,
  startTurboSprint,
  recordTurboSwipe,
  voteTurboDeathmatch,
  endTurboDeathmatch,
  subscribeTurboSession,
  getMinSwipesForGroupSize,
  getDeathmatchDuration,
} from '../../_utils/storage/turboMeetup';

// Types for TypeScript consumers
export interface TurboSession {
  state: 'lobby' | 'briefing' | 'sprint' | 'deathmatch' | 'results';
  createdBy: string;
  createdAt: any;
  groupSize: number;
  minSwipesPerPerson: number;
  deathmatchDuration: number;
  members: Record<string, TurboMember>;
  sprint?: TurboSprint;
  deathmatch?: TurboDeathmatch;
  result?: TurboResult;
  top2?: TurboActivity[];
}

export interface TurboMember {
  uid: string;
  joinedAt: any;
  swipes: number;
  active: boolean;
  displayName?: string;
  avatarUrl?: string;
}

export interface TurboSprint {
  startedAt: any;
  endsAt: any;
  benchmarkHit: boolean;
}

export interface TurboDeathmatch {
  startedAt: any;
  endsAt: any;
  votesA: number;
  votesB: number;
  voters: Record<string, 'A' | 'B'>;
}

export interface TurboResult {
  winner: 'A' | 'B';
  winningActivity: TurboActivity;
  votesA: number;
  votesB: number;
  completedAt: any;
  decidedBy?: 'vote' | 'host' | 'timeout';
}

export interface TurboActivity {
  activityId: string;
  name: string;
  rating?: number;
  photoUrls?: string[];
  address?: string;
  category?: string;
  priceLevel?: number;
  yesCount?: number;
  noCount?: number;
  totalVotes?: number;
  approvalRating?: number;
}

// Utility type guards
export const isTurboSession = (data: any): data is TurboSession => {
  return data && typeof data.state === 'string' && data.members && data.groupSize;
};

export const isTurboMember = (data: any): data is TurboMember => {
  return data && typeof data.uid === 'string' && typeof data.swipes === 'number';
};