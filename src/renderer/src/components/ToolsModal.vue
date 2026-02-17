<script setup lang="ts">
import type { ToolInfo, ToolsScanResult } from '../../../preload/index'

defineProps<{
  visible: boolean
  toolsResult: ToolsScanResult | null
  toolsStats: ToolsScanResult['stats']
  toolCategories: string[]
  groupedTools: Record<string, ToolInfo[]>
  scanningTools: boolean
  getCategoryAccent: (category: string) => string
}>()

const emit = defineEmits<{
  close: []
  'scan-tools': []
  'open-tool': [tool: ToolInfo]
}>()

function openTool(tool: ToolInfo): void {
  emit('open-tool', tool)
}
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-card tools-modal-card">
      <div class="tools-modal-header">
        <h3>Tools</h3>
        <div class="tools-modal-actions">
          <button class="btn-primary" :disabled="scanningTools" @click="emit('scan-tools')">
            <span v-if="!scanningTools" class="btn-icon">Rescan</span>
            <span v-else class="btn-spinner"></span>
            <span>{{ scanningTools ? 'Scanning...' : 'Scan Tools' }}</span>
          </button>
          <button class="btn-outline" @click="emit('close')">Close</button>
        </div>
      </div>

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
                <div class="tool-icon">
                  <img
                    v-if="tool.icon && tool.icon.startsWith('data:')"
                    :src="tool.icon"
                    :alt="tool.displayName"
                  />
                  <span v-else>{{ tool.icon || '?' }}</span>
                </div>
                <div class="tool-info">
                  <h4 class="tool-name">{{ tool.displayName }}</h4>
                  <p v-if="tool.version" class="tool-version">{{ tool.version }}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-tools">
        <p>暂无工具数据，点击扫描开始识别本机开发工具。</p>
        <button class="btn-primary" :disabled="scanningTools" @click="emit('scan-tools')">
          <span v-if="!scanningTools">Scan Tools</span>
          <span v-else class="btn-spinner"></span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tools-modal-card {
  width: min(920px, 100%);
}

.tools-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tools-modal-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.empty-tools {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-align: center;
  font-size: 12px;
}

@media (max-width: 620px) {
  .tools-modal-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
