<script setup lang="ts">
import type { ToolInfo, ToolsScanResult } from '../../../preload/index'

defineProps<{
  toolsResult: ToolsScanResult | null
  toolsStats: ToolsScanResult['stats']
  toolCategories: string[]
  groupedTools: Record<string, ToolInfo[]>
  getCategoryAccent: (category: string) => string
}>()

const emit = defineEmits<{
  'open-tool': [tool: ToolInfo]
}>()

function openTool(tool: ToolInfo): void {
  emit('open-tool', tool)
}
</script>

<template>
  <div v-if="toolsResult" class="results">
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">Total Tools</span>
        <span class="stat-value">{{ toolsStats.total }}</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-label">Categories</span>
        <span class="stat-value">{{ toolsStats.categories }}</span>
      </div>
    </div>

    <div class="categories">
      <div v-for="category in toolCategories" :key="category" class="category-section">
        <div class="category-header">
          <div class="category-info">
            <span
              class="category-dot"
              :style="{ backgroundColor: getCategoryAccent(category) }"
            ></span>
            <h3>{{ category }}</h3>
          </div>
          <span class="category-count">{{ groupedTools[category].length }} tools</span>
        </div>

        <div class="tools-grid">
          <button
            v-for="tool in groupedTools[category]"
            :key="tool.name"
            type="button"
            class="tool-card tool-card-button"
            :title="`Open ${tool.displayName}`"
            @click="openTool(tool)"
          >
            <div class="tool-icon">{{ tool.icon }}</div>
            <div class="tool-info">
              <h4 class="tool-name">{{ tool.displayName }}</h4>
              <p v-if="tool.version" class="tool-version">{{ tool.version }}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
