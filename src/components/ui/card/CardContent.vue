<script setup>
const props = defineProps({
  class: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <div :class="['p-6 pt-0', props.class]">
    <slot />
  </div>
</template>
