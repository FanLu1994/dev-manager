<script setup>
import { ref, onMounted } from 'vue'

const projects = ref([])
const selectedPath = ref('')
const isScanning = ref(false)

onMounted(async () => {
  try {
    const cached = await window.electronAPI.loadCache()
    if (cached && cached.length > 0) {
      projects.value = cached
    }
  } catch (error) {
    console.error('Failed to load cache:', error)
  }
})

const selectAndScan = async () => {
  try {
    const path = await window.electronAPI.selectDirectory()
    if (path) {
      selectedPath.value = path
      isScanning.value = true
      projects.value = []
      projects.value = await window.electronAPI.scanDirectory(path)
    }
  } catch (error) {
    console.error('Failed to scan:', error)
  } finally {
    isScanning.value = false
  }
}

const getTypeLabel = (type) => {
  const labels = {
    node: 'Node.js',
    python: 'Python',
    rust: 'Rust',
    go: 'Go',
    java: 'Java',
    maven: 'Maven',
    gradle: 'Gradle',
    php: 'PHP',
    git: 'Git',
    unknown: 'Project'
  }
  return labels[type] || 'Project'
}

const getTypeConfig = (type) => {
  const configs = {
    node: { icon: '⚡', color: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    python: { icon: '🐍', color: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    rust: { icon: '🦀', color: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
    go: { icon: '◈', color: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
    java: { icon: '☕', color: 'bg-red-500', light: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
    maven: { icon: '☕', color: 'bg-red-500', light: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
    gradle: { icon: '🐘', color: 'bg-lime-500', light: 'bg-lime-50', text: 'text-lime-600', border: 'border-lime-200' },
    php: { icon: '🐘', color: 'bg-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
    git: { icon: '⌥', color: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
    unknown: { icon: '◇', color: 'bg-gray-400', light: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
  }
  return configs[type] || configs.unknown
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
    <div class="max-w-6xl mx-auto px-4 py-6">
      <!-- Header -->
      <header class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dev Manager
          </h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your projects efficiently
          </p>
        </div>
        <button
          @click="selectAndScan"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold
                 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700
                 text-white rounded-lg
                 transition-all duration-150
                 hover:shadow-lg hover:shadow-indigo-500/25
                 hover:-translate-y-0.5
                 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          :disabled="isScanning"
        >
          <svg v-if="!isScanning" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span v-if="isScanning">Scanning...</span>
          <span v-else>Open Folder</span>
        </button>
      </header>

      <!-- Path Display -->
      <div v-if="selectedPath" class="mb-4 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <code class="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {{ selectedPath }}
        </code>
      </div>

      <!-- Projects Grid - Bento Style -->
      <div v-if="projects.length > 0" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <div
          v-for="project in projects"
          :key="project.path"
          class="group relative p-4
                 bg-white dark:bg-slate-800
                 border-2 rounded-xl
                 transition-all duration-200 cursor-pointer
                 hover:scale-[1.02] hover:shadow-lg
                 hover:-translate-y-1"
          :class="getTypeConfig(project.type).border"
        >
          <!-- Color Accent Bar -->
          <div class="absolute top-0 left-0 right-0 h-1 rounded-t-xl" :class="getTypeConfig(project.type).color"></div>

          <!-- Icon Badge -->
          <div class="flex items-start justify-between mb-2 mt-1">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center text-lg" :class="[getTypeConfig(project.type).light, getTypeConfig(project.type).text]">
              {{ getTypeConfig(project.type).icon }}
            </div>
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" :class="[getTypeConfig(project.type).light, getTypeConfig(project.type).text]">
              {{ project.type }}
            </span>
          </div>

          <!-- Project Name -->
          <h3 class="font-semibold text-sm text-slate-900 dark:text-white truncate mb-1" :title="project.name">
            {{ project.name }}
          </h3>

          <!-- Path -->
          <div class="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">
            {{ project.path.split('/').pop() || project.path }}
          </div>
        </div>
      </div>

      <!-- Empty States -->
      <div v-else-if="selectedPath && !isScanning" class="flex flex-col items-center justify-center py-16">
        <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400">No projects found</p>
      </div>

      <div v-else-if="!selectedPath" class="flex flex-col items-center justify-center py-16">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
          </svg>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-1">Select a folder to get started</p>
        <p class="text-xs text-slate-400 dark:text-slate-500">Supports Node.js, Python, Rust, Go, Java, PHP, Git</p>
      </div>
    </div>
  </div>
</template>
