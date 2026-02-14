<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { ProjectInfo, ScanResult, ToolsScanResult } from '../../preload/index'

const scanResult = ref<ScanResult | null>(null)
const toolsResult = ref<ToolsScanResult | null>(null)
const loading = ref(false)
const currentView = ref('language')
const currentTab = ref('projects') // 'projects' | 'tools'
const selectedFolder = ref<string | null>(null)

const groupedProjects = computed(() => {
  if (!scanResult.value) return {}
  return currentView.value === 'language'
    ? scanResult.value.byLanguage
    : scanResult.value.byType
})

const groupedTools = computed(() => {
  if (!toolsResult.value) return {}
  return toolsResult.value.byCategory
})

const categories = computed(() => {
  return currentTab.value === 'tools'
    ? Object.keys(groupedTools.value).sort()
    : Object.keys(groupedProjects.value).sort()
})

const totalProjects = computed(() => {
  return scanResult.value?.projects.length || 0
})



const toolsStats = computed(() => {
  return toolsResult.value?.stats || { installed: 0, total: 0, categories: 0, percentage: 0 }
})

onMounted(async () => {
  // 自动扫描工具
  await scanTools()
})

async function selectFolder() {
  const folder = await window.api.selectFolder()
  if (folder) {
    selectedFolder.value = folder
    await scanProjects(folder)
  }
}

async function scanProjects(folderPath: string) {
  loading.value = true
  try {
    scanResult.value = await window.api.scanProjects(folderPath)
  } catch (error) {
    console.error('Scan failed:', error)
  } finally {
    loading.value = false
  }
}

async function scanTools() {
  loading.value = true
  try {
    toolsResult.value = await window.api.scanTools()
  } catch (error) {
    console.error('Tools scan failed:', error)
  } finally {
    loading.value = false
  }
}

async function openProject(project: ProjectInfo) {
  await window.api.openProject(project.path)
  // 添加到最近项目
  await window.api.addRecentProject(project.name, project.path)
}

async function openWithVSCode(project: ProjectInfo) {
  await window.api.openWithVSCode(project.path)
  // 添加到最近项目
  await window.api.addRecentProject(project.name, project.path)
}

function getLanguageAccent(language: string): string {
  const accents: Record<string, string> = {
    'JavaScript/TypeScript': '#f7df1e',
    'Python': '#3776ab',
    'Go': '#00add8',
    'Rust': '#dea584',
    'Ruby': '#cc342d',
    'Java': '#007396',
    'C#': '#512bd4',
    'PHP': '#777bb3',
    'Dart': '#0175c2',
    'Swift': '#f05138',
    'C/C++': '#00599c',
    'Unknown': '#6b7280'
  }
  return accents[language] || '#6b7280'
}

function getCategoryAccent(category: string): string {
  const accents: Record<string, string> = {
    IDE: '#ef4444',
    CLI: '#3b82f6'
  }
  return accents[category] || '#6b7280'
}

function windowMinimize() {
  window.api.windowMinimize()
}

function windowMaximize() {
  window.api.windowMaximize()
}

function windowClose() {
  window.api.windowClose()
}
</script>

