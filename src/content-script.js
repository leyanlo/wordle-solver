const gameRows = document
  .querySelector('game-app')
  .shadowRoot.querySelectorAll(`game-row`);
const rowOffsets = [...gameRows].map((rowNode) => ({
  top: rowNode.offsetTop,
  left: rowNode.offsetLeft,
  width: rowNode.offsetWidth,
  height: rowNode.offsetHeight,
}));
const observer = new MutationObserver(() => onEval());
let allWords = [];
let allEvs = {};

function init() {
  // add observer to each row
  for (const rowNode of gameRows) {
    const tileNode = rowNode.shadowRoot.querySelector('game-tile');
    observer.observe(tileNode, {
      attributeFilter: ['evaluation'],
    });
  }

  // init allWords and variances, and call onEval
  Promise.all([
    fetch(chrome.runtime.getURL('assets/wordlist.json')).then((response) =>
      response.json()
    ),
    fetch(chrome.runtime.getURL('assets/evs.json')).then((response) =>
      response.json()
    ),
  ]).then(([wordlist, evs]) => {
    allWords = wordlist;
    allEvs = evs;
    onEval();
  });
}
init();

function onEvalBoard(board, rowIdx) {
  const clueId = `clue-${rowIdx}`;
  if (
    document.getElementById(clueId) ||
    board[board.length - 1]?.every(({ evaluation }) => evaluation === 'correct')
  ) {
    return;
  }

  const correct = Array(5).fill(null);
  const present = [...Array(5)].map(() => []);
  const absent = [...Array(5)].map(() => []);

  outer: for (const row of board) {
    for (let i = 0; i < row.length; i++) {
      const { letter, evaluation } = row[i];
      switch (evaluation) {
        case 'correct':
          correct[i] = letter;
          break;
        case 'present':
          present[i].push(letter);
          break;
        case 'absent':
          absent[i].push(letter);
          break;
        default:
          // end of rows
          break outer;
      }
    }
  }

  const allPresent = present.flat();
  const allAbsent = absent.flat();

  const words = allWords.filter(
    (word) =>
      word
        .split('')
        .every((char, i) =>
          correct[i]
            ? correct[i] === char
            : !present[i].includes(char) &&
              !absent[i].includes(char) &&
              (!allAbsent.includes(char) || allPresent.includes(char))
        ) && allPresent.every((char) => word.includes(char))
  );

  let evs = {};
  if (words.length === 0) {
    return;
  } else if (words.length === allWords.length) {
    // avoid computation if first word
    evs = allEvs;
  } else {
    for (const a of words) {
      const counts = {};
      for (const b of words) {
        const evals = [];
        for (let i = 0; i < b.length; i++) {
          evals.push(b[i] === a[i] ? 0 : a.includes(b[i]) ? 1 : 2);
        }
        const key = parseInt(evals.join(''), 3);
        counts[key] = (counts[key] ?? 0) + 1;
      }
      evs[a] =
        Object.keys(counts)
          .map((key) => counts[key] ** 2)
          .reduce((acc, n) => acc + n) / words.length;
    }
  }
  const sortedEvEntries = Object.entries(evs).sort(([, a], [, b]) => a - b);
  const minEv = sortedEvEntries[0][1];
  const bestWords = sortedEvEntries
    .filter(([, ev]) => ev === minEv)
    .map(([w]) => w);

  const clueGuess = `Best guess: ${bestWords
    .map((w) => `<strong>${w}</strong>`)
    .join(' or ')} (<abbr title="expected value">EV</abbr> = ${minEv.toFixed(
    1
  )})`;
  const clueStats =
    words.length === 1
      ? `1 word is possible.`
      : `${words.length} words are possible.`;

  const clue = document.createElement('p');
  clue.id = clueId;
  clue.className = 'clue';
  clue.style.setProperty('--clue-top', rowOffsets[rowIdx].top + 'px');
  clue.style.setProperty(
    '--clue-left',
    rowOffsets[rowIdx].left + rowOffsets[rowIdx].width + 'px'
  );
  clue.style.setProperty('--clue-height', rowOffsets[rowIdx].height + 'px');
  clue.innerHTML = `${clueGuess}<br />${clueStats}`;
  document.body.appendChild(clue);
}

function onEval() {
  const board = [];
  outer: for (let i = 0; i < gameRows.length; i++) {
    onEvalBoard(board, i);
    const rowNode = gameRows[i];
    const row = [];
    for (const tileNode of rowNode.shadowRoot.querySelectorAll('game-tile')) {
      const letter = tileNode.getAttribute('letter');
      const evaluation = tileNode.getAttribute('evaluation');
      if (!evaluation) {
        break outer;
      }
      row.push({ letter, evaluation });
    }
    board.push(row);
  }
}
