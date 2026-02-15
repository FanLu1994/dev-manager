<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { ProjectInfo, ScanResult, ToolInfo, ToolsScanResult } from '../../preload/index'
import { useTheme } from './composables/useTheme'
import { getLanguageAccent, getCategoryAccent } from './constants/accent-colors'
import ProjectPanel from './components/ProjectPanel.vue'
import ToolsPanel from './components/ToolsPanel.vue'

type ProjectViewMode = 'language' | 'type'
type CurrentTab = 'projects' | 'tools'

const scanResult = ref<ScanResult | null>(null)
const toolsResult = ref<ToolsScanResult | null>(null)
const scanningProjects = ref(false)
const scanningTools = ref(false)
const currentView = ref<ProjectViewMode>('language')
const currentTab = ref<CurrentTab>('projects')
const { theme, initTheme, toggleTheme } = useTheme()

const groupedProjects = computed(() => {
  if (!scanResult.value) return {}
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
  await scanTools()
})

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
  } finally {
    scanningProjects.value = false
  }
}

async function scanTools(): Promise<void> {
  scanningTools.value = true
  try {
    toolsResult.value = await window.api.scanTools()
  } catch (error) {
    console.error('Tools scan failed:', error)
  } finally {
    scanningTools.value = false
  }
}

async function openProject(project: ProjectInfo): Promise<void> {
  await openProjectWith(window.api.openProject, project)
}

async function openWithVSCode(project: ProjectInfo): Promise<void> {
  await openProjectWith(window.api.openWithVSCode, project)
}

async function openTool(tool: ToolInfo): Promise<void> {
  await window.api.openTool(tool.name)
}

async function openProjectWith(
  opener: (path: string) => Promise<void>,
  project: ProjectInfo
): Promise<void> {
  await opener(project.path)
  await window.api.addRecentProject(project.name, project.path)
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
            <button
              v-if="currentTab === 'projects'"
              class="btn-primary"
              :disabled="scanningProjects"
              @click="selectFolder"
            >
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
            <button
              v-if="currentTab === 'tools'"
              class="btn-primary"
              :disabled="scanningTools"
              @click="scanTools"
            >
              <span v-if="!scanningTools" class="btn-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              </span>
              <span v-else class="btn-spinner"></span>
              <span>{{ scanningTools ? 'Scanning...' : 'Rescan Tools' }}</span>
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

      <!-- Tab Navigation -->
      <nav class="tab-nav">
        <button
          :class="['tab-btn', { active: currentTab === 'projects' }]"
          @click="currentTab = 'projects'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
            />
          </svg>
          <span>Projects</span>
        </button>
        <button
          :class="['tab-btn', { active: currentTab === 'tools' }]"
          @click="currentTab = 'tools'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
          <span>Tools</span>
        </button>
      </nav>

      <!-- Main -->
      <main class="app-main">
        <ProjectPanel
          v-if="currentTab === 'projects'"
          :scan-result="scanResult"
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
        />
        <ToolsPanel
          v-if="currentTab === 'tools'"
          :tools-result="toolsResult"
          :tools-stats="toolsStats"
          :tool-categories="toolCategories"
          :grouped-tools="groupedTools"
          :get-category-accent="getCategoryAccent"
          @open-tool="openTool"
        />
      </main>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.app-container * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.app-container {
  --bg-overlay-a: rgba(59, 130, 246, 0.16);
  --bg-overlay-b: rgba(139, 92, 246, 0.12);
  --bg-canvas: #0f1115;
  --text-primary: #f4f4f5;
  --text-secondary: #9ca0a6;
  --text-muted: #737478;
  --text-subtle: #6d6d70;
  --surface-header: rgba(24, 27, 34, 0.8);
  --surface-soft: rgba(255, 255, 255, 0.03);
  --surface-hover: rgba(255, 255, 255, 0.05);
  --surface-strong: rgba(255, 255, 255, 0.08);
  --card-bg: rgba(255, 255, 255, 0.02);
  --border-soft: rgba(255, 255, 255, 0.06);
  --border-normal: rgba(255, 255, 255, 0.1);
  --control-text: #737478;
  --shadow-1: rgba(0, 0, 0, 0.2);
  --shadow-2: rgba(0, 0, 0, 0.25);
  --button-primary-bg: #f4f4f5;
  --button-primary-text: #1c1c1e;
  --button-primary-hover-bg: #ffffff;
  --toggle-active-bg: #3a3a3c;

  min-height: 100vh;
  background:
    radial-gradient(1200px 600px at 15% -10%, var(--bg-overlay-a), transparent 55%),
    radial-gradient(1000px 500px at 100% 0%, var(--bg-overlay-b), transparent 50%), var(--bg-canvas);
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-container.theme-light {
  --bg-overlay-a: rgba(14, 116, 144, 0.16);
  --bg-overlay-b: rgba(15, 118, 110, 0.12);
  --bg-canvas: #f4f7fb;
  --text-primary: #111827;
  --text-secondary: #374151;
  --text-muted: #6b7280;
  --text-subtle: #9ca3af;
  --surface-header: rgba(245, 248, 252, 0.84);
  --surface-soft: rgba(255, 255, 255, 0.76);
  --surface-hover: rgba(241, 245, 249, 0.95);
  --surface-strong: rgba(226, 232, 240, 0.9);
  --card-bg: rgba(255, 255, 255, 0.92);
  --border-soft: rgba(148, 163, 184, 0.3);
  --border-normal: rgba(148, 163, 184, 0.4);
  --control-text: #64748b;
  --shadow-1: rgba(15, 23, 42, 0.08);
  --shadow-2: rgba(15, 23, 42, 0.12);
  --button-primary-bg: #111827;
  --button-primary-text: #f9fafb;
  --button-primary-hover-bg: #1f2937;
  --toggle-active-bg: #ffffff;
}

.app-shell {
  min-height: 100vh;
  overflow: hidden;
  background: transparent;
}

/* Header */
.app-header {
  background: var(--surface-header);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-soft);
  -webkit-app-region: drag;
  user-select: none;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.window-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.window-control {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--control-text);
  cursor: pointer;
  transition: all 0.1s ease;
}

.window-control:hover {
  background: var(--surface-strong);
  color: var(--text-primary);
}

.window-control.close:hover {
  background: #e81121;
  color: white;
}

.window-control svg {
  width: 12px;
  height: 12px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  -webkit-app-region: no-drag;
}

.brand-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.brand-icon svg {
  width: 20px;
  height: 20px;
}

.brand-text h1 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.brand-text span {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 10px;
  -webkit-app-region: no-drag;
}

/* Tab Navigation */
.tab-nav {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px 0;
  display: flex;
  gap: 6px;
  border-bottom: 1px solid var(--border-soft);
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
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
}

.tab-btn svg {
  width: 17px;
  height: 17px;
}

.btn-theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--surface-soft);
  color: var(--text-primary);
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  font-size: 12px;
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
  width: 14px;
  height: 14px;
}

