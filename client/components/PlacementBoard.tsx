'use client';

import { useMemo, useState } from 'react';
import type { Placement } from '@/lib/fleet';
import { FLEET_LENGTHS } from '@/lib/fleet';
import {
  boardFromPlacements,
  canPlaceAt,
  isFleetComplete,
  previewCells,
  remainingShipLengths,
} from '@/lib/placement';
import styles from './PlacementBoard.module.css';

type PlacementBoardProps = {
  onSubmit: (placements: Placement[]) => void;
  disabled?: boolean;
};

export function PlacementBoard({ onSubmit, disabled }: PlacementBoardProps) {
  const [horizontal, setHorizontal] = useState(true);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedLength, setSelectedLength] = useState<number | null>(
    FLEET_LENGTHS[0]
  );
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const remaining = useMemo(
    () => remainingShipLengths(placements),
    [placements]
  );

  const board = useMemo(() => boardFromPlacements(placements), [placements]);

  const preview = useMemo(() => {
    if (!hover || selectedLength === null || disabled) return null;
    const valid = canPlaceAt(
      placements,
      selectedLength,
      hover.row,
      hover.col,
      horizontal
    );
    return {
      cells: previewCells(selectedLength, hover.row, hover.col, horizontal),
      valid,
    };
  }, [hover, selectedLength, horizontal, placements, disabled]);

  const previewSet = useMemo(() => {
    const set = new Set<string>();
    preview?.cells.forEach(({ row, col }) => set.add(`${row},${col}`));
    return set;
  }, [preview]);

  const placeAt = (row: number, col: number) => {
    if (disabled || selectedLength === null) return;
    setLocalError(null);

    if (!remaining.includes(selectedLength)) {
      setLocalError('That ship is already placed');
      return;
    }

    if (!canPlaceAt(placements, selectedLength, row, col, horizontal)) {
      setLocalError('Cannot place ship here');
      return;
    }

    const next = [
      ...placements,
      { length: selectedLength, row, col, horizontal },
    ];
    setPlacements(next);
    const nextRemaining = remainingShipLengths(next);
    setSelectedLength(nextRemaining[0] ?? null);
  };

  const reset = () => {
    setPlacements([]);
    setSelectedLength(FLEET_LENGTHS[0]);
    setLocalError(null);
    setHover(null);
  };

  const submit = () => {
    if (!isFleetComplete(placements)) {
      setLocalError('Place all ships before submitting');
      return;
    }
    setLocalError(null);
    onSubmit(placements);
  };

  const cells = [];
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const key = `${row},${col}`;
      const isPreview = previewSet.has(key);
      const hasShip = board[row][col] !== null;

      let className = styles.cellWater;
      if (hasShip) className = styles.cellShip;
      else if (isPreview && preview) {
        className = preview.valid ? styles.cellPreviewOk : styles.cellPreviewBad;
      }

      cells.push(
        <button
          key={key}
          type="button"
          className={className}
          disabled={disabled}
          onMouseEnter={() => setHover({ row, col })}
          onMouseLeave={() => setHover(null)}
          onClick={() => placeAt(row, col)}
          aria-label={`Cell ${row}, ${col}`}
        />
      );
    }
  }

  return (
    <div className={styles.wrapper}>
      <p className={styles.hint}>
        Select a ship, toggle orientation, then click the grid for the{' '}
        <strong>first cell</strong> of the ship.
      </p>

      <div className={styles.toolbar}>
        {remaining.map((length, index) => {
          const isSelected = selectedLength === length;
          return (
            <button
              key={`ship-${index}-${length}`}
              type="button"
              className={
                isSelected ? `${styles.shipBtn} ${styles.shipBtnSelected}` : styles.shipBtn
              }
              disabled={disabled}
              onClick={() => setSelectedLength(length)}
            >
              {length}
            </button>
          );
        })}
        <span className={styles.hint}>
          {placements.length}/{FLEET_LENGTHS.length} placed
        </span>
        <button
          type="button"
          className={styles.toggleBtn}
          disabled={disabled}
          onClick={() => setHorizontal((h) => !h)}
        >
          {horizontal ? 'Horizontal ↔' : 'Vertical ↕'}
        </button>
        <button type="button" className={styles.actionBtn} disabled={disabled} onClick={reset}>
          Reset
        </button>
        <button
          type="button"
          className={styles.actionBtnPrimary}
          disabled={disabled || !isFleetComplete(placements)}
          onClick={submit}
        >
          Submit fleet
        </button>
      </div>

      <div
        className={styles.grid}
        onMouseLeave={() => setHover(null)}
      >
        {cells}
      </div>

      {localError && <p className={styles.localError}>{localError}</p>}
    </div>
  );
}
