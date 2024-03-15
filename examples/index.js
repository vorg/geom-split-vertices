import splitVertices from "../index.js";
import { sphere, cube } from "primitive-geometry";
import oldSphere from "primitive-sphere";

import createContext from "pex-context";
import { mat4, avec3, vec3 } from "pex-math";
import createGUI from "pex-gui";
import triangulate from "geom-triangulate";

const State = {
  pause: true,
  shrink: 0.75,
};

// Utils
const getBarycenter = (positions) => {
  const barycenter = [0, 0, 0];

  for (let i = 0; i < 3; i++) {
    barycenter[0] += positions[i][0] / 3;
    barycenter[1] += positions[i][1] / 3;
    barycenter[2] += positions[i][2] / 3;
  }

  return barycenter;
};

const face = vec3.create();
const a = vec3.create();
const b = vec3.create();
const c = vec3.create();

function faceBarycenter(positions, cells) {
  const isFlatArray = !positions[0]?.length;

  const isCellsFlatArray = !cells[0]?.length;
  const cellCount = cells.length / (isCellsFlatArray ? 3 : 1);

  const barycenters = new Float32Array(
    positions.length * (isFlatArray ? 1 : 3) * 3,
  );

  for (let i = 0; i < cellCount; i++) {
    // face
    if (isCellsFlatArray) {
      avec3.set(face, 0, cells, i);
    } else {
      vec3.set(face, cells[i]);
    }

    if (isFlatArray) {
      avec3.set(a, 0, positions, face[0]);
      avec3.set(b, 0, positions, face[1]);
      avec3.set(c, 0, positions, face[2]);
    } else {
      vec3.set(a, positions[face[0]]);
      vec3.set(b, positions[face[1]]);
      vec3.set(c, positions[face[2]]);
    }

    const barycenter = getBarycenter([a, b, c]);

    // All vertices are unique
    avec3.set(barycenters, face[0], barycenter, 0);
    avec3.set(barycenters, face[1], barycenter, 0);
    avec3.set(barycenters, face[2], barycenter, 0);
  }

  return barycenters;
}

// Setup
const W = 1280;
const H = 720;
const ctx = createContext({
  width: W,
  height: H,
  element: document.querySelector("main"),
  pixelRatio: devicePixelRatio,
});

const viewMatrix = mat4.create();
const modelMatrix = mat4.create();
const projectionMatrix = mat4.create();
mat4.lookAt(viewMatrix, [0, 0, 2], [0, 0, 0]);
mat4.perspective(projectionMatrix, Math.PI / 4, W / H, 0.1, 100);

// Geometry
let geometry;
geometry = sphere();
// geometry = cube();
// geometry.positions = Array.from(geometry.positions);
// geometry.cells = Array.from(geometry.cells);
geometry = oldSphere(0.5, { segments: 16 });
// geometry = dodecahedron();

const isPolygon = geometry.cells[0].length;

let splitGeometry = splitVertices(geometry.positions, geometry.cells);

if (isPolygon) {
  geometry.cells = triangulate(geometry.cells);
  splitGeometry.cells = triangulate(splitGeometry.cells);
  // Need resplit after triangulating
  splitGeometry = splitVertices(geometry.positions, geometry.cells);
}

splitGeometry.barycenters = faceBarycenter(
  splitGeometry.positions,
  splitGeometry.cells,
);

console.log("geometry", geometry);
console.log("splitGeometry", splitGeometry);

// Draw
const basicInstancedVert = /* glsl */ `#version 300 es
uniform mat4 uProjectionMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uModelMatrix;

in vec3 aPosition;

in vec3 aOffset;

out vec3 vPositionWorld;

void main () {
  vPositionWorld = (uModelMatrix * vec4(aPosition + aOffset, 1.0)).xyz;

  gl_Position = uProjectionMatrix * uViewMatrix * vec4(vPositionWorld, 1.0);
}
`;
const basicBarycenterVert = /* glsl */ `#version 300 es
uniform mat4 uProjectionMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uModelMatrix;
uniform float uShrinkScale;

in vec3 aPosition;
in vec3 aBarycenter;

out vec3 vPositionWorld;

void main () {
  vPositionWorld = (uModelMatrix * vec4(aBarycenter + (aPosition - aBarycenter) * uShrinkScale, 1.0)).xyz;

  gl_Position = uProjectionMatrix * uViewMatrix * vec4(vPositionWorld, 1.0);
}
`;
const basicDerivativeFrag = /* glsl */ `#version 300 es
precision highp float;

in vec3 vPositionWorld;
out vec4 fragColor;

void main() {
  vec3 fdx = vec3(dFdx(vPositionWorld.x), dFdx(vPositionWorld.y), dFdx(vPositionWorld.z));
  vec3 fdy = vec3(dFdy(vPositionWorld.x), dFdy(vPositionWorld.y), dFdy(vPositionWorld.z));
  vec3 normal = normalize(cross(fdx, fdy));
  fragColor = vec4(normal * 0.5 + 0.5, 1.0);
}
`;

