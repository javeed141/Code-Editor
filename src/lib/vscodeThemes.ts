export type ThemeId =
  | "dark2026"
  | "light2026"
  | "darkPlus"
  | "darkModern"
  | "lightPlus"
  | "lightModern"
  | "vsDark"
  | "vsLight"
  | "hcBlack"
  | "hcLight";

type ThemeDefinition = {
  label: string;
  isDark: boolean;
  monacoBase: "vs" | "vs-dark" | "hc-black" | "hc-light";
  workspace: Record<string, string>;
};

const darkWorkspace = {
  "--background": "#1E1E1E", "--foreground": "#D4D4D4", "--editor-bg": "#1E1E1E",
  "--sidebar-bg": "#252526", "--titlebar-bg": "#3C3C3C", "--tabbar-bg": "#303031",
  "--tab-active-bg": "#1E1E1E", "--tab-inactive-bg": "#303031", "--tab-active-fg": "#FFFFFF",
  "--tab-inactive-fg": "#A6A6A6", "--statusbar-bg": "#007ACC", "--statusbar-fg": "#FFFFFF",
  "--border-color": "#3C3C3C", "--border-subtle": "#454545", "--input-bg": "#3C3C3C",
  "--input-border": "#3C3C3C", "--input-fg": "#CCCCCC", "--list-hover": "#2A2D2E",
  "--list-active": "#094771", "--list-active-fg": "#FFFFFF", "--text-muted": "#A6A6A6",
  "--accent-color": "#007ACC", "--accent-hover": "#1476B8", "--scrollbar-thumb": "#797979",
  "--scrollbar-track": "#1E1E1E", "--card-bg": "#252526", "--card-header-bg": "#1E1E1E",
  "--success": "#2EA043", "--warning": "#E2C08D", "--danger": "#F85149", "--selection": "#264F78",
};

const lightWorkspace = {
  "--background": "#FFFFFF", "--foreground": "#000000", "--editor-bg": "#FFFFFF",
  "--sidebar-bg": "#F3F3F3", "--titlebar-bg": "#F3F3F3", "--tabbar-bg": "#E8E8E8",
  "--tab-active-bg": "#FFFFFF", "--tab-inactive-bg": "#E8E8E8", "--tab-active-fg": "#000000",
  "--tab-inactive-fg": "#616161", "--statusbar-bg": "#007ACC", "--statusbar-fg": "#FFFFFF",
  "--border-color": "#E5E5E5", "--border-subtle": "#CECECE", "--input-bg": "#FFFFFF",
  "--input-border": "#CECECE", "--input-fg": "#000000", "--list-hover": "#E8E8E8",
  "--list-active": "#E8E8E8", "--list-active-fg": "#000000", "--text-muted": "#616161",
  "--accent-color": "#007ACC", "--accent-hover": "#1476B8", "--scrollbar-thumb": "#6E6E6E",
  "--scrollbar-track": "#F3F3F3", "--card-bg": "#FFFFFF", "--card-header-bg": "#F3F3F3",
  "--success": "#2EA043", "--warning": "#895503", "--danger": "#F85149", "--selection": "#ADD6FF80",
};

