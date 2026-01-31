<script setup>
const props = defineProps({
  class: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <h3 :class="['text-2xl font-semibold leading-none tracking-tight', props.class]">
    <slot />
  </h3>
</template>
