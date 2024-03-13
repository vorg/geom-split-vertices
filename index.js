import { avec3, vec3 } from "pex-math";
import typedArrayConstructor from "typed-array-constructor";

const TEMP_CELL = vec3.create();
const TEMP_POSITION = vec3.create();

function splitVertices(positions, cells) {
  const isFlatArray = !positions[0]?.length;
  const isCellsFlatArray = !cells[0]?.length;

  const cellCount = cells.length / (isCellsFlatArray ? 3 : 1);
  const positionCount = cellCount * 3;

  const splitPositions = isFlatArray
    ? new positions.constructor(positionCount * 3)
    : [];
  const splitCells = isCellsFlatArray
    ? new (typedArrayConstructor(positionCount))(cells.length).map(
        (_, index) => index,
      )
    : Array.from({ length: cells.length }, (_, index) => [
        index * 3,
        index * 3 + 1,
        index * 3 + 2,
      ]);

  for (let i = 0; i < cellCount; i++) {
    if (isCellsFlatArray) {
      avec3.set(TEMP_CELL, 0, cells, i);
    } else {
      vec3.set(TEMP_CELL, cells[i]);
    }

    for (let j = 0; j < 3; j++) {
      if (isFlatArray) {
        avec3.set(TEMP_POSITION, 0, positions, TEMP_CELL[j]);
        avec3.set(splitPositions, i * 3 + j, TEMP_POSITION, 0);
      } else {
        splitPositions.push(vec3.copy(positions[TEMP_CELL[j]]));
      }
    }
  }

  return { positions: splitPositions, cells: splitCells };
}

export default splitVertices;
