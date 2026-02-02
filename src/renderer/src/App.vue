<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ProjectInfo, ScanResult } from '../../../preload'

const scanResult = ref<ScanResult | null>(null)
const loading = ref(false)
const currentView = ref('language')
const selectedFolder = ref<string | null>(null)

const groupedProjects = computed(() => {
  if (!scanResult.value) return {}
  return currentView.value === 'language'
    ? scanResult.value.byLanguage
    : scanResult.value.byType
})

const categories = computed(() => {
  return Object.keys(groupedProjects.value).sort()
})

const totalProjects = computed(() => {
  return scanResult.value?.projects.length || 0
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
</script>

<template>
  <div class="app-container">
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
            <span>Project Overview</span>
          </div>
        </div>
        <button class="btn-primary" @click="selectFolder" :disabled="loading">
          <span v-if="!loading" class="btn-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
            </svg>
          </span>
          <span v-else class="btn-spinner"></span>
          <span>{{ loading ? 'Scanning...' : 'Select Folder' }}</span>
        </button>
      </div>
    </header>

    <!-- Main -->
    <main class="app-main">
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
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:deep(*) {
  box-sizing: border-box;
}

.app-container {
  min-height: 100vh;
  background: #0a0a0b;
  font-family: 'Manrope', -apple-system, sans-serif;
  color: #e4e4e7;
}

/* Header */
.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(10, 10, 11, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.brand-icon svg {
  width: 22px;
  height: 22px;
}

.brand-text h1 {
  font-size: 17px;
  font-weight: 600;
  color: #fafafa;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.brand-text span {
  font-size: 12px;
  color: #71717a;
  font-weight: 500;
}

/* Buttons */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: #fafafa;
  color: #18181b;
  border: none;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary:hover:not(:disabled) {
  background: #f4f4f5;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary svg {
  width: 18px;
  height: 18px;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #18181b;
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
  padding: 12px 24px;
  background: transparent;
  color: #fafafa;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-outline:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
}

/* Main */
.app-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 200px);
  text-align: center;
}

.empty-icon {
  width: 72px;
  height: 72px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: #52525b;
}

.empty-icon svg {
  width: 36px;
  height: 36px;
}

.empty-state h2 {
  font-size: 24px;
  font-weight: 600;
  color: #fafafa;
  margin-bottom: 10px;
  letter-spacing: -0.02em;
}

.empty-state p {
  font-size: 15px;
  color: #71717a;
  max-width: 340px;
  margin-bottom: 28px;
  line-height: 1.6;
}

/* Results */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  margin-bottom: 32px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 12px;
  color: #71717a;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #fafafa;
  letter-spacing: -0.03em;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.08);
}

/* View Toggle */
.view-toggle {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 32px;
}

.toggle-btn {
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 500;
  color: #a1a1aa;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toggle-btn:hover {
  color: #d4d4d8;
}

.toggle-btn.active {
  background: #27272a;
  color: #fafafa;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Categories */
.categories {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.category-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.category-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #fafafa;
  letter-spacing: -0.01em;
}

.category-count {
  font-size: 13px;
  color: #71717a;
  font-weight: 500;
}

/* Projects Grid */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.project-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 18px;
  transition: all 0.15s ease;
  cursor: default;
}

.project-card:hover {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
}

.project-name {
  font-size: 15px;
  font-weight: 600;
  color: #fafafa;
  letter-spacing: -0.01em;
  word-break: break-all;
}

.git-icon {
  width: 16px;
  height: 16px;
  color: #71717a;
  flex-shrink: 0;
}

.project-path {
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  color: #52525b;
  margin-bottom: 14px;
  word-break: break-all;
  line-height: 1.5;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #d4d4d8;
}

.description {
  font-size: 12px;
  color: #71717a;
}

/* No Projects */
.no-projects {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.no-projects svg {
  width: 48px;
  height: 48px;
  color: #52525b;
  margin-bottom: 20px;
}

.no-projects p {
  font-size: 16px;
  font-weight: 500;
  color: #a1a1aa;
  margin-bottom: 6px;
}

.no-projects span {
  font-size: 14px;
  color: #71717a;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>
