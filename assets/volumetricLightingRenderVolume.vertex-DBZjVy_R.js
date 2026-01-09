import{Eg as e,Tg as t,fh as n,ph as r,wg as i}from"./index-xCE5Km30.js";var a,o,s;e((()=>{t(),n(),r(),a=`volumetricLightingRenderVolumeVertexShader`,o=`#include<sceneUboDeclaration>
#include<meshUboDeclaration>
attribute position : vec3f;varying vWorldPos: vec4f;@vertex
fn main(input : VertexInputs)->FragmentInputs {let worldPos=mesh.world*vec4f(vertexInputs.position,1.0);vertexOutputs.vWorldPos=worldPos;vertexOutputs.position=scene.viewProjection*worldPos;}
`,i.ShadersStoreWGSL[a]||(i.ShadersStoreWGSL[a]=o),s={name:a,shader:o}}))();export{s as volumetricLightingRenderVolumeVertexShaderWGSL};