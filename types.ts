
export enum AppRole {
  HOST = 'HOST',
  ADMIN = 'ADMIN',
  PLAYER = 'PLAYER'
}

export interface Question {
  q: string;
  a: string;
}

export interface PlayerState {
  id: string;
  index: number;
  score: number;
  currentAnswer: string;
  isCorrect: boolean | null;
  isAppealing: boolean;
  isSubmitted: boolean;
  isWriting?: boolean; // 新增：正在書寫中
}

export type PeerMessage = 
  | { type: 'ROLE_IDENTIFY', role: AppRole, playerIndex?: number }
  | { type: 'NEXT_QUESTION', question: Question, questionIndex: number }
  | { type: 'DRAW_POINT', x: number, y: number, isNewPath: boolean, playerIndex: number }
  | { type: 'IS_WRITING', writing: boolean, playerIndex: number } // 新增：傳遞書寫狀態
  | { type: 'CLEAR_CANVAS', playerIndex: number }
  | { type: 'SUBMIT_ANSWER', answer: string, playerIndex: number }
  | { type: 'APPEAL', playerIndex: number }
  | { type: 'OVERRIDE_SCORE', playerIndex: number, isCorrect: boolean }
  | { type: 'SYNC_STATE', state: any };

export interface Point {
  x: number;
  y: number;
  isNewPath: boolean;
}
