<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type {
  CachedProjectsResult,
  CachedToolsResult,
  UnknownToolCandidate,
  ProjectInfo,
  ScanResult,
  ToolInfo,
  ToolsScanResult
} from '../../preload/index'
import { useTheme } from './composables/useTheme'
import { getLanguageAccent, getCategoryAccent } from './constants/accent-colors'
import ProjectPanel from './components/ProjectPanel.vue'
import ToolsModal from './components/ToolsModal.vue'

type ProjectViewMode = 'all' | 'language' | 'type'
type NoticeType = 'info' | 'warning' | 'error'

interface UiNotice {
  type: NoticeType
  message: string
}

type ProjectToolSelectionMap = Record<string, string[]>

const PROJECT_TOOL_SELECTIONS_KEY = 'dev-manager-project-tool-selections'

const scanResult = ref<ScanResult | null>(null)
const toolsResult = ref<ToolsScanResult | null>(null)
const scanningProjects = ref(false)
const scanningTools = ref(false)
const currentView = ref<ProjectViewMode>('all')
const toolsModalVisible = ref(false)
const uiNotice = ref<UiNotice | null>(null)
const selectingProject = ref<ProjectInfo | null>(null)
const selectingToolNames = ref<string[]>([])
const selectorAutoOpen = ref(false)
const projectToolSelections = ref<ProjectToolSelectionMap>({})
const unknownCandidates = ref<UnknownToolCandidate[]>([])
const selectedUnknownToolCommands = ref<string[]>([])
const confirmingUnknownTools = ref(false)
const { theme, initTheme, toggleTheme } = useTheme()

const groupedProjects = computed(() => {
  if (!scanResult.value) return {}
  if (currentView.value === 'all') {
    return { all: scanResult.value.projects }
  }
  return currentView.value === 'language' ? scanResult.value.byLanguage : scanResult.value.byType
})

const groupedTools = computed(() => {
  if (!toolsResult.value) return {}
  return toolsResult.value.byCategory
})

const projectCategories = computed(() => {
  return Object.keys(groupedProjects.value).sort()
})

const toolCategories = computed(() => {
  return Object.keys(groupedTools.value).sort()
})

const totalProjects = computed(() => {
  return scanResult.value?.projects.length ?? 0
})

const toolsStats = computed(() => {
  return toolsResult.value?.stats ?? { installed: 0, total: 0, categories: 0, percentage: 0 }
})

onMounted(async () => {
  initTheme()
  loadProjectToolSelections()
  await loadCachedProjects()
  await loadCachedTools()
})

async function loadCachedProjects(): Promise<void> {
  const cached = (await window.api.getCachedProjects()) as CachedProjectsResult | null
  if (!cached) return

  scanResult.value = {
    projects: cached.projects,
    byLanguage: cached.byLanguage,
    byType: cached.byType
  }
}

async function loadCachedTools(): Promise<void> {
  const cached = (await window.api.getCachedTools()) as CachedToolsResult | null
  if (!cached) return
  toolsResult.value = {
    tools: cached.tools,
    byCategory: cached.byCategory,
    stats: cached.stats,
    unknownCandidates: cached.unknownCandidates
  }
}

async function selectFolder(): Promise<void> {
  const folder = await window.api.selectFolder()
  if (folder) {
    await scanProjects(folder)
  }
}

async function scanProjects(folderPath: string): Promise<void> {
  scanningProjects.value = true
  try {
    scanResult.value = await window.api.scanProjects(folderPath)
  } catch (error) {
    console.error('Scan failed:', error)
    showNotice('error', '扫描项目失败，请重试')
  } finally {
    scanningProjects.value = false
  }
}

async function scanTools(): Promise<void> {
  scanningTools.value = true
  try {
    toolsResult.value = await window.api.scanTools()
    const candidates = toolsResult.value.unknownCandidates || []
    unknownCandidates.value = candidates
    selectedUnknownToolCommands.value = []
  } catch (error) {
    console.error('Tools scan failed:', error)
    showNotice('error', '扫描开发工具失败，请重试')
  } finally {
    scanningTools.value = false
  }
}

function openToolsModal(): void {
  toolsModalVisible.value = true
}

function closeToolsModal(): void {
  toolsModalVisible.value = false
}

function closeUnknownToolsModal(): void {
  unknownCandidates.value = []
  selectedUnknownToolCommands.value = []
}

