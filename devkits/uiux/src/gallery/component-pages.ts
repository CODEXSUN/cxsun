export const componentPages = [
  { id: "accordion", name: "Accordion" },
  { id: "alert", name: "Alert" },
  { id: "alert-dialog", name: "Alert Dialog" },
  { id: "aspect-ratio", name: "Aspect Ratio" },
  { id: "avatar", name: "Avatar" },
  { id: "badge", name: "Badge" },
  { id: "breadcrumb", name: "Breadcrumb" },
  { id: "button", name: "Button" },
  { id: "button-group", name: "Button Group" },
  { id: "calendar", name: "Calendar" },
  { id: "card", name: "Card" },
  { id: "carousel", name: "Carousel" },
  { id: "chart", name: "Chart" },
  { id: "checkbox", name: "Checkbox" },
  { id: "collapsible", name: "Collapsible" },
  { id: "command", name: "Command" },
  { id: "context-menu", name: "Context Menu" },
  { id: "dialog", name: "Dialog" },
  { id: "drawer", name: "Drawer" },
  { id: "dropdown-menu", name: "Dropdown Menu" },
  { id: "empty", name: "Empty" },
  { id: "field", name: "Field" },
  { id: "global-loader", name: "Global Loader" },
  { id: "hover-card", name: "Hover Card" },
  { id: "input", name: "Input" },
  { id: "input-group", name: "Input Group" },
  { id: "input-otp", name: "Input OTP" },
  { id: "item", name: "Item" },
  { id: "kbd", name: "Kbd" },
  { id: "label", name: "Label" },
  { id: "menubar", name: "Menubar" },
  { id: "navigation-menu", name: "Navigation Menu" },
  { id: "pagination", name: "Pagination" },
  { id: "popover", name: "Popover" },
  { id: "progress", name: "Progress" },
  { id: "radio-group", name: "Radio Group" },
  { id: "resizable", name: "Resizable" },
  { id: "scroll-area", name: "Scroll Area" },
  { id: "select", name: "Select" },
  { id: "separator", name: "Separator" },
  { id: "sheet", name: "Sheet" },
  { id: "sidebar", name: "Sidebar" },
  { id: "skeleton", name: "Skeleton" },
  { id: "slider", name: "Slider" },
  { id: "sonner", name: "Sonner Toaster" },
  { id: "spinner", name: "Spinner" },
  { id: "status-badge", name: "Status Badge" },
  { id: "switch", name: "Switch" },
  { id: "table", name: "Table" },
  { id: "tabs", name: "Tabs" },
  { id: "textarea", name: "Textarea" },
  { id: "toast", name: "Toast" },
  { id: "toaster", name: "Toaster" },
  { id: "toggle", name: "Toggle" },
  { id: "toggle-group", name: "Toggle Group" },
  { id: "tooltip", name: "Tooltip" },
  { id: "tree", name: "Tree" },
  { id: "use-mobile", name: "Use Mobile" },
  { id: "use-toast", name: "Use Toast" }
] as const;

export type ComponentPageId = (typeof componentPages)[number]["id"];
export type ComponentPage = `components/${ComponentPageId}`;

export function componentPage(id: ComponentPageId): ComponentPage {
  return `components/${id}`;
}

export function componentFromPage(page: string) {
  return componentPages.find((entry) => componentPage(entry.id) === page);
}
