export function getTiles(guess, answer) {
  const evals = Array(5).fill('absent');
  const counts = [...answer].reduce((acc, char) => {
    acc[char] = (acc[char] ?? 0) + 1;
    return acc;
  }, {});
  const wrongIndexes = [];

  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      evals[i] = 'correct';
      counts[guess[i]]--;
    } else {
      wrongIndexes.push(i);
    }
  }

  for (const i of wrongIndexes) {
    if (counts[guess[i]]) {
      evals[i] = 'present';
      counts[guess[i]]--;
    }
  }

  return evals;
}

export function processBoard(board, possibleWords, allWords, allEvs) {
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

  const words = possibleWords.filter(
    (word) =>
      word
        .split('')
        .every((char, i) =>
          correct[i]
            ? correct[i] === char
            : !present[i].includes(char) &&
              !absent[i].includes(char) &&
              (!absent.flat().includes(char) || present.flat().includes(char))
        ) && present.flat().every((char) => word.includes(char))
  );

  let evs = {};
  if (words.length === 0) {
    // this shouldn’t happen
    return;
  } else if (words.length === 1) {
    // avoid computation if one word remaining
    evs = {
      [words[0]]: 1,
    };
  } else if (words.length === possibleWords.length) {
    // avoid computation if it’s the first guess
    evs = allEvs;
  } else {
    for (const a of allWords) {
      const counts = {};
      for (const b of words) {
        const key = getTiles(b, a).join();
        counts[key] = (counts[key] ?? 0) + 1;
      }
      evs[a] =
        Object.keys(counts)
          .map((key) => counts[key] ** 2)
          .reduce((acc, n) => acc + n) / words.length;
    }
  }

  // sort by ev and priorities words in remaining words list
  const sortedEvEntries = Object.entries(evs).sort(
    ([aW, aEv], [bW, bEv]) =>
      aEv - bEv || -+words.includes(aW) || words.includes(bW)
  );
  const minEv = sortedEvEntries[0][1];
  const prevGuesses = board.map((row) =>
    row.map((tile) => tile.letter).join('')
  );
  const bestWords = sortedEvEntries
    .filter(([w, ev]) => ev === minEv && !prevGuesses.includes(w))
    .map(([w]) => w);

  return {
    words,
    sortedEvEntries,
    minEv,
    bestWords,
  };
}
