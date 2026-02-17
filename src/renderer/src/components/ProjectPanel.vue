<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { ProjectInfo, ScanResult, ToolInfo } from '../../../preload/index'
import { getLanguageAccent } from '../constants/accent-colors'

type ProjectViewMode = 'all' | 'language' | 'type'

const props = defineProps<{
  scanResult: ScanResult | null
  scanningProjects: boolean
  totalProjects: number
  currentView: ProjectViewMode
  projectCategories: string[]
  groupedProjects: Record<string, ProjectInfo[]>
  getLanguageAccent: (language: string) => string
  toolsResult: {
    tools: ToolInfo[]
    byCategory: Record<string, ToolInfo[]>
  } | null
}>()

const emit = defineEmits<{
  'select-folder': []
  'update:view': [view: ProjectViewMode]
  'open-project': [project: ProjectInfo]
  'open-vscode': [project: ProjectInfo]
  'edit-project-tools': [project: ProjectInfo]
  'open-project-with-tool': [toolName: string, project: ProjectInfo]
}>()

// 工具选择下拉菜单状态
const showToolMenu = ref<Record<string, boolean>>({})
const toolMenuRefs = ref<Record<string, HTMLElement>>({})

// 获取 IDE 工具（已安装的）
const installedIDETools = computed(() => {
  if (!props.toolsResult) return []
  return props.toolsResult.tools.filter(t => t.category === 'IDE' && t.installed)
})

function getBadgeStyle(type: 'language' | 'type', value: string) {
  if (type === 'language') {
    const accent = getLanguageAccent(value)
    return {
      backgroundColor: `${accent}12`,
      color: accent,
      borderColor: `${accent}35`
    }
  }
  return {
    backgroundColor: 'var(--surface-soft)',
    color: 'var(--text-secondary)',
    borderColor: 'var(--border-normal)'
  }
}

function toggleToolMenu(projectPath: string, event: Event) {
  event.stopPropagation()
  showToolMenu.value[projectPath] = !showToolMenu.value[projectPath]
}

function closeToolMenu(projectPath: string) {
  showToolMenu.value[projectPath] = false
}

function openWithTool(toolName: string, project: ProjectInfo) {
  emit('open-project-with-tool', toolName, project)
  closeToolMenu(project.path)
}