<template>
  <div class="app-container">
    <div class="app-shell">
      <!-- Header -->
      <header class="app-header">
        <div class="header-content">
        <div class="brand">
          <div class="brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </div>
          <div class="brand-text">
            <h1>Dev Manager</h1>
            <span>Projects & Tools</span>
          </div>
        </div>
        <div class="header-actions">
          <button v-if="currentTab === 'projects'" class="btn-primary" @click="selectFolder" :disabled="loading">
            <span v-if="!loading" class="btn-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
              </svg>
            </span>
            <span v-else class="btn-spinner"></span>
            <span>{{ loading ? 'Scanning...' : 'Select Folder' }}</span>
          </button>
          <button v-if="currentTab === 'tools'" class="btn-primary" @click="scanTools" :disabled="loading">
            <span v-if="!loading" class="btn-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </span>
            <span v-else class="btn-spinner"></span>
            <span>{{ loading ? 'Scanning...' : 'Rescan Tools' }}</span>
          </button>
        </div>
          <!-- Window Controls -->
          <div class="window-controls">
            <button class="window-control" @click="windowMinimize" title="Minimize">
              <svg viewBox="0 0 12 12" fill="currentColor">
                <rect x="2" y="9" width="8" height="1" rx="0.5"/>
              </svg>
            </button>
            <button class="window-control" @click="windowMaximize" title="Maximize">
              <svg viewBox="0 0 12 12" fill="currentColor">
                <rect x="2" y="2" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="0.8"/>
              </svg>
            </button>
            <button class="window-control close" @click="windowClose" title="Close">
              <svg viewBox="0 0 12 12" fill="currentColor">
                <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <!-- Tab Navigation -->
      <nav class="tab-nav">
      <button
        @click="currentTab = 'projects'"
        :class="['tab-btn', { active: currentTab === 'projects' }]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        <span>Projects</span>
      </button>
      <button
        @click="currentTab = 'tools'"
        :class="['tab-btn', { active: currentTab === 'tools' }]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
        <span>Tools</span>
      </button>
      </nav>

      <!-- Main -->
      <main class="app-main">
      <!-- Projects Tab -->
      <div v-if="currentTab === 'projects'">
        <!-- Empty State -->
        <div v-if="!scanResult && !loading" class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
            </svg>
          </div>
          <h2>Select Project Directory</h2>
          <p>Choose a folder containing your development projects to automatically identify and categorize them.</p>
          <button class="btn-outline" @click="selectFolder">Browse Folders</button>
        </div>

        <!-- Results -->
        <div v-if="scanResult" class="results">
          <!-- Stats Bar -->
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

          <!-- View Toggle -->
          <div class="view-toggle">
            <button
              @click="currentView = 'language'"
              :class="['toggle-btn', { active: currentView === 'language' }]"
            >
              <span>By Language</span>
            </button>
            <button
              @click="currentView = 'type'"
              :class="['toggle-btn', { active: currentView === 'type' }]"
            >
              <span>By Type</span>
            </button>
          </div>

          <!-- Categories -->
          <div class="categories">
            <div v-for="category in categories" :key="category" class="category-section">
              <div class="category-header">
                <div class="category-info">
                  <span
                    class="category-dot"
                    :style="{ backgroundColor: getLanguageAccent(category) }"
                  ></span>
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
                  <div class="card-header">
                    <h4 class="project-name">{{ project.name }}</h4>
                    <svg v-if="project.hasGit" class="git-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </div>
                  <p class="project-path">{{ project.path }}</p>
                  <div class="card-footer">
                    <span class="badge">{{ project.type }}</span>
                    <span v-if="project.description" class="description">{{ project.description }}</span>
                  </div>
                  <div class="card-actions">
                    <button class="action-btn" @click="openProject(project)" title="Open">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                      </svg>
                    </button>
                    <button class="action-btn vscode" @click="openWithVSCode(project)" title="Open with VS Code">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-.39.015l-2.4 2.4a1.06 1.06 0 0 0 .293 1.414l1.35 2.22-2.3 2.3a1.06 1.06 0 0 0-.293-1.414l-1.35-2.22a.999.999 0 0 0 .39-.015l2.4-2.4a1.06 1.06 0 0 0-.293-1.414l-1.349-2.22 2.3-2.3a1.06 1.06 0 0 0 .293 1.414l1.35 2.22a.999.999 0 0 0-.39.015l-2.4 2.4a1.06 1.06 0 0 0 .293 1.414l1.349 2.22 9.46-8.63a1.492 1.492 0 0 0 1.704-.29l4.94-2.58 9.46 8.63a1.492 1.492 0 0 0 1.704-.29l4.94-2.58z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- No Projects -->
          <div v-if="totalProjects === 0" class="no-projects">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
            <p>No development projects found</p>
            <span>Try selecting a different folder</span>
          </div>
        </div>
      </div>

      <!-- Tools Tab -->
      <div v-if="currentTab === 'tools'">
        <div v-if="toolsResult" class="results">
          <!-- Stats Bar -->
          <div class="stats-bar">
            <div class="stat-item">
              <span class="stat-label">Installed</span>
              <span class="stat-value">{{ toolsStats.installed }}/{{ toolsStats.total }}</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-label">Coverage</span>
              <span class="stat-value">{{ toolsStats.percentage }}%</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-label">Categories</span>
              <span class="stat-value">{{ toolsStats.categories }}</span>
            </div>
          </div>

          <!-- Categories -->
          <div class="categories">
            <div v-for="category in categories" :key="category" class="category-section">
              <div class="category-header">
                <div class="category-info">
                  <span
                    class="category-dot"
                    :style="{ backgroundColor: getCategoryAccent(category) }"
                  ></span>
                  <h3>{{ category }}</h3>
                </div>
                <span class="category-count">{{ groupedTools[category].filter(t => t.installed).length }}/{{ groupedTools[category].length }}</span>
              </div>

              <div class="tools-grid">
                <div
                  v-for="tool in groupedTools[category]"
                  :key="tool.name"
                  :class="['tool-card', { installed: tool.installed }]"
                >
                  <div class="tool-icon">{{ tool.icon }}</div>
                  <div class="tool-info">
                    <h4 class="tool-name">{{ tool.displayName }}</h4>
                    <p v-if="tool.version" class="tool-version">{{ tool.version }}</p>
                    <p v-else class="tool-status">Not installed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:deep(*) {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.app-container {
  min-height: 100vh;
  background:
    radial-gradient(1200px 600px at 15% -10%, rgba(59, 130, 246, 0.16), transparent 55%),
    radial-gradient(1000px 500px at 100% 0%, rgba(139, 92, 246, 0.12), transparent 50%),
    #0f1115;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #e7e9ee;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-shell {
  min-height: 100vh;
  overflow: hidden;
  background: transparent;
}

/* Header */
.app-header {
  background: rgba(24, 27, 34, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
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
  color: #737478;
  cursor: pointer;
  transition: all 0.1s ease;
}

.window-control:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #f4f4f5;
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
  color: #f4f4f5;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.brand-text span {
  font-size: 11px;
  color: #737478;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 10px;
  -webkit-app-region: no-drag;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  -webkit-app-region: no-drag;
}

/* Tab Navigation */
.tab-nav {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px 0;
  display: flex;
  gap: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
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
  color: #737478;
  cursor: pointer;
  transition: all 0.12s ease;
}

.tab-btn:hover {
  color: #a1a1aa;
  background: rgba(255, 255, 255, 0.04);
}

.tab-btn.active {
  color: #f4f4f5;
  background: rgba(255, 255, 255, 0.08);
}

.tab-btn svg {
  width: 17px;
  height: 17px;
}

/* Buttons */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  background: #f4f4f5;
  color: #1c1c1e;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.12s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.btn-primary:hover:not(:disabled) {
  background: #fff;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
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
  border: 2px solid #1c1c1e;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background: transparent;
  color: #f4f4f5;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.12s ease;
}

