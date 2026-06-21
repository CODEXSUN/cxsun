import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { defaultDesignSystemId, getCxDesignSystem, type CxDesignSystem, type CxDesignSystemId } from "./design-systems"

type CxDesignSystemContextValue = {
  designSystem: CxDesignSystem
  designSystemId: CxDesignSystemId
  setDesignSystemId(id: CxDesignSystemId): void
}

const CxDesignSystemContext = createContext<CxDesignSystemContextValue | null>(null)

export function CxDesignSystemProvider({
  children,
  defaultId = defaultDesignSystemId,
  storageKey = "cxsun-design-system",
}: {
  children: ReactNode
  defaultId?: CxDesignSystemId
  storageKey?: string
}) {
  const [designSystemId, setDesignSystemId] = useState<CxDesignSystemId>(() => {
    if (typeof localStorage === "undefined") return defaultId
    return getCxDesignSystem(localStorage.getItem(storageKey) || defaultId).id
  })

  useEffect(() => {
    localStorage.setItem(storageKey, designSystemId)
    document.documentElement.dataset.cxDesign = designSystemId
  }, [designSystemId, storageKey])

  const value = useMemo<CxDesignSystemContextValue>(() => ({
    designSystem: getCxDesignSystem(designSystemId),
    designSystemId,
    setDesignSystemId,
  }), [designSystemId])

  return <CxDesignSystemContext.Provider value={value}>{children}</CxDesignSystemContext.Provider>
}

export function useCxDesignSystem() {
  const context = useContext(CxDesignSystemContext)
  if (!context) throw new Error("useCxDesignSystem must be used inside CxDesignSystemProvider.")
  return context
}
