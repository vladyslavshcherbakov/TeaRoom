import * as THREE from 'three'

export type Look =
  | { readonly kind: 'matte' | 'unlit' | 'foliage' | 'glow' | 'pearly' | 'translucent' | 'liquidSurface' | 'glass' | 'clearGlass' | 'gold' | 'aluminium' | 'glaze' | 'skyDome' }
  | { readonly kind: 'mist'; readonly opacity: number }
  | { readonly kind: 'veil'; readonly opacity: number }
  | { readonly kind: 'cloud'; readonly emissive: string }
  | { readonly kind: 'heated'; readonly glowColour: string; readonly glowIntensity: number }

export type LookMaterial = THREE.MeshStandardMaterial | THREE.MeshBasicMaterial | THREE.MeshLambertMaterial

const matteRoughness = 0.92
const foliageRoughness = 0.85
const translucentOpacity = 0.85
const glassEdgeSharpness = 2
const glassGlintFrom = 0.7
const glassGlintFull = 1.4
const glassEdgeShade = 0.25
const glassEdgeDarkening = 0.5
const glassFacingOpacity = 0.1
const glassRoughness = 0.04
const clearGlassRoughness = 0.05
const glassReflectionsIntensity = 1
const clearGlassReflectionsIntensity = 1.6
const glassEdgeOpacity = 0.9
const glassSeenEdgeOnFragment = `
  float glassFacing = abs(dot(normalize(normal), normalize(vViewPosition)));
  float glassEdge = pow(1.0 - glassFacing, ${glassEdgeSharpness.toFixed(1)});
  float glassGlint = smoothstep(${glassGlintFrom.toFixed(2)}, ${glassGlintFull.toFixed(2)}, max(max(gl_FragColor.r, gl_FragColor.g), gl_FragColor.b));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(${glassEdgeShade.toFixed(2)}), glassEdge * ${glassEdgeDarkening.toFixed(2)});
  gl_FragColor.a = max(mix(${glassFacingOpacity.toFixed(2)}, ${glassEdgeOpacity.toFixed(2)}, glassEdge), glassGlint);
`

const clearGlassOverTheTransmittingFragment = `
  float clearGlassFacing = abs(dot(normalize(normal), normalize(vViewPosition)));
  float clearGlassEdge = pow(1.0 - clearGlassFacing, ${glassEdgeSharpness.toFixed(1)});
  vec3 clearGlassLight = totalSpecular * ${(clearGlassReflectionsIntensity / glassReflectionsIntensity).toFixed(2)};
  float clearGlassGlint = smoothstep(${glassGlintFrom.toFixed(2)}, ${glassGlintFull.toFixed(2)}, max(max(clearGlassLight.r, clearGlassLight.g), clearGlassLight.b));
  vec4 clearGlass = vec4(mix(clearGlassLight, vec3(${glassEdgeShade.toFixed(2)}), clearGlassEdge * ${glassEdgeDarkening.toFixed(2)}), max(mix(${glassFacingOpacity.toFixed(2)}, ${glassEdgeOpacity.toFixed(2)}, clearGlassEdge), clearGlassGlint));
  float blendedGlassOpacity = mix(gl_FragColor.a, clearGlass.a, clearGlassShare);
  vec3 blendedGlassLight = mix(gl_FragColor.rgb * gl_FragColor.a, clearGlass.rgb * clearGlass.a, clearGlassShare);
  gl_FragColor = vec4(blendedGlassLight / max(blendedGlassOpacity, 0.001), blendedGlassOpacity);
`

export function materialOfALook(look: Look, color: string, reflections: THREE.Texture | null): LookMaterial {
  switch (look.kind) {
    case 'matte':
      return new THREE.MeshStandardMaterial({ color, roughness: matteRoughness, metalness: 0, flatShading: true })
    case 'foliage':
      return new THREE.MeshStandardMaterial({ color, roughness: foliageRoughness, flatShading: true })
    case 'heated':
      return new THREE.MeshStandardMaterial({ color, roughness: matteRoughness, metalness: 0, flatShading: true, emissive: look.glowColour, emissiveIntensity: look.glowIntensity })
    case 'unlit':
      return new THREE.MeshBasicMaterial({ color })
    case 'mist':
      return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: look.opacity, depthWrite: false })
    case 'veil':
      return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: look.opacity, depthTest: false, depthWrite: false })
    case 'skyDome':
      return new THREE.MeshBasicMaterial({ color, vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false })
    case 'cloud':
      return new THREE.MeshLambertMaterial({ color, emissive: look.emissive, flatShading: true })
    case 'glow':
      return new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    case 'pearly':
      return new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 0.8, iridescence: 1, iridescenceIOR: 1.4 })
    case 'glaze':
      return new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.6 })
    case 'translucent':
      return new THREE.MeshStandardMaterial({ color, transparent: true, opacity: translucentOpacity })
    case 'liquidSurface':
      return new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: 0.06, specularIntensity: 1, transparent: true, envMap: reflections, envMapIntensity: 1 })
    case 'glass':
      return glassMaterial(color, reflections)
    case 'clearGlass':
      return clearGlassMaterial(color, reflections)
    case 'gold':
      return new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: 0.18, envMap: reflections, envMapIntensity: 1.5 })
    case 'aluminium':
      return new THREE.MeshPhysicalMaterial({ color, metalness: 0.8, roughness: 0.5, envMap: reflections, envMapIntensity: 0.55 })
  }
}

function clearGlassMaterial(color: string, reflections: THREE.Texture | null): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: clearGlassRoughness, transparent: true, specularIntensity: 1, envMap: reflections, envMapIntensity: clearGlassReflectionsIntensity })
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>\n${glassSeenEdgeOnFragment}`)
  }
  return material
}

export class GlassThatClears {
  private readonly clearShareUniform = { value: 0 }
  readonly material: THREE.MeshPhysicalMaterial

  constructor(colour: string, reflections: THREE.Texture | null) {
    this.material = glassMaterial(colour, reflections)
    this.material.transparent = true
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms['clearGlassShare'] = this.clearShareUniform
      shader.fragmentShader = `uniform float clearGlassShare;\n${shader.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>\n${clearGlassOverTheTransmittingFragment}`)}`
    }
  }

  get clearShare(): number {
    return this.clearShareUniform.value
  }

  showClearShare(clearShare: number): void {
    this.clearShareUniform.value = clearShare
    this.material.transmission = clearShare < 1 ? 1 : 0
  }
}

function glassMaterial(color: string, reflections: THREE.Texture | null): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0,
    roughness: glassRoughness,
    transmission: 1,
    ior: 1.5,
    thickness: 0.004,
    attenuationColor: '#e4f3ea',
    attenuationDistance: 0.25,
    specularIntensity: 1,
    envMap: reflections,
    envMapIntensity: glassReflectionsIntensity,
  })
}