.btn-outline:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.25);
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
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  color: #6d6d70;
}

.empty-icon svg {
  width: 32px;
  height: 32px;
}

.empty-state h2 {
  font-size: 20px;
  font-weight: 600;
  color: #f4f4f5;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.empty-state p {
  font-size: 14px;
  color: #737478;
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
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
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
  color: #737478;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #f4f4f5;
  letter-spacing: -0.02em;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
}

/* View Toggle */
.view-toggle {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
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
  color: #9ca0a6;
  cursor: pointer;
  transition: all 0.12s ease;
}

.toggle-btn:hover {
  color: #c5c7c9;
}

.toggle-btn.active {
  background: #3a3a3c;
  color: #f4f4f5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
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
  color: #f4f4f5;
  letter-spacing: -0.01em;
}

.category-count {
  font-size: 12px;
  color: #737478;
  font-weight: 500;
}

/* Projects Grid */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.project-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 16px;
  transition: all 0.12s ease;
  cursor: default;
}

.project-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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
  color: #f4f4f5;
  letter-spacing: -0.01em;
  word-break: break-all;
}

.git-icon {
  width: 14px;
  height: 14px;
  color: #737478;
  flex-shrink: 0;
}

.project-path {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: #6d6d70;
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
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  color: #9ca0a6;
}

.description {
  font-size: 11px;
  color: #737478;
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
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  transition: all 0.12s ease;
  opacity: 0.45;
}

.tool-card.installed {
  opacity: 1;
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.1);
}

.tool-card.installed:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
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
  color: #f4f4f5;
  margin-bottom: 2px;
  letter-spacing: -0.01em;
}

.tool-version {
  font-size: 11px;
  color: #737478;
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-status {
  font-size: 11px;
  color: #6d6d70;
  font-style: italic;
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
  color: #6d6d70;
  margin-bottom: 16px;
}

.no-projects p {
  font-size: 15px;
  font-weight: 500;
  color: #9ca0a6;
  margin-bottom: 4px;
}

.no-projects span {
  font-size: 13px;
  color: #737478;
}

/* Scrollbar - Hidden */
:deep(*)::-webkit-scrollbar {
  width: 0;
  height: 0;
  background: transparent;
}
</style>