function toggleUnknownToolSelection(command: string): void {
  if (selectedUnknownToolCommands.value.includes(command)) {
    selectedUnknownToolCommands.value = selectedUnknownToolCommands.value.filter(
      (item) => item !== command
    )
    return
  }
  selectedUnknownToolCommands.value = [...selectedUnknownToolCommands.value, command]
}

async function confirmUnknownToolsFromUi(): Promise<void> {
  if (confirmingUnknownTools.value) return

  const selected = unknownCandidates.value.filter((candidate) =>
    selectedUnknownToolCommands.value.includes(candidate.command)
  )
  confirmingUnknownTools.value = true
  try {
    if (selected.length > 0) {
      await window.api.confirmUnknownTools(selected)
      showNotice('info', `已添加 ${selected.length} 个开发工具`)
    } else {
      showNotice('info', '已跳过新增开发工具')
    }
    closeUnknownToolsModal()
    await scanTools()
  } catch (error) {
    console.error('Confirm unknown tools failed:', error)
    showNotice('error', '确认新增开发工具失败，请重试')
  } finally {
    confirmingUnknownTools.value = false
  }
}

async function openProject(project: ProjectInfo): Promise<void> {
  await openProjectWithSelectedTools(project)
}

async function openWithVSCode(project: ProjectInfo): Promise<void> {
  await openProjectWith(window.api.openWithVSCode, project)
}

async function openProjectWithTool(toolName: string, project: ProjectInfo): Promise<void> {
  const exists = await window.api.checkProjectExists(project.path)
  if (!exists) {
    showNotice('warning', `项目不存在：${project.path}`)
    return
  }

  try {
    await window.api.openProjectWithTool(toolName, project.path)
    await window.api.addRecentProject(project.name, project.path)
    showNotice('info', `已使用 ${toolName} 打开项目`)
  } catch (error) {
    console.error(`Failed to open project with tool: ${toolName}`, error)
    showNotice('error', `打开失败：${toolName}`)
  }
}

async function openTool(tool: ToolInfo): Promise<void> {
  await window.api.openTool(tool.name)
}

async function openProjectWith(
  opener: (path: string) => Promise<void>,
  project: ProjectInfo
): Promise<void> {
  const exists = await window.api.checkProjectExists(project.path)
  if (!exists) {
    showNotice('warning', `项目不存在：${project.path}`)
    return
  }

  await opener(project.path)
  await window.api.addRecentProject(project.name, project.path)
}

async function openProjectWithSelectedTools(project: ProjectInfo): Promise<void> {
  const exists = await window.api.checkProjectExists(project.path)
  if (!exists) {
    showNotice('warning', `项目不存在：${project.path}`)
    return
  }

  const cachedTools = projectToolSelections.value[project.path] || []
  if (cachedTools.length === 0) {
    openToolSelector(project, true)
    return
  }

  await openProjectInTools(project, cachedTools)
}

function openToolSelector(project: ProjectInfo, autoOpen: boolean): void {
  const availableTools = toolsResult.value?.tools || []
  if (availableTools.length === 0) {
    showNotice('warning', '当前没有可用开发工具，请先扫描工具')
    return
  }

  selectingProject.value = project
  selectingToolNames.value = [...(projectToolSelections.value[project.path] || [])]
  selectorAutoOpen.value = autoOpen
}

function toggleSelectingTool(toolName: string): void {
  if (selectingToolNames.value.includes(toolName)) {
    selectingToolNames.value = selectingToolNames.value.filter((name) => name !== toolName)
    return
  }
  selectingToolNames.value = [...selectingToolNames.value, toolName]
}

async function confirmToolSelection(): Promise<void> {
  const project = selectingProject.value
  if (!project) return

  if (selectingToolNames.value.length === 0) {
    showNotice('warning', '请至少选择一个开发工具')
    return
  }

  projectToolSelections.value = {
    ...projectToolSelections.value,
    [project.path]: [...selectingToolNames.value]
  }
  saveProjectToolSelections()

  const shouldAutoOpen = selectorAutoOpen.value
  closeToolSelector()

  if (shouldAutoOpen) {
    await openProjectInTools(project, projectToolSelections.value[project.path])
  } else {
    showNotice('info', '开发工具选择已保存，后续将按此配置打开')
  }
}

function closeToolSelector(): void {
  selectingProject.value = null
  selectingToolNames.value = []
  selectorAutoOpen.value = false
}

