import splitVertices from "../index.js";
import { sphere,cube } from "primitive-geometry";
import oldSphere from "primitive-sphere";

import createContext from "pex-context";
import normals from "geom-normals";
import { mat4, avec3, vec3 } from "pex-math";

const basicVert = /* glsl */ `#version 300 es
uniform mat4 uProjectionMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uModelMatrix;
uniform float uShrinkScale;

in vec3 aPosition;
in vec3 aBarycenter;
in vec3 aNormal;

out vec3 vPositionWorld;
out vec4 vColor;

void main () {
  vColor = vec4(aNormal * 0.5 + 0.5, 1.0);

  vPositionWorld = (uModelMatrix * vec4(aBarycenter + (aPosition - aBarycenter) * uShrinkScale, 1.0)).xyz;

  gl_Position = uProjectionMatrix * uViewMatrix * vec4(vPositionWorld, 1.0);
}
`;
const basicFrag = /* glsl */ `#version 300 es
precision highp float;

in vec4 vColor;

out vec4 fragColor;

void main() {
  fragColor = vColor;
}
`;

const W = 1280;
const H = 720;
const ctx = createContext({
  width: W,
  height: H,
  element: document.querySelector("main"),
  pixelRatio: devicePixelRatio,
});

const geometry = sphere();
// const geometry = cube();
// geometry.positions = Array.from(geometry.positions);
// geometry.cells = Array.from(geometry.cells);
// const geometry = oldSphere(0.5, { segments: 16 });
console.log(geometry);

const splitGeometry = splitVertices(geometry.positions, geometry.cells);
console.log(splitGeometry);

const clearCmd = {
  pass: ctx.pass({
    clearColor: [1, 1, 1, 1],
    clearDepth: 1,
  }),
};

const drawCmd = {
  pipeline: ctx.pipeline({
    depthTest: true,
    vert: basicVert,
    frag: basicFrag,
    // cullFace: true,
  }),
  uniforms: {
    uProjectionMatrix: mat4.perspective(
      mat4.create(),
      Math.PI / 4,
      W / H,
      0.1,
      100,
    ),
    uViewMatrix: mat4.lookAt(mat4.create(), [0, 0, 2], [0, 0, 0], [0, 1, 0]),
    uShrinkScale: 0.75,
  },
};

const faceSize = 3;

const getBarycenter = (face) => {
  const barycenter = [0, 0, 0];

  for (let i = 0; i < faceSize; i++) {
    barycenter[0] += face[i][0] / faceSize;
    barycenter[1] += face[i][1] / faceSize;
    barycenter[2] += face[i][2] / faceSize;
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
  const l = cells.length / (isCellsFlatArray ? 3 : 1);

  const barycenters = new Float32Array(
    positions.length * (isFlatArray ? 1 : 3),
  );

  for (let i = 0; i < l; i++) {
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

    for (let j = 0; j < faceSize; j++) {
      avec3.set(barycenters, i * faceSize + j, barycenter, 0);
    }
  }

  return barycenters;
}

const geometryAttributes = {
  attributes: {
    aPosition: ctx.vertexBuffer(geometry.positions),
    aBarycenter: ctx.vertexBuffer(geometry.positions), // Use positions to scale by 1
    aNormal: ctx.vertexBuffer(geometry.normals),
  },
  indices: ctx.indexBuffer(geometry.cells),
};

const splitGeometryAttributes = {
  attributes: {
    aPosition: ctx.vertexBuffer(splitGeometry.positions),
    aBarycenter: ctx.vertexBuffer(
      faceBarycenter(splitGeometry.positions, splitGeometry.cells),
    ),
    aNormal: ctx.vertexBuffer(
      normals(splitGeometry.positions, splitGeometry.cells),
    ),
  },
  indices: ctx.indexBuffer(splitGeometry.cells),
};

ctx.frame(() => {
  ctx.submit(clearCmd);
  ctx.submit(drawCmd, {
    ...geometryAttributes,
    uniforms: {
      uModelMatrix: mat4.translate(mat4.create(), [-0.6, 0, 0]),
    },
  });
  ctx.submit(drawCmd, {
    ...splitGeometryAttributes,
    uniforms: {
      uModelMatrix: mat4.translate(mat4.create(), [0.6, 0, 0]),
    },
  });
});
