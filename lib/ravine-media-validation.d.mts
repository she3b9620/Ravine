export type RavineMediaKind = "video" | "audio" | null;
export type RavineFileLike = { name: string; type?: string | null } | null | undefined;
export function classifyRavineMediaFile(file: RavineFileLike): RavineMediaKind;
export function isAllowedRavineMediaFile(file: RavineFileLike, allowAudio?: boolean): boolean;