/* Buttons */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  background: var(--button-primary-bg);
  color: var(--button-primary-text);
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.12s ease;
  box-shadow: 0 1px 3px var(--shadow-1);
}

.btn-primary:hover:not(:disabled) {
  background: var(--button-primary-hover-bg);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px var(--shadow-2);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary svg {
  width: 16px;
  height: 16px;
}

.btn-spinner {
  width: 14px;
  height: 14px;
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
  padding: 10px 20px;
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-normal);
  border-radius: 8px;
  font-size: 13px;
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
  padding: 24px 24px 60px;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 180px);
  text-align: center;
}

.empty-icon {
  width: 64px;
  height: 64px;
  background: var(--surface-soft);
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  color: var(--text-subtle);
}

.empty-icon svg {
  width: 32px;
  height: 32px;
}

.empty-state h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.empty-state p {
  font-size: 14px;
  color: var(--text-muted);
  max-width: 320px;
  margin-bottom: 24px;
  line-height: 1.6;
}

/* Results */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
  background: var(--surface-soft);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  margin-bottom: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: var(--border-normal);
}

/* View Toggle */
.view-toggle {
  display: inline-flex;
  background: var(--surface-soft);
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 24px;
}

.toggle-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
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
  box-shadow: 0 1px 2px var(--shadow-1);
}

/* Categories */
.categories {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.category-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.category-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.category-count {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

/* Projects Grid */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.project-card {
  background: var(--card-bg);
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  padding: 16px;
  transition: all 0.12s ease;
  cursor: default;
}

.project-card:hover {
  background: var(--surface-hover);
  border-color: var(--border-normal);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-1);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
}

.project-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  word-break: break-all;
}

.git-icon {
  width: 14px;
  height: 14px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.project-path {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-subtle);
  margin-bottom: 12px;
  word-break: break-all;
  line-height: 1.5;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  padding: 3px 8px;
  background: var(--surface-soft);
  border: 1px solid var(--border-normal);
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
}

.description {
  font-size: 11px;
  color: var(--text-muted);
}

/* Tools Grid */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.tool-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--surface-soft);
  border: 1px solid var(--border-normal);
  border-radius: 8px;
  transition: all 0.12s ease;
}

.tool-card-button {
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.tool-card-button:focus-visible {
  outline: 2px solid var(--text-subtle);
  outline-offset: 2px;
}

.tool-card:hover {
  background: var(--surface-hover);
  border-color: var(--border-normal);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px var(--shadow-1);
}

.tool-icon {
  font-size: 22px;
  flex-shrink: 0;
}

.tool-info {
  flex: 1;
  min-width: 0;
}

.tool-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
  letter-spacing: -0.01em;
}

.tool-version {
  font-size: 11px;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
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
  padding: 60px 20px;
  text-align: center;
}

.no-projects svg {
  width: 42px;
  height: 42px;
  color: var(--text-subtle);
  margin-bottom: 16px;
}

.no-projects p {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.no-projects span {
  font-size: 13px;
  color: var(--text-muted);
}

/* Scrollbar - Hidden */
.app-container *::-webkit-scrollbar {
  width: 0;
  height: 0;
  background: transparent;
}
</style>
