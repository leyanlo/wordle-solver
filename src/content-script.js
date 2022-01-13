const board = [
  ...document.querySelector('game-app').shadowRoot.querySelectorAll(`game-row`),
].map((node) =>
  [...node.shadowRoot.querySelectorAll('game-tile')].map((node) => ({
    letter: node.getAttribute('letter'),
    evaluation: node.getAttribute('evaluation'),
  }))
);

const correct = Array(5).fill(null);
const present = [...Array(5)].map(() => []);
const absent = [];

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
        absent.push(letter);
        break;
      default:
        // end of rows
        break outer;
    }
  }
}

function isExclusive(a, b) {
  return a.split('').every((char) => !b.includes(char));
}

fetch(chrome.runtime.getURL('assets/wordlist.json'))
  .then((response) => response.json())
  .then((words) => {
    words = words.filter(
      (word) =>
        word
          .split('')
          .every((char, i) =>
            correct[i]
              ? correct[i] === char
              : !present[i].includes(char) && !absent.includes(char)
          ) && present.flat().every((char) => word.includes(char))
    );

    let minEv = 1;
    let bestWord = null;
    for (const a of words) {
      const counts = {};
      for (const b of words) {
        const evals = [];
        for (let i = 0; i < b.length; i++) {
          evals.push(
            b[i] === a[i] ? 'correct' : a.includes(b[i]) ? 'present' : 'absent'
          );
          const key = evals.join();
          counts[key] = (counts[key] ?? 0) + 1;
        }
      }
      const ev = Object.keys(counts)
        .map((key) => key.split(','))
        .filter((evals) => evals.length === 5)
        .reduce(
          (acc, evals) =>
            acc +
            [...Array(5).keys()]
              .map((i) => counts[evals.slice(0, i + 1).join()] / words.length)
              .reduce((acc, count) => acc * count),
          0
        );
      if (ev <= minEv) {
        minEv = ev;
        bestWord = a;
      }
    }
    console.log(bestWord);
  });