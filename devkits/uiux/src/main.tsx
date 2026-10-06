import { createRoot } from "react-dom/client";
import { DESIGN_SYSTEM_NAME } from "@cxsun/ui/design-system";
import "@cxsun/ui/styles.css";
import { UiuxGallery } from "./uiux-gallery";

document.documentElement.setAttribute("data-design-system", DESIGN_SYSTEM_NAME);
document.documentElement.setAttribute("data-design-variant", "default");

createRoot(document.getElementById("root") as HTMLElement).render(<UiuxGallery />);
