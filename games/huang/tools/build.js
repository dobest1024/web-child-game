import { cp, mkdir, rm } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist/vendor", { recursive: true });
for (const file of ["index.html", "style.css", "src", "shared", "public"])
  await cp(file, `dist/${file}`, { recursive: true });
await cp("node_modules/three/build/three.module.js", "dist/vendor/three.js");
await cp("node_modules/three/build/three.core.js", "dist/vendor/three.core.js");
await cp(
  "node_modules/three/examples/jsm/utils/BufferGeometryUtils.js",
  "dist/vendor/BufferGeometryUtils.js",
);
await cp("node_modules/three/LICENSE", "dist/vendor/THREE-LICENSE.txt");
console.log("Built dist/ with self-hosted Three.js.");
