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

export const PROJECT_ICONS: {
  id: ProjectIconId;
  Icon: LucideIcon;
  className: string;
}[] = [
  { id: "folder", Icon: FolderIcon, className: "bg-sky-500/15 text-sky-300" },
  { id: "file", Icon: FileTextIcon, className: "bg-zinc-500/15 text-zinc-300" },
  { id: "briefcase", Icon: BriefcaseIcon, className: "bg-amber-500/15 text-amber-300" },
  { id: "scale", Icon: ScaleIcon, className: "bg-violet-500/15 text-violet-300" },
  { id: "sparkles", Icon: SparklesIcon, className: "bg-fuchsia-500/15 text-fuchsia-300" },
  { id: "code", Icon: CodeIcon, className: "bg-cyan-500/15 text-cyan-300" },
  { id: "book", Icon: BookOpenIcon, className: "bg-orange-500/15 text-orange-300" },
  { id: "grad", Icon: GraduationCapIcon, className: "bg-purple-500/15 text-purple-300" },
  { id: "heart", Icon: HeartIcon, className: "bg-rose-500/15 text-rose-300" },
  { id: "bulb", Icon: LightbulbIcon, className: "bg-yellow-500/15 text-yellow-300" },
  { id: "rocket", Icon: RocketIcon, className: "bg-red-500/15 text-red-300" },
  { id: "globe", Icon: GlobeIcon, className: "bg-teal-500/15 text-teal-300" },
  { id: "bot", Icon: BotIcon, className: "bg-blue-500/15 text-blue-300" },
  { id: "palette", Icon: PaletteIcon, className: "bg-pink-500/15 text-pink-300" },
  { id: "music", Icon: MusicIcon, className: "bg-emerald-500/15 text-emerald-300" },
  { id: "camera", Icon: CameraIcon, className: "bg-slate-400/15 text-slate-300" },
  { id: "beaker", Icon: BeakerIcon, className: "bg-lime-500/15 text-lime-300" },
  { id: "stethoscope", Icon: StethoscopeIcon, className: "bg-sky-500/15 text-sky-200" },
  { id: "terminal", Icon: TerminalIcon, className: "bg-zinc-400/15 text-zinc-200" },
  { id: "image", Icon: ImageIcon, className: "bg-orange-500/15 text-orange-200" },
];

export const DEFAULT_PROJECT_ICON: ProjectIconId = "folder";

export function getProjectIcon(id?: string | null) {
  return (
    PROJECT_ICONS.find((item) => item.id === id) ??
    PROJECT_ICONS.find((item) => item.id === DEFAULT_PROJECT_ICON)!
  );
}
