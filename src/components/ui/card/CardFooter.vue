<script setup>
const props = defineProps({
  class: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <div :class="['flex items-center p-6 pt-0', props.class]">
    <slot />
  </div>
</template>
