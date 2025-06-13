<template>
  <!-- <div>
    <HelloWorld />
  </div> -->
  <div
    ref="containerRef"
    style="width: 100vw; height: 100vh;"
  />
</template>

<script setup lang='ts'>
import * as THREE from 'three'
// import { BaseThree } from './BaseThree'

class Three extends ThreeBase {
  constructor(dom: HTMLDivElement) {
    super(dom, {
      renderer: {
        type: 'webgpu'
      }
    })
    this.camera.position.set(2, 5, 10)
    this.renderer.setClearColor(0x000000)
    this.addHelper()

    this.test()
  }

  test() {

  }

  initLight() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 3)
    this.scene.add(ambientLight)

    // const light = new THREE.DirectionalLight(0xffffff, 7);
    // light.position.set(3, 1, 7);
    // light.target.position.set(0, 0, 0)
    // this.scene.add(light);
    // this.scene.add(new THREE.DirectionalLightHelper(light))
  }
}

const containerRef = ref<HTMLDivElement>()

onMounted(() => {
  const three = new Three(containerRef.value as HTMLDivElement)
})
// const three = new Three(containerRef.value as HTMLDivElement)
</script>

<style scoped>
* {
  padding: 0;
  margin: 0;
}
</style>