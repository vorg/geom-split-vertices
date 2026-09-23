import { avec3, vec3 } from "pex-math";
import typedArrayConstructor from "typed-array-constructor";

function splitVertices(positions, cells) {
  const positionsAreFlat = !Array.isArray(positions[0]);
  const cellsAreFlat = !Array.isArray(cells[0]);

  const faces = cellsAreFlat
    ? Array.from({ length: cells.length / 3 }, (_, i) =>
        cells.slice(i * 3, i * 3 + 3),
      )
    : cells;

  const vertexCount = faces.reduce((count, face) => count + face.length, 0);

  const splitPositions = positionsAreFlat
    ? new positions.constructor(vertexCount * 3)
    : [];

  const SplitCellsArray = typedArrayConstructor(vertexCount);

  const splitCells = cellsAreFlat ? new SplitCellsArray(vertexCount) : [];

  let vertexIndex = 0;

  for (const face of faces) {
    const splitFace = [];

    for (const sourceIndex of face) {
      if (positionsAreFlat) {
        avec3.set(splitPositions, vertexIndex, positions, sourceIndex);
      } else {
        splitPositions.push(vec3.copy(positions[sourceIndex]));
      }

      if (cellsAreFlat) {
        splitCells[vertexIndex] = vertexIndex;
      } else {
        splitFace.push(vertexIndex);
      }

      vertexIndex++;
    }

    if (!cellsAreFlat) {
      splitCells.push(splitFace);
    }
  }

  return {
    positions: splitPositions,
    cells: splitCells,
  };
}

export default splitVertices;