async function openProjectInTools(project: ProjectInfo, toolNames: string[]): Promise<void> {
  const failedTools: string[] = []

  for (const toolName of toolNames) {
    try {
      await window.api.openProjectWithTool(toolName, project.path)
    } catch (error) {
      console.error(`Failed to open project with tool: ${toolName}`, error)
      failedTools.push(toolName)
    }
  }

  if (failedTools.length === toolNames.length) {
    try {
      await window.api.openProject(project.path)
      await window.api.addRecentProject(project.name, project.path)
      showNotice('warning', '所选开发工具启动失败，已回退为默认方式打开项目')
    } catch (fallbackError) {
      console.error('Fallback open project failed:', fallbackError)
      showNotice('error', '打开失败：所选开发工具均未成功启动')
    }
    return
  }

  await window.api.addRecentProject(project.name, project.path)
  if (failedTools.length > 0) {
    showNotice('warning', `部分工具打开失败：${failedTools.join(', ')}`)
    return
  }
  showNotice('info', `已使用 ${toolNames.length} 个开发工具打开项目`)
}

function editProjectTools(project: ProjectInfo): void {
  openToolSelector(project, false)
}

function loadProjectToolSelections(): void {
  try {
    const raw = localStorage.getItem(PROJECT_TOOL_SELECTIONS_KEY)
    if (!raw) return

    const parsed = JSON.parse(raw) as ProjectToolSelectionMap
    if (!parsed || typeof parsed !== 'object') return
    projectToolSelections.value = parsed
  } catch {
    projectToolSelections.value = {}
  }
}

function saveProjectToolSelections(): void {
  localStorage.setItem(PROJECT_TOOL_SELECTIONS_KEY, JSON.stringify(projectToolSelections.value))
}

function showNotice(type: NoticeType, message: string): void {
  uiNotice.value = { type, message }
}

function windowMinimize(): void {
  window.api.windowMinimize()
}

function windowMaximize(): void {
  window.api.windowMaximize()
}

function windowClose(): void {
  window.api.windowClose()
}
</script>

