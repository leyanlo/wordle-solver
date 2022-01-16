const observer = new MutationObserver(() => onEval());

let words = [];
fetch(chrome.runtime.getURL('assets/wordlist.json'))
  .then((response) => response.json())
  .then((wordlist) => {
    words = wordlist;
    onEval();
  });

function onEval() {
  const board = [];

  outer: for (const rowNode of document
    .querySelector('game-app')
    .shadowRoot.querySelectorAll(`game-row`)) {
    const row = [];
    for (const tileNode of rowNode.shadowRoot.querySelectorAll('game-tile')) {
      const letter = tileNode.getAttribute('letter');
      const evaluation = tileNode.getAttribute('evaluation');
      if (!evaluation) {
        observer.observe(tileNode, {
          attributeFilter: ['evaluation'],
        });
        break outer;
      }
      row.push({ letter, evaluation });
    }
    board.push(row);
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

  words = words.filter(
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

  let bestWord = null;

  // avoid computation if first word
  if (words.length === 2315) {
    bestWord = 'slate';
  } else {
    let minVariance = words.length ** 2;
    for (const a of words) {
      const counts = Array(3 ** 5).fill(0);
      for (const b of words) {
        const evals = [];
        for (let i = 0; i < b.length; i++) {
          evals.push(b[i] === a[i] ? 0 : a.includes(b[i]) ? 1 : 2);
        }
        counts[parseInt(evals.join(''), 3)]++;
      }
      const variance = counts
        .map((count) => count ** 2)
        .reduce((acc, n) => acc + n);
      if (variance <= minVariance) {
        minVariance = variance;
        bestWord = a;
      }
    }
  }

  if (words.length === 1) {
    console.log(`1 word is possible. Best guess: ${bestWord}`);
  } else if (words.length > 1) {
    console.log(`${words.length} words are possible. Best guess: ${bestWord}`);
  }
}
