const rows = 5, cols = 20;
let selectedPiece = null;
const grid = document.getElementById('grid');
let moveHistory = [];

// Add at the top with other constants
let currentPlayer = 'player1';

// Utility functions
function createPiece(playerClass) {
  const piece = document.createElement('div');
  piece.className = `piece ${playerClass}`;
  return piece;
}

function isValidCell(row, col) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

function getCell(row, col) {
  return document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

function updateTurnDisplay() {
  const turnDisplay = document.getElementById('turn-display');
  turnDisplay.textContent = `${currentPlayer === 'player1' ? 'Player 1' : 'Player 2'}'s Turn`;
  turnDisplay.className = `turn-display ${currentPlayer}`;
}

function clearSelection() {
  document.querySelectorAll('.valid-move').forEach(c => c.classList.remove('valid-move'));
  document.querySelectorAll('.jump-number').forEach(n => n.remove());
  if (selectedPiece) {
    selectedPiece.element.classList.remove('selected', 'selected-piece');
    selectedPiece = null;
  }
}

// Initialize board
function createBoard() {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = row;
      cell.dataset.col = col;

      // Add starting pieces
      if (col < 2 && row * 2 + col < 10) {  // Player 1 (left)
        const piece = createPiece('player1');
        cell.appendChild(piece);
      }
      if (col >= cols - 2 && (row * 2 + (cols - col - 1)) < 10) {  // Player 2 (right)
        const piece = createPiece('player2');
        cell.appendChild(piece);
      }

      cell.addEventListener('click', handleClick);
      grid.appendChild(cell);
    }
    // Add turn display
    const turnDisplay = document.createElement('div');
    turnDisplay.id = 'turn-display';
    document.body.insertBefore(turnDisplay, grid);

    // Existing board creation code...
    updateTurnDisplay(); // Initialize display
  }
}

function handleClick(e) {
  const cell = e.currentTarget;
  const piece = cell.querySelector('.piece');

  if (selectedPiece) {
    if (cell.classList.contains('valid-move')) {
      movePiece(selectedPiece, cell);
      // basic way of saving and showing move history 
      const moveData = {
        player: currentPlayer,
        from: { row: parseInt(selectedPiece.row), col: parseInt(selectedPiece.col)},
        to: { row: parseInt(cell.dataset.row), col: parseInt(cell.dataset.col) },
        timestamp: new Date().toLocaleTimeString()
      };
      moveHistory.push(moveData);
      console.log(moveHistory)
      clearSelection();
      // Switch players after valid move
      currentPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
      updateTurnDisplay();
    } else {
      clearSelection();
    }
  } else if (piece) {
    if (!piece.classList.contains(currentPlayer)) return;
    selectedPiece = {
      element: piece,
      row: parseInt(cell.dataset.row),
      col: parseInt(cell.dataset.col)
    };
    // Add special class to selected piece
    piece.classList.add('selected', 'selected-piece');
    showValidMoves(cell);
  }
}

function isPathClear(startR, startC, endR, endC) {
  const dr = Math.sign(endR - startR);
  const dc = Math.sign(endC - startC);
  let r = startR + dr;
  let c = startC + dc;

  while (r !== endR || c !== endC) {
    const currentCell = getCell(r, c);
    // Allow jumped piece but block others
    if (currentCell !== getCell(startR + (endR - startR) / 2, startC + (endC - startC) / 2)) {
      if (currentCell.querySelector('.piece:not(.selected-piece)')) return false;
    }
    r += dr;
    c += dc;
  }
  return true;
}

function showValidMoves(fromCell) {
  const startRow = parseInt(fromCell.dataset.row);
  const startCol = parseInt(fromCell.dataset.col);
  const visited = new Map();
  const queue = [[startRow, startCol, 0]];

  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1]
  ];

  // Process jump moves first
  while (queue.length > 0) {
    const [row, col, jumps] = queue.shift();
    const key = `${row},${col}`;

    if (visited.has(key) && visited.get(key) <= jumps) continue;
    visited.set(key, jumps);

    for (const [dr, dc] of directions) {
      let step = 1;
      while (true) {
        const checkRow = row + dr * step;
        const checkCol = col + dc * step;

        if (!isValidCell(checkRow, checkCol)) break;
        // Add line here to exclude situation where checkRow, checkCol is the selected piece itself
        if (checkRow === startRow && checkCol === startCol) break;

        const checkCell = getCell(checkRow, checkCol);
        if (checkCell.querySelector('.piece')) {
          const jumpRow = row + dr * (step * 2);
          const jumpCol = col + dc * (step * 2);

          if (isValidCell(jumpRow, jumpCol) &&
            isPathClear(row, col, jumpRow, jumpCol)) {

            const jumpKey = `${jumpRow},${jumpCol}`;
            const totalJumps = jumps + 1;
            const jumpCell = getCell(jumpRow, jumpCol);

            if (!jumpCell.querySelector('.piece') &&
              (!visited.has(jumpKey) || totalJumps < visited.get(jumpKey))) {

              queue.push([jumpRow, jumpCol, totalJumps]);
              jumpCell.classList.add('valid-move');

              const existingNumber = jumpCell.querySelector('.jump-number');
              if (existingNumber) existingNumber.remove();

              const jumpNumber = document.createElement('span');
              jumpNumber.className = 'jump-number';
              jumpNumber.textContent = totalJumps;
              jumpCell.appendChild(jumpNumber);
            }
          }
          break;
        }
        step++;
      }
    }
  }

  // Add single-step moves (0 jumps)
  for (const [dr, dc] of directions) {
    const targetRow = startRow + dr;
    const targetCol = startCol + dc;
    if (isValidCell(targetRow, targetCol)) {
      const cell = getCell(targetRow, targetCol);
      if (!cell.querySelector('.piece')) {
        cell.classList.add('valid-move');
      }
    }
  }

  // Merge jump counts
  visited.forEach((jumps, key) => {
    const [row, col] = key.split(',').map(Number);
    const cell = getCell(row, col);
    if (!cell.textContent || jumps < parseInt(cell.textContent)) {
      const jumpNumber = document.createElement('span');
      jumpNumber.textContent = jumps.toString();
    }
  });
}

function movePiece(from, toCell) {
  toCell.appendChild(from.element);
  from.element.classList.remove('selected');
}

createBoard();