<template>
  <div class="app-container" :class="`theme-${theme}`" :data-theme="theme">
    <div class="app-shell">
      <!-- Header -->
      <header class="app-header">
        <div class="header-content">
          <div class="brand">
            <div class="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                />
              </svg>
            </div>
            <div class="brand-text">
              <h1>Dev Manager</h1>
              <span>Projects & Tools</span>
            </div>
          </div>
          <div class="header-actions">
            <button
              class="btn-theme-toggle"
              :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
              @click="toggleTheme"
            >
              <svg
                v-if="theme === 'dark'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 3v2.25M12 18.75V21M4.636 4.636l1.591 1.591M17.773 17.773l1.591 1.591M3 12h2.25M18.75 12H21M4.636 19.364l1.591-1.591M17.773 6.227l1.591-1.591M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M21.752 15.002A9.718 9.718 0 0112 21c-5.385 0-9.75-4.365-9.75-9.75 0-4.27 2.744-7.9 6.565-9.222.293-.101.594.171.521.472a7.501 7.501 0 009.472 9.472c.301-.073.573.228.472.521a9.753 9.753 0 012.472 2.509z"
                />
              </svg>
              <span>{{ theme === 'dark' ? 'Light' : 'Dark' }}</span>
            </button>
            <button class="btn-primary" :disabled="scanningProjects" @click="selectFolder">
              <span v-if="!scanningProjects" class="btn-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"
                  />
                </svg>
              </span>
              <span v-else class="btn-spinner"></span>
              <span>{{ scanningProjects ? 'Scanning...' : 'Select Folder' }}</span>
            </button>
            <button class="btn-outline" @click="openToolsModal">
              <span class="btn-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </span>
              <span>Tools</span>
            </button>
          </div>
          <!-- Window Controls -->
          <div class="window-controls">
            <button class="window-control" title="Minimize" @click="windowMinimize">
              <svg viewBox="0 0 12 12" fill="currentColor">
                <rect x="2" y="9" width="8" height="1" rx="0.5" />
              </svg>
            </button>
            <button class="window-control" title="Maximize" @click="windowMaximize">
              <svg viewBox="0 0 12 12" fill="currentColor">
                <rect
                  x="2"
                  y="2"
                  width="8"
                  height="8"
                  rx="1"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="0.8"
                />
              </svg>
            </button>
            <button class="window-control close" title="Close" @click="windowClose">
              <svg viewBox="0 0 12 12" fill="currentColor">
                <path
                  d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5"
                  stroke="currentColor"
                  stroke-width="1"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div v-if="uiNotice" :class="['notice-bar', uiNotice.type]">
        <span>{{ uiNotice.message }}</span>
        <button class="notice-close" @click="uiNotice = null">×</button>
      </div>

      <!-- Main -->
      <main class="app-main">
        <ProjectPanel
          :scan-result="scanResult"
          :tools-result="toolsResult"
          :scanning-projects="scanningProjects"
          :total-projects="totalProjects"
          :current-view="currentView"
          :project-categories="projectCategories"
          :grouped-projects="groupedProjects"
          :get-language-accent="getLanguageAccent"
          @select-folder="selectFolder"
          @update:view="currentView = $event"
          @open-project="openProject"
          @open-vscode="openWithVSCode"
          @open-project-with-tool="openProjectWithTool"
          @edit-project-tools="editProjectTools"
        />
      </main>
    </div>

    <ToolsModal
      :visible="toolsModalVisible"
      :tools-result="toolsResult"
      :tools-stats="toolsStats"
      :tool-categories="toolCategories"
      :grouped-tools="groupedTools"
      :scanning-tools="scanningTools"
      :get-category-accent="getCategoryAccent"
      @close="closeToolsModal"
      @scan-tools="scanTools"
      @open-tool="openTool"
    />

    <div v-if="selectingProject" class="modal-overlay" @click.self="closeToolSelector">
      <div class="modal-card">
        <h3>Select Tools for {{ selectingProject.name }}</h3>
        <p>初次可多选，后续会缓存此项目的工具选择；你也可以随时修改。</p>

        <div class="modal-tools">
          <label v-for="tool in toolsResult?.tools || []" :key="tool.name" class="modal-tool-item">
            <input
              type="checkbox"
              :checked="selectingToolNames.includes(tool.name)"
              @change="toggleSelectingTool(tool.name)"
            />
            <span>{{ tool.displayName }}</span>
          </label>
        </div>

        <div class="modal-actions">
          <button class="btn-outline" @click="closeToolSelector">Cancel</button>
          <button class="btn-primary" @click="confirmToolSelection">Save</button>
        </div>
      </div>
    </div>

    <div
      v-if="unknownCandidates.length > 0"
      class="modal-overlay"
      @click.self="closeUnknownToolsModal"
    >
      <div class="modal-card">
        <h3>确认新增开发工具</h3>
        <p>检测到未识别的工具命令，请勾选需要加入的工具（支持多选）。</p>

        <div class="unknown-tools-list">
          <label
            v-for="candidate in unknownCandidates"
            :key="candidate.command + candidate.sourcePath"
            class="unknown-tool-item"
          >
            <input
              type="checkbox"
              :checked="selectedUnknownToolCommands.includes(candidate.command)"
              @change="toggleUnknownToolSelection(candidate.command)"
            />
            <div class="unknown-tool-text">
              <span class="unknown-tool-command">{{ candidate.command }}</span>
              <span class="unknown-tool-path">{{ candidate.sourcePath }}</span>
            </div>
          </label>
        </div>

        <div class="modal-actions">
          <button
            class="btn-outline"
            :disabled="confirmingUnknownTools"
            @click="closeUnknownToolsModal"
          >
            Skip
          </button>
          <button
            class="btn-primary"
            :disabled="confirmingUnknownTools"
            @click="confirmUnknownToolsFromUi"
          >
            {{ confirmingUnknownTools ? 'Saving...' : 'Add Selected' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

.app-container * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.app-container {
  --bg-canvas: #0b1420;
  --bg-overlay-a: rgba(255, 124, 67, 0.18);
  --bg-overlay-b: rgba(34, 211, 238, 0.2);
  --bg-overlay-c: rgba(16, 185, 129, 0.12);
  --text-primary: #eef5ff;
  --text-secondary: #c7d3e2;
  --text-muted: #91a2b7;
  --text-subtle: #688099;
  --surface-header: rgba(8, 16, 26, 0.76);
  --surface-soft: rgba(255, 255, 255, 0.04);
  --surface-hover: rgba(255, 255, 255, 0.07);
  --surface-strong: rgba(255, 255, 255, 0.11);
  --card-bg: rgba(7, 18, 31, 0.54);
  --border-soft: rgba(164, 195, 221, 0.22);
  --border-normal: rgba(164, 195, 221, 0.34);
  --control-text: #8ea5bd;
  --shadow-1: rgba(2, 8, 18, 0.3);
  --shadow-2: rgba(2, 8, 18, 0.45);
  --button-primary-bg: linear-gradient(130deg, #ff7c43 0%, #ff9b66 45%, #22d3ee 100%);
  --button-primary-text: #0b1420;
  --button-primary-hover-bg: linear-gradient(130deg, #ff8b59 0%, #ffab7f 45%, #67e8f9 100%);
  --toggle-active-bg: rgba(255, 255, 255, 0.14);
  --accent-ring: rgba(255, 163, 109, 0.5);

  min-height: 100vh;
  background:
    radial-gradient(900px 460px at -6% -12%, var(--bg-overlay-a), transparent 60%),
    radial-gradient(860px 460px at 100% -18%, var(--bg-overlay-b), transparent 56%),
    radial-gradient(780px 400px at 52% 112%, var(--bg-overlay-c), transparent 54%), var(--bg-canvas);
  font-family: 'Sora', 'Segoe UI', sans-serif;
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-container.theme-light {
  --bg-canvas: #f5f9ff;
  --bg-overlay-a: rgba(251, 146, 60, 0.23);
  --bg-overlay-b: rgba(6, 182, 212, 0.2);
  --bg-overlay-c: rgba(20, 184, 166, 0.13);
  --text-primary: #10253b;
  --text-secondary: #29445f;
  --text-muted: #4f6780;
  --text-subtle: #68829e;
  --surface-header: rgba(245, 251, 255, 0.8);
  --surface-soft: rgba(255, 255, 255, 0.7);
  --surface-hover: rgba(255, 255, 255, 0.95);
  --surface-strong: rgba(255, 255, 255, 0.98);
  --card-bg: rgba(255, 255, 255, 0.88);
  --border-soft: rgba(117, 148, 179, 0.26);
  --border-normal: rgba(117, 148, 179, 0.36);
  --control-text: #5c7087;
  --shadow-1: rgba(17, 44, 72, 0.1);
  --shadow-2: rgba(17, 44, 72, 0.18);
  --button-primary-text: #10253b;
  --toggle-active-bg: rgba(16, 37, 59, 0.08);
  --accent-ring: rgba(249, 115, 22, 0.32);
}

.app-shell {
  min-height: 100vh;
  overflow: hidden;
  background: transparent;
}

/* Header */
.app-header {
  background: var(--surface-header);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border-soft);
  -webkit-app-region: drag;
  user-select: none;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  animation: fade-slide-up 0.35s ease both;
}

.window-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  -webkit-app-region: no-drag;
}

.window-control {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 5px;
  color: var(--control-text);
  cursor: pointer;
  transition: all 0.1s ease;
}

.window-control:hover {
  background: var(--surface-strong);
  color: var(--text-primary);
}

.window-control.close:hover {
  background: #ef4444;
  color: #fff;
}

.window-control svg {
  width: 11px;
  height: 11px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  -webkit-app-region: no-drag;
}

.brand-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(140deg, #ff7c43, #22d3ee);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 6px 14px rgba(34, 211, 238, 0.28);
}

.brand-icon svg {
  width: 17px;
  height: 17px;
}

.brand-text h1 {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.brand-text span {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 500;
  letter-spacing: 0.02em;
}

.header-actions {
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.notice-bar {
  max-width: 1200px;
  margin: 8px auto 0;
  padding: 8px 12px;
  border-radius: 9px;
  border: 1px solid var(--border-normal);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  animation: fade-slide-up 0.25s ease both;
}

.notice-bar.info {
  background: rgba(34, 211, 238, 0.14);
}

.notice-bar.warning {
  background: rgba(251, 146, 60, 0.18);
}

.notice-bar.error {
  background: rgba(239, 68, 68, 0.16);
}

.notice-close {
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 15px;
  cursor: pointer;
}

/* Tab Navigation */
.tab-nav {
  max-width: 1200px;
  margin: 0 auto;
  padding: 10px 20px 0;
  display: flex;
  gap: 6px;
  border-bottom: 1px solid var(--border-soft);
  animation: fade-slide-up 0.4s ease both;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.12s ease;
}

.tab-btn:hover {
  color: var(--text-secondary);
  background: var(--surface-soft);
}

.tab-btn.active {
  color: var(--text-primary);
  background: var(--surface-strong);
  box-shadow: 0 3px 10px var(--shadow-1);
}

.tab-btn svg {
  width: 15px;
  height: 15px;
}

.btn-theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 11px;
  background: var(--surface-soft);
  color: var(--text-primary);
  border: 1px solid var(--border-soft);
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-theme-toggle:hover {
  background: var(--surface-hover);
  border-color: var(--border-normal);
  transform: translateY(-1px);
}

.btn-theme-toggle svg {
  width: 13px;
  height: 13px;
}

/* Buttons */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 13px;
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  border: 1px solid transparent;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.12s ease;
  box-shadow: 0 4px 10px rgba(34, 211, 238, 0.2);
}

.btn-primary:hover:not(:disabled) {
  background: var(--button-primary-hover-bg);
  transform: translateY(-1px);
  box-shadow: 0 7px 14px rgba(249, 115, 22, 0.28);
}

.btn-primary:disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
}

.btn-primary svg {
  width: 15px;
  height: 15px;
}

.btn-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-normal);
  border-radius: 9px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.12s ease;
}

.btn-outline:hover {
  background: var(--surface-hover);
  border-color: var(--border-normal);
}

/* Main */
.app-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px 20px 28px;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

/* Empty State */
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

/* Results */
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

/* View Toggle */
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

/* Categories */
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

/* Projects Grid */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 9px;
}

