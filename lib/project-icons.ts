import {
  BeakerIcon,
  BookOpenIcon,
  BotIcon,
  BriefcaseIcon,
  CameraIcon,
  CodeIcon,
  FileTextIcon,
  FolderIcon,
  GlobeIcon,
  GraduationCapIcon,
  HeartIcon,
  ImageIcon,
  LightbulbIcon,
  MusicIcon,
  PaletteIcon,
  RocketIcon,
  ScaleIcon,
  SparklesIcon,
  StethoscopeIcon,
  TerminalIcon,
  type LucideIcon,
} from "lucide-react";

export type ProjectIconId =
  | "folder"
  | "file"
  | "briefcase"
  | "scale"
  | "sparkles"
  | "code"
  | "book"
  | "grad"
  | "heart"
  | "bulb"
  | "rocket"
  | "globe"
  | "bot"
  | "palette"
  | "music"
  | "camera"
  | "beaker"
  | "stethoscope"
  | "terminal"
  | "image";

/** Shared neutral chrome for every project glyph (picker, cards, chips). */
export const PROJECT_ICON_CHROME = "bg-white/5 text-zinc-400";

export const PROJECT_ICONS: {
  id: ProjectIconId;
  Icon: LucideIcon;
  className: string;
}[] = [
  { id: "folder", Icon: FolderIcon, className: PROJECT_ICON_CHROME },
  { id: "file", Icon: FileTextIcon, className: PROJECT_ICON_CHROME },
  { id: "briefcase", Icon: BriefcaseIcon, className: PROJECT_ICON_CHROME },
  { id: "scale", Icon: ScaleIcon, className: PROJECT_ICON_CHROME },
  { id: "sparkles", Icon: SparklesIcon, className: PROJECT_ICON_CHROME },
  { id: "code", Icon: CodeIcon, className: PROJECT_ICON_CHROME },
  { id: "book", Icon: BookOpenIcon, className: PROJECT_ICON_CHROME },
  { id: "grad", Icon: GraduationCapIcon, className: PROJECT_ICON_CHROME },
  { id: "heart", Icon: HeartIcon, className: PROJECT_ICON_CHROME },
  { id: "bulb", Icon: LightbulbIcon, className: PROJECT_ICON_CHROME },
  { id: "rocket", Icon: RocketIcon, className: PROJECT_ICON_CHROME },
  { id: "globe", Icon: GlobeIcon, className: PROJECT_ICON_CHROME },
  { id: "bot", Icon: BotIcon, className: PROJECT_ICON_CHROME },
  { id: "palette", Icon: PaletteIcon, className: PROJECT_ICON_CHROME },
  { id: "music", Icon: MusicIcon, className: PROJECT_ICON_CHROME },
  { id: "camera", Icon: CameraIcon, className: PROJECT_ICON_CHROME },
  { id: "beaker", Icon: BeakerIcon, className: PROJECT_ICON_CHROME },
  { id: "stethoscope", Icon: StethoscopeIcon, className: PROJECT_ICON_CHROME },
  { id: "terminal", Icon: TerminalIcon, className: PROJECT_ICON_CHROME },
  { id: "image", Icon: ImageIcon, className: PROJECT_ICON_CHROME },
];

export const DEFAULT_PROJECT_ICON: ProjectIconId = "folder";

export function getProjectIcon(id?: string | null) {
  return (
    PROJECT_ICONS.find((item) => item.id === id) ??
    PROJECT_ICONS.find((item) => item.id === DEFAULT_PROJECT_ICON)!
  );
}
