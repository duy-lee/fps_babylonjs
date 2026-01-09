import{Eg as e,Ql as t,Tg as n,Xl as r,Yl as i,Zl as a,wg as o}from"./index-xCE5Km30.js";var s,c,l;e((()=>{n(),t(),r(),a(),i(),s=`volumetricLightingRenderVolumeVertexShader`,c=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`,o.ShadersStore[s]||(o.ShadersStore[s]=c),l={name:s,shader:c}}))();export{l as volumetricLightingRenderVolumeVertexShader};