// 点击外部关闭工具菜单
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  for (const [projectPath] of Object.entries(showToolMenu.value)) {
    const menuRef = toolMenuRefs.value[projectPath]
    if (showToolMenu.value[projectPath] && menuRef && !menuRef.contains(target)) {
      closeToolMenu(projectPath)
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 获取上次使用的工具信息
function getLastUsedTool(project: ProjectInfo): ToolInfo | null {
  if (!project.lastUsedTool || !props.toolsResult) return null
  return props.toolsResult.tools.find(t => t.name === project.lastUsedTool) || null
}

// 获取工具图标
function getToolIcon(tool: ToolInfo): string {
  if (tool.icon?.startsWith('data:')) {
    return tool.icon
  }
  return '⚙'
}
</script>

<template>
  <div>
    <div v-if="!scanResult && !scanningProjects" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"
          />
        </svg>
      </div>
      <h2>Select Project Directory</h2>
      <p>
        Choose a folder containing your development projects to automatically identify and
        categorize them.
      </p>
      <button class="btn-outline" @click="emit('select-folder')">Browse Folders</button>
    </div>

    <div v-if="scanResult" class="results">
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">Total Projects</span>
          <span class="stat-value">{{ totalProjects }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">Languages</span>
          <span class="stat-value">{{ Object.keys(scanResult.byLanguage).length }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">Types</span>
          <span class="stat-value">{{ Object.keys(scanResult.byType).length }}</span>
        </div>
      </div>

      <div class="view-toggle">
        <button
          :class="['toggle-btn', { active: currentView === 'all' }]"
          @click="emit('update:view', 'all')"
        >
          <span>All</span>
        </button>
        <button
          :class="['toggle-btn', { active: currentView === 'language' }]"
          @click="emit('update:view', 'language')"
        >
          <span>By Language</span>
        </button>
        <button
          :class="['toggle-btn', { active: currentView === 'type' }]"
          @click="emit('update:view', 'type')"
        >
          <span>By Type</span>
        </button>
      </div>

      <div class="categories">
        <!-- All Projects View (no category header) -->
        <div v-if="currentView === 'all'" class="projects-section">
          <div class="projects-grid">
            <div
              v-for="project in groupedProjects.all"
              :key="project.path"
              class="project-card"
            >
              <div class="card-content" @click="emit('open-project', project)">
                <div class="card-header">
                  <h4 class="project-name">{{ project.name }}</h4>
                  <div class="header-icons">
                    <svg v-if="project.hasGit" class="git-icon" viewBox="0 0 24 24" fill="currentColor" title="Git repository">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                    </svg>
                    <div v-if="getLastUsedTool(project)" class="last-tool" title="Last used IDE">
                      <img v-if="getLastUsedTool(project)!.icon?.startsWith('data:')" :src="getLastUsedTool(project)!.icon" class="tool-icon-img" />
                      <span v-else class="tool-icon-text">⚡</span>
                    </div>
                  </div>
                </div>
                <p class="project-path">{{ project.path }}</p>
                <div class="card-footer">
                  <span class="badge language-badge" :style="getBadgeStyle('language', project.language)">{{ project.language }}</span>
                  <span class="badge type-badge" :style="getBadgeStyle('type', project.type)">{{ project.type }}</span>
                </div>
              </div>

              <div class="card-actions">
                <button class="action-btn primary" title="Open with default tool" @click.stop="emit('open-project', project)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                  </svg>
                </button>
                <button class="action-btn vscode" title="Open with VS Code" @click.stop="emit('open-vscode', project)">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-.39.015l-2.4 2.4a1.06 1.06 0 0 0 .293 1.414l1.35 2.22-2.3 2.3a1.06 1.06 0 0 0-.293-1.414l-1.35-2.22a.999.999 0 0 0 .39-.015l2.4-2.4a1.06 1.06 0 0 0-.293-1.414l-1.349-2.22 2.3-2.3a1.06 1.06 0 0 0 .293 1.414l1.35 2.22a.999.999 0 0 0-.39.015l-2.4 2.4a1.06 1.06 0 0 0 .293 1.414l1.349 2.22 9.46-8.63a1.492 1.492 0 0 0 1.704-.29l4.94-2.58 9.46 8.63a1.492 1.492 0 0 0 1.704-.29l4.94-2.58z" />
                  </svg>
                </button>
                <div class="action-btn-group">
                  <button class="action-btn" title="Open with..." @click.stop="toggleToolMenu(project.path, $event)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div
                    v-if="showToolMenu[project.path]"
                    :ref="el => { if (el) toolMenuRefs[project.path] = el as HTMLElement }"
                    class="tool-dropdown-menu"
                  >
                    <div class="tool-dropdown-title">Open with IDE</div>
                    <button
                      v-for="tool in installedIDETools"
                      :key="tool.name"
                      class="tool-dropdown-item"
                      :class="{ 'is-last-used': tool.name === project.lastUsedTool }"
                      @click="openWithTool(tool.name, project)"
                    >
                      <img v-if="tool.icon?.startsWith('data:')" :src="tool.icon" class="tool-icon" />
                      <span v-else class="tool-icon-text">{{ getToolIcon(tool) }}</span>
                      <span class="tool-name">{{ tool.displayName }}</span>
                      <span v-if="tool.name === project.lastUsedTool" class="last-used-badge">Last</span>
                    </button>
                  </div>
                </div>
                <button class="action-btn settings" title="Tool settings" @click.stop="emit('edit-project-tools', project)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Grouped Views -->
        <div v-if="currentView !== 'all'" v-for="category in projectCategories" :key="category" class="category-section">
          <div class="category-header">
            <div class="category-info">
              <span class="category-dot" :style="{ backgroundColor: getLanguageAccent(category) }"></span>
              <h3>{{ category }}</h3>
            </div>
            <span class="category-count">{{ groupedProjects[category].length }} projects</span>
          </div>

          <div class="projects-grid">
            <div
              v-for="project in groupedProjects[category]"
              :key="project.path"
              class="project-card"
            >
              <div class="card-content" @click="emit('open-project', project)">
                <div class="card-header">
                  <h4 class="project-name">{{ project.name }}</h4>
                  <div class="header-icons">
                    <svg v-if="project.hasGit" class="git-icon" viewBox="0 0 24 24" fill="currentColor" title="Git repository">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                    </svg>
                    <div v-if="getLastUsedTool(project)" class="last-tool" title="Last used IDE">
                      <img v-if="getLastUsedTool(project)!.icon?.startsWith('data:')" :src="getLastUsedTool(project)!.icon" class="tool-icon-img" />
                      <span v-else class="tool-icon-text">⚡</span>
                    </div>
                  </div>
                </div>
                <p class="project-path">{{ project.path }}</p>
                <div class="card-footer">
                  <span class="badge language-badge" :style="getBadgeStyle('language', project.language)">{{ project.language }}</span>
                  <span class="badge type-badge" :style="getBadgeStyle('type', project.type)">{{ project.type }}</span>
                </div>
              </div>

              <div class="card-actions">
                <button class="action-btn primary" title="Open with default tool" @click.stop="emit('open-project', project)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                  </svg>
                </button>
                <button class="action-btn vscode" title="Open with VS Code" @click.stop="emit('open-vscode', project)">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-.39.015l-2.4 2.4a1.06 1.06 0 0 0 .293 1.414l1.35 2.22-2.3 2.3a1.06 1.06 0 0 0-.293-1.414l-1.35-2.22a.999.999 0 0 0 .39-.015l2.4-2.4a1.06 1.06 0 0 0-.293-1.414l-1.349-2.22 2.3-2.3a1.06 1.06 0 0 0 .293 1.414l1.35 2.22a.999.999 0 0 0-.39.015l-2.4 2.4a1.06 1.06 0 0 0 .293 1.414l1.349 2.22 9.46-8.63a1.492 1.492 0 0 0 1.704-.29l4.94-2.58 9.46 8.63a1.492 1.492 0 0 0 1.704-.29l4.94-2.58z" />
                  </svg>
                </button>
                <div class="action-btn-group">
                  <button class="action-btn" title="Open with..." @click.stop="toggleToolMenu(project.path, $event)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div
                    v-if="showToolMenu[project.path]"
                    :ref="el => { if (el) toolMenuRefs[project.path] = el as HTMLElement }"
                    class="tool-dropdown-menu"
                  >
                    <div class="tool-dropdown-title">Open with IDE</div>
                    <button
                      v-for="tool in installedIDETools"
                      :key="tool.name"
                      class="tool-dropdown-item"
                      :class="{ 'is-last-used': tool.name === project.lastUsedTool }"
                      @click="openWithTool(tool.name, project)"
                    >
                      <img v-if="tool.icon?.startsWith('data:')" :src="tool.icon" class="tool-icon" />
                      <span v-else class="tool-icon-text">{{ getToolIcon(tool) }}</span>
                      <span class="tool-name">{{ tool.displayName }}</span>
                      <span v-if="tool.name === project.lastUsedTool" class="last-used-badge">Last</span>
                    </button>
                  </div>
                </div>
                <button class="action-btn settings" title="Tool settings" @click.stop="emit('edit-project-tools', project)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="totalProjects === 0" class="no-projects">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
          />
        </svg>
        <p>No development projects found</p>
        <span>Try selecting a different folder</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ... existing styles ... */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 152px);
  text-align: center;
  animation: fade-slide-up 0.35s ease both;
}

.empty-icon {
  width: 54px;
  height: 54px;
  background: var(--surface-soft);
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: var(--text-subtle);
}

.empty-icon svg {
  width: 27px;
  height: 27px;
}

.empty-state h2 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 7px;
}

.empty-state p {
  font-size: 12px;
  color: var(--text-muted);
  max-width: 360px;
  margin-bottom: 18px;
  line-height: 1.55;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.stats-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: var(--surface-soft);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  margin-bottom: 14px;
  box-shadow: 0 6px 18px var(--shadow-1);
  animation: fade-slide-up 0.3s ease both;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.stat-label {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: var(--border-normal);
}

.view-toggle {
  display: inline-flex;
  background: var(--surface-soft);
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  padding: 3px;
  margin-bottom: 14px;
}

.toggle-btn {
  padding: 7px 12px;
  background: transparent;
  border: none;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.12s ease;
}

.toggle-btn:hover {
  color: var(--text-primary);
}

.toggle-btn.active {
  background: var(--toggle-active-bg);
  color: var(--text-primary);
  box-shadow: 0 2px 8px var(--shadow-1);
}

.categories {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.category-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: fade-slide-up 0.42s ease both;
}

.category-section:nth-child(2) {
  animation-delay: 0.05s;
}

.category-section:nth-child(3) {
  animation-delay: 0.09s;
}

.category-section:nth-child(4) {
  animation-delay: 0.13s;
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

.category-header h3 {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.category-count {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
}

.projects-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: fade-slide-up 0.42s ease both;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

.project-card {
  background: var(--card-bg);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 12px;
  transition: all 0.15s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.project-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
  border-radius: 12px;
}

.project-card:hover {
  background: var(--surface-hover);
  border-color: var(--border-normal);
  transform: translateY(-2px);
  box-shadow: 0 10px 18px var(--shadow-1);
}

.project-card:hover::before {
  opacity: 1;
}

.card-content {
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s ease;
  padding: 4px;
  margin: -4px;
}

.card-content:hover {
  background: rgba(255, 255, 255, 0.03);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.header-icons {
  display: flex;
  align-items: center;
  gap: 6px;
}

.project-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  word-break: break-all;
  flex: 1;
}

.git-icon {
  width: 14px;
  height: 14px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.last-tool {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-soft);
  border-radius: 5px;
  flex-shrink: 0;
}

.tool-icon-img {
  width: 14px;
  height: 14px;
}

.tool-icon-text {
  font-size: 10px;
}

.project-path {
  font-size: 10px;
  font-family: 'IBM Plex Mono', monospace;
  color: var(--text-subtle);
  word-break: break-all;
  line-height: 1.45;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  padding: 3px 8px;
  background: var(--surface-soft);
  border: 1px solid var(--border-normal);
  border-radius: 6px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.language-badge {
  background: transparent;
  border: 1px solid;
}

.type-badge {
  background: var(--surface-soft);
}

.card-actions {
  display: flex;
  gap: 5px;
  align-items: center;
}

.action-btn-group {
  position: relative;
}

.action-btn {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-soft);
  background: var(--surface-soft);
  color: var(--text-secondary);
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.12s ease;
}

.action-btn:hover {
  color: var(--text-primary);
  background: var(--surface-hover);
  border-color: var(--border-normal);
}

.action-btn.primary {
  background: var(--button-primary-bg);
  border-color: transparent;
  color: var(--button-primary-text);
}

.action-btn.primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.action-btn.vscode {
  color: #22d3ee;
}

.action-btn svg {
  width: 14px;
  height: 14px;
}

/* Tool Dropdown Menu */
.tool-dropdown-menu {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 6px;
  background: var(--card-bg);
  border: 1px solid var(--border-normal);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  min-width: 180px;
  z-index: 100;
  overflow: hidden;
}

.tool-dropdown-title {
  padding: 8px 12px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border-soft);
}

.tool-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  text-align: left;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.12s ease;
}

.tool-dropdown-item:hover {
  background: var(--surface-hover);
}

.tool-dropdown-item.is-last-used {
  background: rgba(250, 204, 21, 0.1);
}

.tool-dropdown-item.is-last-used:hover {
  background: rgba(250, 204, 21, 0.15);
}

.tool-dropdown-item .tool-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.tool-dropdown-item .tool-icon-text {
  font-size: 14px;
  width: 16px;
  text-align: center;
}

.tool-dropdown-item .tool-name {
  flex: 1;
}

.last-used-badge {
  padding: 2px 6px;
  background: linear-gradient(135deg, #facc15, #f59e0b);
  color: #1a1a1a;
  font-size: 9px;
  font-weight: 700;
  border-radius: 4px;
  text-transform: uppercase;
}

.no-projects {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 14px;
  text-align: center;
}

.no-projects svg {
  width: 36px;
  height: 36px;
  color: var(--text-subtle);
  margin-bottom: 10px;
}

.no-projects p {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.no-projects span {
  font-size: 12px;
  color: var(--text-muted);
}

@keyframes fade-slide-up {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 860px) {
  .projects-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
}
</style>