export const vscodeThemes: Record<ThemeId, ThemeDefinition> = {
  dark2026: { label: "Dark 2026", isDark: true, monacoBase: "vs-dark", workspace: { ...darkWorkspace, "--background": "#121314", "--foreground": "#BBBEBF", "--editor-bg": "#121314", "--sidebar-bg": "#191A1B", "--titlebar-bg": "#191A1B", "--tabbar-bg": "#202122", "--tab-active-bg": "#121314", "--tab-inactive-bg": "#202122", "--tab-active-fg": "#BFBFBF", "--tab-inactive-fg": "#8C8C8C", "--statusbar-bg": "#191A1B", "--statusbar-fg": "#8C8C8C", "--border-color": "#2A2B2C", "--input-bg": "#191A1B", "--input-border": "#333536", "--input-fg": "#BFBFBF", "--list-hover": "#FFFFFF14", "--list-active": "#FFFFFF22", "--list-active-fg": "#EDEDED", "--text-muted": "#8C8C8C", "--accent-color": "#3994BC", "--accent-hover": "#2B7DA3", "--card-bg": "#202122", "--card-header-bg": "#191A1B", "--selection": "#276782DD", "--success": "#72C892", "--warning": "#E5BA7D", "--danger": "#F48771" } },
  light2026: { label: "Light 2026", isDark: false, monacoBase: "vs", workspace: { ...lightWorkspace, "--background": "#FFFFFF", "--foreground": "#202020", "--sidebar-bg": "#FAFAFD", "--titlebar-bg": "#FAFAFD", "--tabbar-bg": "#EAEAEA", "--tab-inactive-bg": "#EAEAEA", "--tab-active-fg": "#202020", "--tab-inactive-fg": "#606060", "--statusbar-bg": "#FAFAFD", "--statusbar-fg": "#606060", "--border-color": "#F0F1F2", "--input-border": "#D8D8D866", "--input-fg": "#202020", "--list-hover": "#00000014", "--list-active": "#00000025", "--list-active-fg": "#202020", "--text-muted": "#606060", "--accent-color": "#0069CC", "--accent-hover": "#0063C1", "--card-bg": "#FAFAFD", "--card-header-bg": "#FAFAFD", "--selection": "#0069CC40", "--success": "#587C0C", "--danger": "#AD0707" } },
  darkPlus: { label: "Dark+", isDark: true, monacoBase: "vs-dark", workspace: darkWorkspace },
  darkModern: { label: "Dark Modern", isDark: true, monacoBase: "vs-dark", workspace: { ...darkWorkspace, "--background": "#1F1F1F", "--foreground": "#CCCCCC", "--editor-bg": "#1F1F1F", "--sidebar-bg": "#181818", "--titlebar-bg": "#181818", "--tabbar-bg": "#2B2B2B", "--tab-active-bg": "#1F1F1F", "--tab-inactive-bg": "#2B2B2B", "--tab-inactive-fg": "#9D9D9D", "--statusbar-bg": "#181818", "--statusbar-fg": "#CCCCCC", "--border-color": "#2B2B2B", "--input-bg": "#313131", "--input-fg": "#CCCCCC", "--text-muted": "#9D9D9D", "--accent-color": "#0078D4", "--accent-hover": "#026EC1", "--card-bg": "#1F1F1F", "--card-header-bg": "#181818", "--selection": "#2489DB82" } },
  lightPlus: { label: "Light+", isDark: false, monacoBase: "vs", workspace: lightWorkspace },
  lightModern: { label: "Light Modern", isDark: false, monacoBase: "vs", workspace: { ...lightWorkspace, "--background": "#F8F8F8", "--foreground": "#3B3B3B", "--sidebar-bg": "#F8F8F8", "--titlebar-bg": "#F8F8F8", "--tabbar-bg": "#E5E5E5", "--tab-inactive-bg": "#E5E5E5", "--tab-active-fg": "#3B3B3B", "--statusbar-bg": "#F8F8F8", "--statusbar-fg": "#3B3B3B", "--border-color": "#E5E5E5", "--input-fg": "#3B3B3B", "--list-hover": "#F2F2F2", "--list-active": "#E8E8E8", "--accent-color": "#005FB8", "--accent-hover": "#0258A8", "--scrollbar-track": "#F8F8F8", "--card-header-bg": "#F8F8F8" } },
  vsDark: { label: "Visual Studio Dark", isDark: true, monacoBase: "vs-dark", workspace: darkWorkspace },
  vsLight: { label: "Visual Studio Light", isDark: false, monacoBase: "vs", workspace: lightWorkspace },
  hcBlack: { label: "Default High Contrast", isDark: true, monacoBase: "hc-black", workspace: { ...darkWorkspace, "--background": "#000000", "--foreground": "#FFFFFF", "--editor-bg": "#000000", "--sidebar-bg": "#000000", "--titlebar-bg": "#000000", "--tabbar-bg": "#000000", "--tab-active-bg": "#000000", "--tab-inactive-bg": "#000000", "--tab-active-fg": "#FFFFFF", "--tab-inactive-fg": "#FFFFFF", "--statusbar-bg": "#000000", "--statusbar-fg": "#FFFFFF", "--border-color": "#FFFFFF", "--input-bg": "#000000", "--input-border": "#FFFFFF", "--input-fg": "#FFFFFF", "--list-hover": "#1A1A1A", "--list-active": "#FFFFFF", "--list-active-fg": "#000000", "--text-muted": "#FFFFFF", "--accent-color": "#007FD4", "--accent-hover": "#1AEBFF", "--card-bg": "#000000", "--card-header-bg": "#000000", "--selection": "#FFFFFF", "--success": "#14CE14", "--warning": "#F48700", "--danger": "#FF0000" } },
  hcLight: { label: "Default High Contrast Light", isDark: false, monacoBase: "hc-light", workspace: { ...lightWorkspace, "--background": "#FFFFFF", "--foreground": "#292929", "--editor-bg": "#FFFFFF", "--sidebar-bg": "#FFFFFF", "--titlebar-bg": "#FFFFFF", "--tabbar-bg": "#FFFFFF", "--tab-active-bg": "#FFFFFF", "--tab-inactive-bg": "#FFFFFF", "--tab-active-fg": "#292929", "--tab-inactive-fg": "#292929", "--statusbar-bg": "#FFFFFF", "--statusbar-fg": "#292929", "--border-color": "#292929", "--input-bg": "#FFFFFF", "--input-border": "#292929", "--input-fg": "#292929", "--list-hover": "#E8E8E8", "--list-active": "#292929", "--list-active-fg": "#FFFFFF", "--text-muted": "#292929", "--accent-color": "#0066BF", "--accent-hover": "#005A9E", "--card-bg": "#FFFFFF", "--card-header-bg": "#FFFFFF", "--selection": "#0066BF40", "--success": "#008000", "--warning": "#895503", "--danger": "#BE1100" } },
};

export const themeIds = Object.keys(vscodeThemes) as ThemeId[];

export function isThemeId(value: string): value is ThemeId {
  return value in vscodeThemes;
}