const clearCmd = {
  pass: ctx.pass({
    clearColor: [1, 1, 1, 1],
    clearDepth: 1,
  }),
};

const drawCmd = {
  pipeline: ctx.pipeline({
    vert: basicBarycenterVert,
    frag: basicDerivativeFrag,
    depthTest: true,
    cullFace: false,
  }),
  uniforms: {
    uProjectionMatrix: projectionMatrix,
    uViewMatrix: viewMatrix,
  },
};

const barycenterGeometry = sphere({ radius: 0.007 });
const drawBarycenters = {
  pipeline: ctx.pipeline({
    vert: basicInstancedVert,
    frag: basicDerivativeFrag,
    depthTest: true,
    cullFace: false,
  }),
  uniforms: {
    uProjectionMatrix: projectionMatrix,
    uViewMatrix: viewMatrix,
  },
  attributes: {
    aPosition: ctx.vertexBuffer(barycenterGeometry.positions),
    aOffset: {
      buffer: ctx.vertexBuffer(splitGeometry.barycenters),
      divisor: 1,
    },
  },
  indices: ctx.indexBuffer(barycenterGeometry.cells),
  instances: splitGeometry.barycenters.length / 3,
};

const geometryAttributes = {
  attributes: {
    aPosition: ctx.vertexBuffer(geometry.positions),
    aBarycenter: ctx.vertexBuffer(geometry.positions), // Use positions to scale by 1
  },
  indices: ctx.indexBuffer(geometry.cells),
};

const splitGeometryAttributes = {
  attributes: {
    aPosition: ctx.vertexBuffer(splitGeometry.positions),
    aBarycenter: ctx.vertexBuffer(splitGeometry.barycenters),
  },
  indices: ctx.indexBuffer(splitGeometry.cells),
};

function computeEdges(cells, stride = 3) {
  const edges = new Uint32Array(cells.length * 2);

  let cellIndex = 0;

  for (let i = 0; i < cells.length; i += stride) {
    for (let j = 0; j < stride; j++) {
      const a = cells[i + j];
      const b = cells[i + ((j + 1) % stride)];
      edges[cellIndex] = Math.min(a, b);
      edges[cellIndex + 1] = Math.max(a, b);
      cellIndex += 2;
    }
  }
  return edges;
}

const drawMeshWireframeCmd = {
  pipeline: ctx.pipeline({
    vert: /* glsl */ `#version 300 es
uniform mat4 uProjectionMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uModelMatrix;

in vec3 aPosition;

out vec3 vPositionWorld;

void main () {
  vPositionWorld = (uModelMatrix * vec4(aPosition, 1.0)).xyz;

  gl_Position = uProjectionMatrix * uViewMatrix * vec4(vPositionWorld, 1.0);
}`,
    frag: /* glsl */ `#version 300 es
precision highp float;

out vec4 fragColor;

void main() {
  fragColor = vec4(1.0, 1.0, 0.0, 1.0);
}
`,
    depthTest: true,
    cullFace: false,
    primitive: ctx.Primitive.Lines,
  }),
  uniforms: {
    uProjectionMatrix: projectionMatrix,
    uViewMatrix: viewMatrix,
  },
  ...splitGeometryAttributes,
  indices: ctx.indexBuffer(
    computeEdges(
      splitGeometry.cells?.[0].length
        ? splitGeometry.cells.flat()
        : splitGeometry.cells,
    ),
  ),
};
const gui = createGUI(ctx);
gui.addParam("Pause", State, "pause");
gui.addParam("Shrink", State, "shrink", { min: 0, max: 1 });

let dt = 0;

let leftMatrix = mat4.create();
let rightMatrix = mat4.create();
mat4.translate(leftMatrix, [-0.6, 0, 0]);
mat4.translate(rightMatrix, [0.6, 0, 0]);

ctx.frame(() => {
  if (!State.pause) {
    dt += 0.005;
    mat4.rotate(modelMatrix, dt % 0.02, [0, 1, 0]);
    mat4.lookAt(viewMatrix, [0, 0 + Math.sin(dt * 2) * 1, 2], [0, 0, 0]);

    mat4.set(leftMatrix, modelMatrix);
    mat4.set(rightMatrix, modelMatrix);
    mat4.translate(leftMatrix, [-0.6, 0, 0]);
    mat4.translate(rightMatrix, [0.6, 0, 0]);
  }

  ctx.submit(clearCmd);

  ctx.submit(drawCmd, {
    ...geometryAttributes,
    uniforms: { uModelMatrix: leftMatrix },
  });
  ctx.submit(drawCmd, {
    ...splitGeometryAttributes,
    uniforms: {
      uModelMatrix: rightMatrix,
      uShrinkScale: State.shrink,
    },
  });

  ctx.submit(drawBarycenters, {
    uniforms: { uModelMatrix: rightMatrix },
  });
  ctx.submit(drawMeshWireframeCmd, {
    uniforms: { uModelMatrix: rightMatrix },
  });

  gui.draw();
});
