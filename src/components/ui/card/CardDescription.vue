<script setup>
const props = defineProps({
  class: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <p :class="['text-sm text-muted-foreground', props.class]">
    <slot />
  </p>
</template>
