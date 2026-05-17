export const BOARD_SIZE = 10;

export const FLEET_LENGTHS = [2] as const;

export type Placement = {
  length: number;
  row: number;
  col: number;
  horizontal: boolean;
};

export type Ship = Placement & { id: number };
