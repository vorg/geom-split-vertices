import { avec3, vec3 } from "pex-math";
import typedArrayConstructor from "typed-array-constructor";

const TEMP_0 = vec3.create();
const TEMP_1 = vec3.create();

function splitVertices(positions, cells) {
  const isFlatArray = !positions[0]?.length;
  const isCellsFlatArray = !cells[0]?.length;
  const l = cells.length / (isCellsFlatArray ? 3 : 1);

  const size = (isCellsFlatArray ? cells.length : cells.length * 3) * 3;

  const splitPositions = isFlatArray ? new positions.constructor(size) : [];
  const splitCells = isCellsFlatArray
    ? typedArrayConstructor(size).from(
        { length: cells.length },
        (_, index) => index,
      )
    : Array.from({ length: cells.length }, (_, index) => [
        index * 3,
        index * 3 + 1,
        index * 3 + 2,
      ]);

  for (let i = 0; i < l; i++) {
    // face
    if (isCellsFlatArray) {
      avec3.set(TEMP_0, 0, cells, i);
    } else {
      vec3.set(TEMP_0, cells[i]);
    }

    for (let j = 0; j < 3; j++) {
      if (isFlatArray) {
        avec3.set(TEMP_1, 0, positions, TEMP_0[j]); // position
        avec3.set(splitPositions, i * 3 + j, TEMP_1, 0);
      } else {
        splitPositions.push(vec3.copy(positions[TEMP_0[j]]));
      }
    }
  }

  return { positions: splitPositions, cells: splitCells };
}

export default splitVertices;
