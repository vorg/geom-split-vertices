import { avec3, vec3 } from "pex-math";

const faceSize = 3;

function splitVertices(positions, cells) {
  const isTypedArray = !Array.isArray(positions);
  const stride = isTypedArray ? 3 : 1;

  const splitPositions = isTypedArray ? new Float32Array(cells.length * 3) : [];
  const splitCells = isTypedArray
    ? Uint32Array.from({ length: cells.length }, (_, index) => index)
    : Array.from({ length: cells.length }, (_, index) => [
        index * faceSize,
        index * faceSize + 1,
        index * faceSize + 2,
      ]);

  for (let i = 0; i < cells.length / stride; i++) {
    const face = isTypedArray
      ? cells.slice(i * faceSize, i * faceSize + faceSize)
      : cells[i];

    for (let j = 0; j < faceSize; j++) {
      if (isTypedArray) {
        avec3.set(
          splitPositions,
          i * 3 + j,
          positions.slice(face[j] * 3, face[j] * 3 + 3),
          0
        );
      } else {
        splitPositions.push(vec3.copy(positions[face[j]]));
      }
    }
  }

  return { positions: splitPositions, cells: splitCells };
}

export default splitVertices;