.project-card {
  background: var(--card-bg);
  border: 1px solid var(--border-soft);
  border-radius: 11px;
  padding: 12px;
  transition: all 0.15s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.project-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  opacity: 0;
  transition: opacity 0.15s ease;
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

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 6px;
  gap: 7px;
}

.project-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  word-break: break-all;
}

.git-icon {
  width: 13px;
  height: 13px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.project-path {
  font-size: 10px;
  font-family: 'IBM Plex Mono', monospace;
  color: var(--text-subtle);
  margin-bottom: 10px;
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
  padding: 2px 7px;
  background: var(--surface-soft);
  border: 1px solid var(--border-normal);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
}

.description {
  font-size: 10px;
  color: var(--text-muted);
}

.card-actions {
  margin-top: 10px;
  display: flex;
  gap: 6px;
}

.action-btn {
  width: 26px;
  height: 26px;
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
  transform: translateY(-1px);
}

.action-btn svg {
  width: 13px;
  height: 13px;
}

.action-btn.vscode {
  color: #22d3ee;
}

/* Tools Grid */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 8px;
}

.tool-card {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 11px;
  background: var(--surface-soft);
  border: 1px solid var(--border-normal);
  border-radius: 10px;
  transition: all 0.14s ease;
}

.tool-card-button {
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.tool-card-button:focus-visible {
  outline: 2px solid var(--accent-ring);
  outline-offset: 2px;
}

.tool-card:hover {
  background: var(--surface-hover);
  transform: translateY(-1px);
  box-shadow: 0 8px 14px var(--shadow-1);
}

.tool-icon {
  font-size: 19px;
  flex-shrink: 0;
}

.tool-info {
  flex: 1;
  min-width: 0;
}

.tool-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 1px;
}

