import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { CustomAgent } from "@/types/agents"

interface AppState {
  // Agent Management
  activeAgent: CustomAgent | null
  setActiveAgent: (agent: CustomAgent | null) => void
  
  // UI State
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  
  // Performance
  prefetchedData: Map<string, any>
  setPrefetchedData: (key: string, data: any) => void
  
  // Notifications
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: number
}

const AppContext = createContext<AppState | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  // Agent state
  const [activeAgent, setActiveAgentState] = useState<CustomAgent | null>(null)
  
  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  
  // Performance optimization - prefetched data cache
  const [prefetchedData, setPrefetchedDataState] = useState<Map<string, any>>(new Map())
  
  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Optimized setters with useCallback
  const setActiveAgent = useCallback((agent: CustomAgent | null) => {
    setActiveAgentState(agent)
    // Persist to localStorage
    if (agent) {
      localStorage.setItem('activeAgent', JSON.stringify(agent))
    } else {
      localStorage.removeItem('activeAgent')
    }
  }, [])

  const setPrefetchedData = useCallback((key: string, data: any) => {
    setPrefetchedDataState(prev => {
      const newMap = new Map(prev)
      newMap.set(key, data)
      return newMap
    })
  }, [])

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random(),
      timestamp: Date.now()
    }
    setNotifications(prev => [...prev, newNotification])
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(newNotification.id)
    }, 5000)
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const value: AppState = {
    activeAgent,
    setActiveAgent,
    sidebarCollapsed,
    setSidebarCollapsed,
    commandPaletteOpen,
    setCommandPaletteOpen,
    prefetchedData,
    setPrefetchedData,
    notifications,
    addNotification,
    removeNotification,
    clearNotifications
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}

// Specialized hooks for performance
export function useActiveAgent() {
  const { activeAgent, setActiveAgent } = useApp()
  return { activeAgent, setActiveAgent }
}

export function useNotifications() {
  const { notifications, addNotification, removeNotification, clearNotifications } = useApp()
  return { notifications, addNotification, removeNotification, clearNotifications }
}

export function usePrefetchedData(key: string) {
  const { prefetchedData, setPrefetchedData } = useApp()
  return {
    data: prefetchedData.get(key),
    setData: (data: any) => setPrefetchedData(key, data)
  }
}
