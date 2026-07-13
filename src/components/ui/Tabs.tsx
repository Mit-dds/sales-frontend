import type { ReactNode } from 'react'

export interface Tab {
  id: string
  label: string
  content: ReactNode
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  color?: string
}

export function Tabs({ tabs, activeTab, onChange, color = '#B8860B' }: TabsProps) {
  return (
    <div>
      <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 mb-6">
        {tabs.map(tab => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                flex-1 text-center px-1 py-2.5 rounded-md cursor-pointer
                text-xs transition-all
                ${isActive
                  ? 'shadow-[0_2px_6px_rgba(0,0,0,0.08)]'
                  : 'text-navy-light hover:text-navy'
                }
              `}
              style={isActive ? {
                color,
                borderBottom: `2px solid ${color}`,
                backgroundColor: `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},0.12)`,
              } : undefined}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div>
        {tabs.find(t => t.id === activeTab)?.content}
      </div>
    </div>
  )
}