.tool-version {
  font-size: 10px;
  color: var(--text-muted);
  font-family: 'IBM Plex Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* No Projects */
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

/* Scrollbar - Hidden */
.app-container *::-webkit-scrollbar {
  width: 0;
  height: 0;
  background: transparent;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 12, 22, 0.62);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-card {
  width: min(560px, 100%);
  max-height: 80vh;
  overflow: auto;
  background: var(--bg-canvas);
  border: 1px solid var(--border-normal);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 16px 34px var(--shadow-2);
}

.modal-card h3 {
  font-size: 16px;
}

.modal-card p {
  font-size: 12px;
  color: var(--text-muted);
}

.modal-tools {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.modal-tool-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 9px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: var(--surface-soft);
  font-size: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.unknown-tools-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow: auto;
}

.unknown-tool-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: var(--surface-soft);
}

.unknown-tool-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.unknown-tool-command {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
}

.unknown-tool-path {
  font-size: 10px;
  color: var(--text-muted);
  font-family: 'IBM Plex Mono', monospace;
  word-break: break-all;
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
  .header-content {
    padding: 10px 14px;
  }

  .header-actions {
    gap: 6px;
  }

  .tab-nav {
    padding: 8px 14px 0;
  }

  .app-main {
    padding: 12px 14px 20px;
  }

  .projects-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }

  .tools-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }

  .modal-tools {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .brand-text span {
    display: none;
  }

  .window-controls {
    display: none;
  }

  .btn-theme-toggle span {
    display: none;
  }

  .tab-btn span {
    display: none;
  }

  .tab-btn {
    padding: 8px 10px;
  }

  .stats-bar {
    flex-wrap: wrap;
    gap: 8px 12px;
  }

  .stat-divider {
    display: none;
  }
}
</style>
