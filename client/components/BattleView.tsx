'use client';

import type { Placement } from '@/lib/fleet';
import { BOARD_SIZE } from '@/lib/fleet';
import type { ShotGrid } from '@/lib/battle';
import { boardFromPlacements } from '@/lib/placement';
import styles from './BattleView.module.css';

type BattleViewProps = {
  myPlacements: Placement[];
  shotsOnOpponent: ShotGrid;
  shotsReceived: ShotGrid;
  myTurn: boolean;
  onFire: (row: number, col: number) => void;
  gameOverResult?: 'win' | 'lose' | null;
};

export function BattleView({
  myPlacements,
  shotsOnOpponent,
  shotsReceived,
  myTurn,
  onFire,
  gameOverResult = null,
}: BattleViewProps) {
  const shipBoard = boardFromPlacements(myPlacements);
  const battleOver = gameOverResult !== null;

  return (
    <div className={styles.battle}>
      <p className={myTurn && !battleOver ? styles.statusYourTurn : styles.statusBar}>
        {battleOver
          ? gameOverResult === 'win'
            ? 'You sank their fleet!'
            : 'Your fleet was sunk.'
          : myTurn
            ? 'Your turn — click the enemy grid to fire'
            : "Opponent's turn…"}
      </p>

      {battleOver && (
        <p className={gameOverResult === 'win' ? styles.gameOverWin : styles.gameOverLose}>
          {gameOverResult === 'win' ? 'Victory' : 'Defeat'}
        </p>
      )}

      <div className={styles.boards}>
        <div className={styles.panel}>
          <h2 className={styles.title}>Your fleet</h2>
          <OwnBoard shipBoard={shipBoard} shotsReceived={shotsReceived} />
        </div>
        <div className={styles.panel}>
          <h2 className={styles.title}>Enemy waters</h2>
          <TargetBoard
            shots={shotsOnOpponent}
            canFire={myTurn && !battleOver}
            onFire={onFire}
          />
        </div>
      </div>
    </div>
  );
}

function OwnBoard({
  shipBoard,
  shotsReceived,
}: {
  shipBoard: (null | number)[][];
  shotsReceived: ShotGrid;
}) {
  const cells = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const shot = shotsReceived[row][col];
      const hasShip = shipBoard[row][col] !== null;
      let className = styles.cellWater;
      if (shot === 'hit') className = styles.cellHit;
      else if (shot === 'miss') className = styles.cellMiss;
      else if (hasShip) className = styles.cellShip;
      cells.push(<div key={`${row}-${col}`} className={className} />);
    }
  }
  return <div className={styles.grid}>{cells}</div>;
}

function TargetBoard({
  shots,
  canFire,
  onFire,
}: {
  shots: ShotGrid;
  canFire: boolean;
  onFire: (row: number, col: number) => void;
}) {
  const cells = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const shot = shots[row][col];
      const alreadyShot = shot !== null;
      let className = styles.cellTarget;
      if (shot === 'hit') className = styles.cellTargetHit;
      else if (shot === 'miss') className = styles.cellTargetMiss;
      cells.push(
        <button
          key={`${row}-${col}`}
          type="button"
          className={className}
          disabled={!canFire || alreadyShot}
          onClick={() => onFire(row, col)}
          aria-label={`Fire at ${row}, ${col}`}
        />
      );
    }
  }
  return <div className={styles.grid}>{cells}</div>;
}

