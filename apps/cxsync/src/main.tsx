import { createRoot } from "react-dom/client"
import "@cxsun/ui/styles/dashboard-shell.css"
import { App } from "./app"
import "./styles.css"
import "./sync.css"

createRoot(document.getElementById("root")!).render(<App />)
