<script setup>
const props = defineProps({
  class: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <div :class="['rounded-lg border bg-card text-card-foreground shadow-sm', props.class]">
    <slot />
  </div>
</template>
