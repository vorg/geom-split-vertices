import splitVertices from "./index.js";

const positions = [
  [0, 0, 0],
  [1, 1, 1],
  [2, 2, 2],
  [3, 3, 3],
];
const cells = [
  [0, 1, 2],
  [0, 2, 3],
];
console.log("array array");
console.log(splitVertices(positions, cells));
console.log("flat array");
console.log(splitVertices(positions.flat(), cells));
console.log("flat flat");
console.log(splitVertices(positions.flat(), cells.flat()));
console.log("array flat");
console.log(splitVertices(positions, cells.flat()));

const positions4 = [
  [0, 0, 0],
  [1, 1, 1],
  [2, 2, 2],
  [3, 3, 3],
  [4, 4, 4],
  [5, 5, 5],
];
const cells4 = [
  [0, 1, 2, 3],
  [2, 3, 4, 5],
];

console.log("array array 4");
console.log(splitVertices(positions4, cells4));
console.log("flat array 4");
console.log(splitVertices(positions4.flat(), cells4));
